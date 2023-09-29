import { getChartOptions } from './options';
import { LibName, d3 } from './constants';
import { isEdge, createRandomString, getNumber } from './utils/core';
import {
  D3Node,
  ExportImgOptions,
  FitOptions,
  FlextreeD3Node,
  OrgChartConnection,
  OrgChartDataItem,
  OrgChartOptions,
} from './types';
import { BaseType, Selection } from 'd3-selection';
import { D3ZoomEvent, ZoomBehavior, ZoomedElementBaseType, ZoomTransform } from 'd3-zoom';
import { FlextreeLayout } from 'd3-flextree';
import { D3DragEvent, DraggedElementBaseType } from 'd3-drag';
import merge from 'lodash.merge';
import {
  calculateCompactFlexDimensions,
  calculateCompactFlexPositions,
  nodeHeight,
  nodeWidth,
  setCompactDefaultOptions,
} from './utils/compact';
import {
  collapseCompact,
  expandCompact,
  toggleLevel,
  expandNodesWithExpandedFlag,
  getNodeChildren,
  setExpandedFlag,
  collapseInitiallyExpanded,
} from './utils/children';
import { downloadImage, toDataURL } from './utils/image';
import { renderOrUpdateNodes, restyleAllForeignObjectElements } from './render/nodes';
import { renderOrUpdateLinks } from './render/links';
import { renderOrUpdateConnections } from './render/connections';

export class OrgChart<TData extends OrgChartDataItem = OrgChartDataItem> {
  private id = `${LibName}_${createRandomString()}`;
  private firstDraw = true;
  private lastTransform: ZoomTransform = new ZoomTransform(1, 0, 0);
  private zoomBehavior?: ZoomBehavior<SVGElement, string>;
  private flexTreeLayout?: FlextreeLayout<TData>;
  private allNodes: D3Node<TData>[] = [];
  private root?: D3Node<TData>;
  private draggedNodesWrapper?: Selection<SVGGraphicsElement, string, any, any>;
  private nodesWrapper?: Selection<SVGGraphicsElement, string, any, any>;
  private svg?: Selection<SVGElement, string, any, any>;
  private centerG?: Selection<SVGGraphicsElement, string, any, any>;
  private linksWrapper?: Selection<SVGGraphicsElement, string, any, any>;
  private connectionsWrapper?: Selection<SVGGraphicsElement, string, any, any>;
  private defsWrapper?: Selection<SVGGraphicsElement, string, any, any>;
  private chart?: Selection<SVGGraphicsElement, string, any, any>;
  private options: OrgChartOptions<TData>;
  private dragData: {
    sourceNode?: D3DragEvent<DraggedElementBaseType, D3Node<TData>, D3Node<TData>>;
    targetNode?: D3Node<TData>;
    draggingElClone?: Selection<Element, D3Node<TData>, null, undefined>;
  } = {};

  constructor(options: Partial<OrgChartOptions<TData>> = {}) {
    this.options = merge({}, getChartOptions(), options);
  }

  getOptions() {
    return this.options;
  }

  setOptions(options?: Partial<OrgChartOptions<TData>>) {
    this.options = merge(this.options, options || {});
    return this;
  }

  render() {
    //InnerFunctions which will update visuals
    const attrs = this.getOptions();
    if (!attrs.data || attrs.data.length === 0) {
      return;
    }

    //Drawing containers
    const container = d3.select<HTMLElement, string>(attrs.container);

    const containerRect = container.node()!.getBoundingClientRect();
    if (containerRect.width > 0) {
      attrs.svgWidth = containerRect.width;
    }

    //Calculated properties
    const _calc = {
      chartWidth: attrs.svgWidth,
      chartHeight: attrs.svgHeight,
      centerX: attrs.svgWidth / 2,
      centerY: attrs.svgHeight / 2,
    };

    //****************** ROOT node work ************************

    this.flexTreeLayout = d3
      .flextree<TData>({
        nodeSize: (node) => {
          const width = nodeWidth(node as D3Node<TData>, attrs);
          const height = nodeHeight(node as D3Node<TData>, attrs);
          const siblingsMargin = attrs.siblingsMargin(node as D3Node<TData>);
          const childrenMargin = attrs.childrenMargin(node as D3Node<TData>);

          return attrs.layoutBindings[attrs.layout].nodeFlexSize({
            state: attrs,
            node: node as D3Node<TData>,
            width,
            height,
            siblingsMargin,
            childrenMargin,
          });
        },
      })
      .spacing((nodeA, nodeB) =>
        nodeA.parent == nodeB.parent ? 0 : attrs.neighbourMargin(nodeA as D3Node<TData>, nodeB as D3Node<TData>),
      );

    this.setLayouts(true);

    // *************************  DRAWING **************************
    //Add svg
    const svg = container
      .patternify<SVGElement>({
        tag: 'svg',
        selector: 'svg-chart-container',
      })
      .attr('width', attrs.svgWidth)
      .attr('height', attrs.svgHeight)
      .attr('font-family', attrs.defaultFont);

    if (this.firstDraw) {
      this.zoomBehavior = d3
        .zoom<SVGElement, string>()
        .on('start', (event) => attrs.onZoomStart(event))
        .on('end', (event) => attrs.onZoomEnd(event))
        .on('zoom', (event, d) => {
          attrs.onZoom(event, d);
          this.zoomed(event);
        })
        .scaleExtent(attrs.scaleExtent);

      const zoom = svg.call(this.zoomBehavior).attr('cursor', 'move');
      if (!attrs.enableDoubleClickZoom) {
        zoom.on('dblclick.zoom', null);
      }
      if (!attrs.enableWheelZoom) {
        zoom.on('wheel.zoom', null);
      }
    }

    this.svg = svg;

    //Add container g element
    const chart = svg.patternify<SVGGraphicsElement>({
      tag: 'g',
      selector: 'chart',
    });
    this.chart = chart;

    // Add one more container g element, for better positioning controls
    this.centerG = chart.patternify<SVGGraphicsElement>({
      tag: 'g',
      selector: 'center-group',
    });

    this.linksWrapper = this.centerG.patternify({
      tag: 'g',
      selector: 'links-wrapper',
    });

    this.nodesWrapper = this.centerG.patternify({
      tag: 'g',
      selector: 'nodes-wrapper',
    });

    this.connectionsWrapper = this.centerG.patternify({
      tag: 'g',
      selector: 'connections-wrapper',
    });

    this.draggedNodesWrapper = this.centerG.patternify({
      tag: 'g',
      selector: 'dragged-nodes-wrapper',
    });

    this.defsWrapper = svg.patternify({
      tag: 'g',
      selector: 'defs-wrapper',
    });

    if (this.firstDraw) {
      this.centerG.attr('transform', () => {
        return attrs.layoutBindings[attrs.layout].centerTransform({
          centerX: _calc.centerX,
          centerY: _calc.centerY,
          scale: this.lastTransform.k,
          rootMargin: attrs.rootMargin,
          root: this.root,
          chartHeight: _calc.chartHeight,
          chartWidth: _calc.chartWidth,
        });
      });
    }

    // Display tree content
    this.update(this.root);

    d3.select(window).on(`resize.${this.id}`, () => {
      const containerRect = container?.node()?.getBoundingClientRect();
      this.svg!.attr('width', containerRect?.width ?? 0);
    });

    if (this.firstDraw) {
      this.firstDraw = false;

      svg.on('mousedown.drag', null);
    }

    return this;
  }

  update(node?: D3Node<TData>) {
    const attrs = this.getOptions();

    if (!node || !this.root || !this.flexTreeLayout) {
      return;
    }

    if (attrs.compact) {
      calculateCompactFlexDimensions(this.root, attrs);
    }

    //  Assigns the x and y position for the nodes
    const treeData = this.flexTreeLayout(this.root);

    // Reassigns the x and y position for the based on the compact layout
    if (attrs.compact) {
      calculateCompactFlexPositions(this.root, attrs);
    }

    const nodes = treeData.descendants() as FlextreeD3Node<TData>[];

    nodes.forEach(attrs.layoutBindings[attrs.layout].swap);

    // Get all links
    const links = nodes.slice(1);
    // render links
    const linksSelection = this.linksWrapper!.selectAll<SVGPathElement, FlextreeD3Node<TData>>('path.link').data(
      links,
      (d) => this.getNodeId(d.data),
    );
    renderOrUpdateLinks(attrs, linksSelection, node);

    this.createAndUpdateConnections(nodes, node);

    // render nodes
    const nodesSelection = this.nodesWrapper!.selectAll<SVGGraphicsElement, FlextreeD3Node<TData>>('g.node').data(
      nodes,
      ({ data }) => this.getNodeId(data),
    );
    renderOrUpdateNodes(
      attrs,
      this.root,
      node,
      nodesSelection,
      this.onNodeClick.bind(this),
      this.onButtonClick.bind(this),
      this.onCompactGroupCollapseButtonClick.bind(this),
    );

    // Store the old positions for transition.
    nodes.forEach((d) => {
      d.x0 = d.x;
      d.y0 = d.y;
    });

    // CHECK FOR CENTERING
    const centeredNode = this.allNodes.filter((d) => d.data._centered)[0];
    if (centeredNode) {
      let centeredNodes = [centeredNode];
      if (centeredNode.data._centeredWithDescendants) {
        if (attrs.compact) {
          centeredNodes = centeredNode.descendants().filter((_, i) => i < 7);
        } else {
          centeredNodes = centeredNode.descendants().filter((_, i, arr) => {
            const h = Math.round(arr.length / 2);
            const spread = 2;
            if (arr.length % 2) {
              return i > h - spread && i < h + spread - 1;
            }

            return i > h - spread && i < h + spread;
          });
        }
      }
      centeredNode.data._centeredWithDescendants = undefined;
      centeredNode.data._centered = undefined;
      this.fit({
        animate: true,
        scale: false,
        nodes: centeredNodes,
      });
    }

    this.applyDraggable();
  }

  addNodes(nodesToAdd: TData[]) {
    const attrs = this.getOptions();

    const newIds = new Set<string>();
    nodesToAdd.forEach((entry) => newIds.add(this.getNodeId(entry)));

    const allNodesAreValid = nodesToAdd.every((nodeToAdd) => {
      const nodeId = this.getNodeId(nodeToAdd);
      const nodeFound = this.allNodes.filter(({ data }) => this.getNodeId(data) === nodeId)[0];
      const parentFound = this.allNodes.filter(
        ({ data }) => this.getNodeId(data) === this.getParentNodeId(nodeToAdd),
      )[0];
      if (nodeFound) {
        console.warn(`${LibName} addNodes: Node with id (${nodeId}) already exists in tree`);
        return false;
      }
      if (!parentFound && !newIds.has(this.getNodeId(nodeToAdd))) {
        console.warn(`${LibName} addNodes: Parent node with id (${nodeId}) not found in the tree`);
        return false;
      }

      return true;
    });

    if (!allNodesAreValid) {
      return this;
    }

    attrs.data?.push(...nodesToAdd);

    attrs.onDataChange(attrs.data || []);

    // Update state of nodes and redraw graph
    this.updateNodesState();

    return this;
  }

  addNode(node: TData) {
    return this.addNodes([node]);
  }

  removeNode(nodeId: string) {
    const attrs = this.getOptions();
    const node = this.allNodes.filter(({ data }) => this.getNodeId(data) == nodeId)[0];
    if (!node) {
      console.warn(`${LibName} removeNode: Node with id (${nodeId}) not found in the tree`);
      return this;
    }

    // Remove all node children
    // Retrieve all children nodes ids (including current node itself)
    const descendants = getNodeChildren(node);
    descendants.forEach((d) => (d._toDelete = true));

    // Filter out retrieved nodes and reassign data
    attrs.data = attrs.data!.filter((d) => !d._toDelete);

    attrs.onDataChange(attrs.data);

    // Update state of nodes and redraw graph
    this.updateNodesState();

    return this;
  }

  private createAndUpdateConnections(nodes: FlextreeD3Node<TData>[], node: D3Node<TData>) {
    const attrs = this.getOptions();

    const allNodesMap: Record<string, D3Node<TData>> = {};
    this.allNodes.forEach((d) => (allNodesMap[this.getNodeId(d.data)] = d));

    const visibleNodesMap: Record<string, D3Node<TData>> = {};
    nodes.forEach((d) => (visibleNodesMap[this.getNodeId(d.data)] = d));

    attrs.connections.forEach((connection) => {
      const source = allNodesMap[connection.from];
      const target = allNodesMap[connection.to];
      connection._source = source;
      connection._target = target;
    });
    const visibleConnections = attrs.connections.filter((d) => visibleNodesMap[d.from] && visibleNodesMap[d.to]);
    const defsString = attrs.defs.bind(this)(attrs, visibleConnections);
    const existingString = this.defsWrapper!.html();
    if (defsString !== existingString) {
      this.defsWrapper!.html(defsString);
    }

    const connectionsSelection = this.connectionsWrapper!.selectAll<SVGPathElement, OrgChartConnection>(
      'path.connection',
    ).data(visibleConnections);

    renderOrUpdateConnections(attrs, connectionsSelection, node);
  }

  getNodeFromState(id: string | undefined) {
    return this.allNodes.find((entry) => entry.id === id);
  }

  private onNodeClick(_: MouseEvent, d: D3Node<TData>) {
    const node = this.getNodeFromState(d.id);
    if (!node) {
      return;
    }

    const { data } = node;

    if (data._type === 'group-toggle' && node.parent) {
      expandCompact(node.parent);
      this.update(node.parent);
      return;
    }

    this.options.onNodeClick(data);
  }

  /**
   * Trigger onNodeButtonClick and/or toggle children
   */
  private onButtonClick(e: MouseEvent, d: D3Node<TData>) {
    const options = this.getOptions();

    const node = this.getNodeFromState(d.id);
    if (!node) {
      return;
    }

    options.onNodeButtonClick?.(e, node);

    if (e.defaultPrevented) {
      return;
    }

    if (options.setActiveNodeCentered) {
      node.data._centered = true;
      node.data._centeredWithDescendants = true;
    }

    toggleLevel(node);

    this.update(node);
  }

  private onCompactGroupCollapseButtonClick(e: MouseEvent, d: D3Node<TData>) {
    e.stopPropagation();

    const node = this.getNodeFromState(d.id);
    if (!node) {
      return;
    }

    collapseCompact(node);

    this.update(node);
  }

  /**
   * Zoom handler function
   */
  private zoomed(event: D3ZoomEvent<ZoomedElementBaseType, D3Node<TData>>) {
    // Get d3 event's transform object
    const transform = event.transform;

    // Store it
    this.lastTransform = transform;

    // Reposition and rescale chart accordingly
    // todo: check why it's throwing an error
    //@ts-ignore
    this.chart.attr('transform', transform);

    // Apply new styles to the foreign object element
    if (isEdge()) {
      restyleAllForeignObjectElements(this.getOptions(), this.svg!);
    }
  }

  getRootNode() {
    return this.root;
  }

  /**
   * This function updates nodes state and redraws graph, usually after data change
   */
  public updateNodesState() {
    this.setLayouts(false);

    // Redraw Graphs
    this.update(this.root);
  }

  private setLayouts(firstDraw: boolean) {
    const options = this.getOptions();
    // Store new root by converting flat data to hierarchy
    this.root = d3
      .stratify<TData>()
      .id((d) => this.getNodeId(d))
      .parentId((d) => this.getParentNodeId(d))(options.data || []) as D3Node<TData>;

    // Store positions, where children appear during their enter animation
    this.root.x0 = 0;
    this.root.y0 = 0;
    this.allNodes = this.root.descendants();

    // Store direct and total descendants count
    this.allNodes.forEach((d) => {
      Object.assign(d.data, {
        _directSubordinates: d.children?.length ?? 0,
        _totalSubordinates: d.descendants().length - 1,
      });
    });

    this.allNodes.forEach((node) => {
      const width = nodeWidth(node, options);
      const height = nodeHeight(node, options);
      setCompactDefaultOptions(node, options);
      Object.assign(node, { width, height });
    });

    this.root.eachAfter((node) => collapseInitiallyExpanded(node));

    if (firstDraw && options.expandLevel !== null) {
      this.expandToLevel(options.expandLevel);
      this.setOptions({ expandLevel: null });
    }
    expandNodesWithExpandedFlag(this.allNodes);
  }

  private zoomTreeBounds({
    x0,
    x1,
    y0,
    y1,
    params,
  }: {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    params: { scale: boolean; animate: boolean };
  }) {
    const { svgWidth: w, svgHeight: h, duration } = this.getOptions();
    let scaleVal = Math.min(8, 0.9 / Math.max((x1 - x0) / w, (y1 - y0) / h));
    let identity = d3.zoomIdentity.translate(w / 2, h / 2);
    identity = identity.scale(params.scale ? scaleVal : this.lastTransform.k);

    identity = identity.translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    // Transition zoom wrapper component into specified bounds
    this.svg!.transition()
      .duration(params.animate ? duration : 0)
      .call(this.zoomBehavior!.transform, identity);
    this.centerG!.transition()
      .duration(params.animate ? duration : 0)
      .attr('transform', 'translate(0,0)');
  }

  fit(options?: FitOptions<TData>) {
    const { animate = true, nodes, scale = true } = options || {};

    const attrs = this.getOptions();
    let descendants = nodes ? nodes : this.root?.descendants() || [];

    const minX = d3.min(descendants, (d) => d.x + attrs.layoutBindings[attrs.layout].nodeLeftX(d));
    const maxX = d3.max(descendants, (d) => d.x + attrs.layoutBindings[attrs.layout].nodeRightX(d));
    const minY = d3.min(descendants, (d) => d.y + attrs.layoutBindings[attrs.layout].nodeTopY(d));
    const maxY = d3.max(descendants, (d) => d.y + attrs.layoutBindings[attrs.layout].nodeBottomY(d));

    this.zoomTreeBounds({
      params: { animate: animate, scale },
      x0: getNumber(minX) - 50,
      x1: getNumber(maxX) + 50,
      y0: getNumber(minY) - 50,
      y1: getNumber(maxY) + 50,
    });
  }

  setCentered(nodeId: string) {
    const node = this.allNodes.filter((d) => this.getNodeId(d.data) === nodeId)[0];
    if (!node) {
      console.warn(`${LibName} setCentered: Node with id (${nodeId}) not found in the tree`);
      return this;
    }
    node.data._centered = true;
    setExpandedFlag(node.parent, true);

    return this;
  }

  setHighlighted(nodeId: string) {
    const node = this.allNodes.filter((d) => this.getNodeId(d.data) === nodeId)[0];
    if (!node) {
      console.warn(`${LibName} setHighlighted: Node with id (${nodeId}) not found in the tree`);
      return this;
    }
    node.data._highlighted = true;
    setExpandedFlag(node.parent, true);
    node.data._centered = true;

    return this;
  }

  setUpToTheRootHighlighted(nodeId: string) {
    const node = this.allNodes.filter((d) => this.getNodeId(d.data) === nodeId)[0];
    if (!node) {
      console.warn(`${LibName} setUpToTheRootHighlighted: Node with id (${nodeId}) not found in the tree`);
      return this;
    }
    node.data._upToTheRootHighlighted = true;
    node.ancestors().forEach((d) => {
      setExpandedFlag(d, true);
      d.data._upToTheRootHighlighted = true;
    });
    return this;
  }

  clearHighlighting() {
    this.allNodes.forEach((d) => {
      d.data._highlighted = false;
      d.data._upToTheRootHighlighted = false;
    });
    this.update(this.root);
  }

  /**
   * It can take selector which would go fullscreen
   */
  fullscreen(element?: Element) {
    const attrs = this.getOptions();
    const el = d3.select<BaseType, D3Node<TData>>(element || attrs.container).node() as HTMLElement;

    d3.select(document).on(`fullscreenchange.${this.id}`, () => {
      const fsElement = document.fullscreenElement;
      if (fsElement === el) {
        setTimeout(() => {
          this.svg!.attr('height', window.innerHeight - 40);
        }, 500);
      } else {
        this.svg!.attr('height', attrs.svgHeight);
      }
    });

    if (el.requestFullscreen) {
      el.requestFullscreen();
    }
  }

  /**
   * Zoom to specific scale
   */
  zoom(scale: number) {
    this.svg!.transition().call(this.zoomBehavior!.scaleTo, scale < 0 || typeof scale === 'undefined' ? 1 : scale);
  }

  zoomIn() {
    this.svg!.transition().call(this.zoomBehavior!.scaleBy, 1.3);
  }

  zoomOut() {
    this.svg!.transition().call(this.zoomBehavior!.scaleBy, 0.78);
  }

  exportImg(options?: ExportImgOptions) {
    const self = this;
    const { full = false, scale = 3, onLoad, save = true } = options || {};

    const { duration, imageName } = this.getOptions();
    let count = 0;
    const selection = this.svg!.selectAll<HTMLImageElement, any>('img');
    let total = selection.size();

    const exportImage = () => {
      if (full) {
        self.fit();
      }

      setTimeout(
        () => {
          downloadImage({
            node: self.svg!.node()!,
            scale,
            isSvg: false,
            onAlreadySerialized: () => {
              self.update(self.root);
            },
            imageName,
            onLoad: onLoad,
            save,
          });
        },
        full ? duration + 10 : 0,
      );
    };

    if (total > 0) {
      selection.each(function (this: HTMLImageElement) {
        toDataURL(this.src, (dataUrl) => {
          this.src = dataUrl;
          if (++count == total) {
            exportImage();
          }
        });
      });
    } else {
      exportImage();
    }
  }

  exportSvg() {
    const { imageName } = this.getOptions();
    downloadImage({ imageName: imageName, node: this.svg!.node()!, scale: 3, isSvg: true });
    return this;
  }

  /**
   * This function can be invoked via chart.setExpanded API, it expands or collapses particular node
   */
  setExpanded(id: string, expandedFlag: boolean = true) {
    // Retrieve node by node Id
    const node = this.allNodes.filter(({ data }) => this.getNodeId(data) === id)[0];

    if (!node) {
      console.warn(`${LibName} setExpanded: Node with id (${id}) not found in the tree`);
      return this;
    }
    setExpandedFlag(node, expandedFlag);

    return this;
  }

  expandAll() {
    this.allNodes.forEach((d) => setExpandedFlag(d, true));

    this.render();
  }

  collapseAll() {
    this.allNodes.forEach((d) => setExpandedFlag(d, false));

    this.render();
  }

  expandToLevel(depth: number) {
    this.allNodes.forEach((node) => {
      if (node.depth <= depth) {
        setExpandedFlag(node, true);
      } else {
        setExpandedFlag(node, false);
      }
    });

    return this;
  }

  get d3Instance() {
    return d3;
  }

  getData() {
    const attrs = this.getOptions();
    return attrs.data ? [...attrs.data] : null;
  }

  private applyDraggable() {
    const self = this;
    const attrs = this.getOptions();

    if (!attrs.dragNDrop) {
      return;
    }

    this.svg!.selectAll<DraggedElementBaseType, D3Node<TData>>('.node')
      .filter((d) => !!this.getParentNodeId(d.data) && attrs.isNodeDraggable(d.data))
      .call(
        d3
          .drag<DraggedElementBaseType, D3Node<TData>>()
          .filter((e) => !e.target.closest('.node-button-g') && !e.target.closest('.node-foreign-object'))
          .on('start', function (e: D3DragEvent<DraggedElementBaseType, D3Node<TData>, D3Node<TData>>) {
            const draggingElement = this as DraggedElementBaseType;
            self.dragStarted(draggingElement, e);
          })
          .on(
            'drag',
            function (e: D3DragEvent<DraggedElementBaseType, D3Node<TData>, D3Node<TData>>, d: D3Node<TData>) {
              const draggingElement = this as DraggedElementBaseType;
              self.dragged(draggingElement, e, d);
            },
          )
          .on('end', function (e: D3DragEvent<DraggedElementBaseType, D3Node<TData>, D3Node<TData>>) {
            const draggingElement = this as DraggedElementBaseType;
            self.dragEnded(draggingElement, e);
          }),
      );
  }

  private dragStarted(
    draggingEl: DraggedElementBaseType,
    event: D3DragEvent<DraggedElementBaseType, D3Node<TData>, D3Node<TData>>,
  ) {
    const orgChartInstance = this;

    event.sourceEvent.stopPropagation();

    const draggingNode = d3.select<DraggedElementBaseType, D3Node<TData>>(draggingEl).classed('dragging', true);
    const draggingElClone = draggingNode.clone(true);
    (draggingElClone.select('.node-compact').node() as HTMLElement).remove();
    this.draggedNodesWrapper!.node()!.appendChild(draggingElClone.node()!);
    draggingNode.selectAll('.node-foreign-object, .node-button-g, .node-rect').attr('opacity', 0);
    orgChartInstance.dragData = {
      draggingElClone: draggingElClone,
      sourceNode: event,
      targetNode: undefined,
    };
  }

  private dragged(
    _: DraggedElementBaseType,
    event: D3DragEvent<DraggedElementBaseType, D3Node<TData>, D3Node<TData>>,
    d: D3Node<TData>,
  ) {
    const orgChartInstance = this;
    const attrs = orgChartInstance.getOptions();

    const x = event.x - d.width / 2;

    this.dragData.draggingElClone?.attr('transform', `translate(${x},${event.y})`);
    this.dragData.targetNode = undefined;

    // check nodes overlapping
    const cP = { x0: event.x, y0: event.y, x1: event.x + d.width, y1: event.y + d.height };

    d3.selectAll<BaseType, D3Node<TData>>('g.node:not(.dragging)')
      .classed('drop-over', false)
      .filter((d) => {
        const sourceNode = this.dragData.sourceNode?.subject;
        const targetNode = d;

        if (!sourceNode) {
          return false;
        }

        // avoid dropping parent into child nodes
        let parentNode = targetNode.parent;
        while (parentNode) {
          if (targetNode.parent?.id === sourceNode.id) {
            return false;
          }
          parentNode = parentNode.parent;
        }

        if (!attrs.isNodeDroppable(sourceNode.data, targetNode.data)) {
          return false;
        }

        const cPInner = { x0: d.x, y0: d.y, x1: d.x + d.width, y1: d.y + d.height };
        if (cP.x1 > cPInner.x0 && cP.x0 < cPInner.x1 && cP.y1 > cPInner.y0 && cP.y0 < cPInner.y1) {
          this.dragData.targetNode = targetNode;
          return !!d;
        }

        return false;
      })
      .classed('drop-over', true);
  }

  private dragEnded(
    draggingEl: DraggedElementBaseType,
    event: D3DragEvent<DraggedElementBaseType, D3Node<TData>, D3Node<TData>>,
  ) {
    const orgChartInstance = this;
    const attrs = orgChartInstance.getOptions();
    const targetD3Node = d3.selectAll('g.node.drop-over');
    targetD3Node.classed('drop-over', false);

    const draggingNode = d3.select(draggingEl).classed('dragging', false);
    draggingNode.selectAll('.node-foreign-object, .node-button-g, .node-rect').attr('opacity', 1);

    const x = event.subject.x - event.subject.width / 2;
    draggingNode.attr('transform', `translate(${x},${event.subject.y})`);

    const { sourceNode, targetNode } = this.dragData;
    // clear current state
    this.dragData.draggingElClone?.remove();
    this.dragData = {};

    // process updates
    if (sourceNode && targetNode) {
      const sourceNodeData = sourceNode.subject.data;
      const targetNodeData = targetNode.data;

      const result = attrs.onNodeDrop(sourceNodeData, targetNodeData);

      if (result) {
        const sourceNodeInStore = attrs.data?.find((d) => this.getNodeId(d) === this.getNodeId(sourceNodeData));

        if (sourceNodeInStore) {
          this.setParentNodeId(sourceNodeInStore, this.getNodeId(targetNodeData));
          attrs.onDataChange(attrs.data!);

          this.nodesWrapper!.node()!.insertBefore(draggingEl, (targetD3Node.node() as HTMLElement)?.nextSibling);

          orgChartInstance.updateNodesState();
        }
      }
    }
  }

  private getNodeId(d: TData) {
    return d[this.options.nodeIdKey] as string;
  }

  private setNodeId(d: TData, newId: string) {
    // @ts-ignore
    d[this.options.nodeIdKey] = newId;
  }

  private getParentNodeId(d: TData) {
    return d[this.options.parentNodeIdKey] as string | undefined;
  }

  private setParentNodeId(d: TData, newId: string) {
    // @ts-ignore
    d[this.options.parentNodeIdKey] = newId;
  }
}
