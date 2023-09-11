import { getChartOptions } from './options';
import { LibName, d3 } from './constants';
import { downloadImage, isEdge, groupBy, toDataURL, createRandomString, getNumber } from './utils';
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
          const width = attrs.nodeWidth(node as D3Node<TData>);
          const height = attrs.nodeHeight(node as D3Node<TData>);
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

    this.setLayouts({ expandNodesFirst: false });

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

    nodesToAdd.forEach((nodeToAdd) => {
      if (nodeToAdd._centered && !nodeToAdd._expanded) {
        nodeToAdd._expanded = true;
      }
      attrs.data?.push(nodeToAdd);
    });

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
    node.descendants().forEach((d) => (d.data._filteredOut = true));

    const descendants = this.getNodeChildren(node, []);
    descendants.forEach((d) => (d._filtered = true));

    // Filter out retrieved nodes and reassign data
    attrs.data = attrs.data!.filter((d) => !d._filtered);

    attrs.onDataChange(attrs.data);

    const updateNodesState = this.updateNodesState.bind(this);
    // Update state of nodes and redraw graph
    updateNodesState();

    return this;
  }

  /**
   * This method retrieves passed node's children IDs (including node)
   */
  private getNodeChildren(node: D3Node<TData>, nodeStore: Array<TData>) {
    const { data, children, _children } = node;

    // Store current node ID
    nodeStore.push(data);

    // Loop over children and recursively store descendants id (expanded nodes)
    if (children) {
      children.forEach((d) => {
        this.getNodeChildren(d, nodeStore);
      });
    }

    // Loop over _children and recursively store descendants id (collapsed nodes)
    if (_children) {
      _children.forEach((d) => {
        this.getNodeChildren(d, nodeStore);
      });
    }

    // Return result
    return nodeStore;
  }

  update(node?: D3Node<TData>) {
    const attrs = this.getOptions();

    if (!node || !this.root || !this.flexTreeLayout) {
      return;
    }

    if (attrs.compact) {
      this.calculateCompactFlexDimensions(this.root);
    }

    //  Assigns the x and y position for the nodes
    const treeData = this.flexTreeLayout(this.root);

    // Reassigns the x and y position for the based on the compact layout
    if (attrs.compact) {
      this.calculateCompactFlexPositions(this.root);
    }

    const nodes = treeData.descendants() as FlextreeD3Node<TData>[];

    // Get all links
    const links = nodes.slice(1);
    nodes.forEach(attrs.layoutBindings[attrs.layout].swap);

    this.createAndUpdateLinks(links, node);
    this.createAndUpdateConnections(nodes, attrs.connections, node);
    this.createAndUpdateNodes(nodes, node);

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

  private calculateCompactFlexDimensions(root: D3Node<TData>) {
    const attrs = this.getOptions();
    root.eachBefore((node) => {
      node.firstCompact = undefined;
      node.compactEven = undefined;
      node.flexCompactDim = undefined;
      node.firstCompactNode = undefined;
    });
    root.eachBefore((node) => {
      if (node.children && node.children.length > 1) {
        const compactChildren = node.children.filter((d) => !d.children);

        if (compactChildren.length < 2) return;

        const maxColumnDimension = d3.max(
          compactChildren,
          attrs.layoutBindings[attrs.layout].compactDimension.sizeColumn,
        )!;

        const calculateCompactDimension = () => {
          compactChildren.forEach((child, i) => {
            if (!i) {
              child.firstCompact = true;
            }
            child.compactEven = !(i % 2);
            child.row = Math.floor(i / 2);
          });
          const columnSize = maxColumnDimension * 2;
          const rowsMapNew = groupBy(
            compactChildren,
            (d) => d.row!,
            (reducedGroup) =>
              d3.max(
                reducedGroup,
                (d) => attrs.layoutBindings[attrs.layout].compactDimension.sizeRow(d) + attrs.compactMarginBetween(d),
              ) ?? 0,
          );
          const rowSize = d3.sum(rowsMapNew.map((v) => v[1]));
          compactChildren.forEach((node) => {
            node.firstCompactNode = compactChildren[0];
            if (node.firstCompact) {
              node.flexCompactDim = [
                columnSize + attrs.compactMarginPair(node),
                rowSize - attrs.compactMarginBetween(node),
              ];
            } else {
              node.flexCompactDim = [0, 0];
            }
          });
          node.flexCompactDim = undefined;
        };

        const calculateCompactAsGroupDimension = () => {
          const columnSize = maxColumnDimension;
          const rowSize = d3.max(compactChildren, attrs.layoutBindings[attrs.layout].compactDimension.sizeRow) ?? 0;
          compactChildren[0].firstCompact = true;

          if (node.data._directSubordinates === node.data._totalSubordinates) {
            compactChildren.forEach((node, i) => {
              node.firstCompactNode = compactChildren[0];
              if (i === 0) {
                node.flexCompactDim = [columnSize, rowSize * compactChildren.length];
              } else {
                node.flexCompactDim = [0, 0];
              }
            });

            node.flexCompactDim = undefined;
          }
        };

        if (attrs.compactNoChildren) {
          calculateCompactAsGroupDimension();
        } else {
          calculateCompactDimension();
        }
      }
    });
  }

  private calculateCompactFlexPositions(root: D3Node<TData>) {
    const attrs = this.getOptions();
    root.eachBefore((node) => {
      if (node.children) {
        const compactChildren = node.children.filter((d) => d.flexCompactDim);
        const fch = compactChildren[0];
        if (!fch) {
          return;
        }

        const setCompactX = () => {
          compactChildren.forEach((child, i) => {
            if (i === 0) fch.x -= getNumber(fch.flexCompactDim?.[0]) / 2;
            if (i && (i % 2) - 1)
              child.x = fch.x + getNumber(fch.flexCompactDim?.[0]) * 0.25 - attrs.compactMarginPair(child) / 4;
            else if (i)
              child.x = fch.x + getNumber(fch.flexCompactDim?.[0]) * 0.75 + attrs.compactMarginPair(child) / 4;
          });
          const centerX = fch.x + getNumber(fch.flexCompactDim?.[0]) * 0.5;
          fch.x = fch.x + getNumber(fch.flexCompactDim?.[0]) * 0.25 - attrs.compactMarginPair(fch) / 4;
          const offsetX = node.x - centerX;
          if (Math.abs(offsetX) < 10) {
            compactChildren.forEach((d) => (d.x += offsetX));
          }
        };

        const setCompactY = () => {
          const rowsMapNew = groupBy(
            compactChildren,
            (d) => d.row!,
            (reducedGroup) =>
              d3.max(reducedGroup, (d) => attrs.layoutBindings[attrs.layout].compactDimension.sizeRow(d)) ?? 0,
          );
          const cumSum = d3.cumsum(rowsMapNew.map((d) => d[1] + attrs.compactMarginBetween()));
          compactChildren.forEach((node) => {
            if (node.row) {
              node.y = fch.y + cumSum[node.row - 1];
            } else {
              node.y = fch.y;
            }
          });
        };

        const setCompactAsGroupX = () => {
          const centerX = fch.x;
          compactChildren.forEach((d) => {
            d.x = centerX;
          });
        };

        const setCompactAsGroupY = () => {
          const cumSum = d3.cumsum(
            compactChildren.map(
              (d) => attrs.layoutBindings[attrs.layout].compactDimension.sizeRow(d) + attrs.compactMarginBetween(d),
            ),
          );

          const initialY = fch.y;
          compactChildren.forEach((node, i) => {
            node.y = initialY + (i === 0 ? 0 : cumSum[i - 1]);
          });
        };

        if (attrs.compactNoChildren) {
          if (node.data._directSubordinates === node.data._totalSubordinates) {
            setCompactAsGroupX();
            setCompactAsGroupY();
          }
        } else {
          setCompactX();
          setCompactY();
        }
      }
    });
  }

  private createAndUpdateLinks(links: FlextreeD3Node<TData>[], { x0, y0, x = 0, y = 0, width, height }: D3Node<TData>) {
    const attrs = this.getOptions();

    // Get links selection
    const linkSelection = this.linksWrapper!.selectAll<SVGPathElement, D3Node<TData>>('path.link').data(links, (d) =>
      this.getNodeId(d.data),
    );

    // Enter any new links at the parent's previous position.
    const linkEnter = linkSelection
      .enter()
      .insert('path', 'g')
      .attr('class', 'link')
      .attr('d', () => {
        const xo = attrs.layoutBindings[attrs.layout].linkJoinX({ x: x0, y: y0, width, height });
        const yo = attrs.layoutBindings[attrs.layout].linkJoinY({ x: x0, y: y0, width, height });
        const o = { x: xo, y: yo };
        return attrs.layoutBindings[attrs.layout].diagonal(o, o, o);
      });

    // Get links update selection
    const linkUpdate = linkEnter.merge(linkSelection);

    // Styling links
    linkUpdate.attr('fill', 'none');

    if (isEdge()) {
      linkUpdate.style('display', 'auto');
    } else {
      linkUpdate.attr('display', 'auto');
    }

    // Allow external modifications
    linkUpdate.each(attrs.linkUpdate);

    // Transition back to the parent element position
    linkUpdate
      .transition()
      .duration(attrs.duration)
      .attr('d', (d) => {
        const n =
          attrs.compact && d.flexCompactDim && !attrs.compactNoChildren
            ? {
                x: attrs.layoutBindings[attrs.layout].compactLinkMidX(d, attrs),
                y: attrs.layoutBindings[attrs.layout].compactLinkMidY(d, attrs),
              }
            : {
                x: attrs.layoutBindings[attrs.layout].linkX(d),
                y: attrs.layoutBindings[attrs.layout].linkY(d),
              };

        const p = {
          x: attrs.layoutBindings[attrs.layout].linkParentX(d),
          y: attrs.layoutBindings[attrs.layout].linkParentY(d),
        };

        const m =
          attrs.compact && d.flexCompactDim && !attrs.compactNoChildren
            ? {
                x: attrs.layoutBindings[attrs.layout].linkCompactXStart(d),
                y: attrs.layoutBindings[attrs.layout].linkCompactYStart(d),
              }
            : n;
        return attrs.layoutBindings[attrs.layout].diagonal(n, p, m, { sy: attrs.linkYOffset });
      });

    // Remove any  links which is exiting after animation
    linkSelection
      .exit()
      .transition()
      .duration(attrs.duration)
      .attr('d', () => {
        const xo = attrs.layoutBindings[attrs.layout].linkJoinX({ x, y, width, height });
        const yo = attrs.layoutBindings[attrs.layout].linkJoinY({ x, y, width, height });
        const o = { x: xo, y: yo };
        return attrs.layoutBindings[attrs.layout].diagonal(o, o, undefined, { sy: attrs.linkYOffset });
      })
      .remove();
  }

  private createAndUpdateConnections(
    nodes: FlextreeD3Node<TData>[],
    connections: OrgChartConnection[],
    { x0, y0, width, height }: D3Node<TData>,
  ) {
    const attrs = this.getOptions();

    const allNodesMap: Record<string, D3Node<TData>> = {};
    this.allNodes.forEach((d) => (allNodesMap[this.getNodeId(d.data)] = d));

    const visibleNodesMap: Record<string, D3Node<TData>> = {};
    nodes.forEach((d) => (visibleNodesMap[this.getNodeId(d.data)] = d));

    connections.forEach((connection) => {
      const source = allNodesMap[connection.from];
      const target = allNodesMap[connection.to];
      connection._source = source;
      connection._target = target;
    });
    const visibleConnections = connections.filter((d) => visibleNodesMap[d.from] && visibleNodesMap[d.to]);
    const defsString = attrs.defs.bind(this)(attrs, visibleConnections);
    const existingString = this.defsWrapper!.html();
    if (defsString !== existingString) {
      this.defsWrapper!.html(defsString);
    }

    const connectionsSel = this.connectionsWrapper!.selectAll<SVGPathElement, OrgChartConnection>(
      'path.connection',
    ).data(visibleConnections);

    // Enter any new connections at the parent's previous position.
    const connEnter = connectionsSel
      .enter()
      .insert('path', 'g')
      .attr('class', 'connection')
      .attr('d', () => {
        const xo = attrs.layoutBindings[attrs.layout].linkJoinX({ x: x0, y: y0, width, height });
        const yo = attrs.layoutBindings[attrs.layout].linkJoinY({ x: x0, y: y0, width, height });
        const o = { x: xo, y: yo };
        return attrs.layoutBindings[attrs.layout].diagonal(o, o, undefined, { sy: attrs.linkYOffset });
      });

    // Get connections update selection
    const connUpdate = connEnter.merge(connectionsSel);

    // Styling connections
    connUpdate.attr('fill', 'none');

    // Transition back to the parent element position
    connUpdate
      .transition()
      .duration(attrs.duration)
      .attr('d', (d) => {
        const xs = attrs.layoutBindings[attrs.layout].linkX({
          x: d._source.x,
          y: d._source.y,
          width: d._source.width,
          height: d._source.height,
        });
        const ys = attrs.layoutBindings[attrs.layout].linkY({
          x: d._source.x,
          y: d._source.y,
          width: d._source.width,
          height: d._source.height,
        });
        const xt = attrs.layoutBindings[attrs.layout].linkJoinX({
          x: d._target.x,
          y: d._target.y,
          width: d._target.width,
          height: d._target.height,
        });
        const yt = attrs.layoutBindings[attrs.layout].linkJoinY({
          x: d._target.x,
          y: d._target.y,
          width: d._target.width,
          height: d._target.height,
        });
        return attrs.linkGroupArc({ source: { x: xs, y: ys }, target: { x: xt, y: yt } });
      });

    // Allow external modifications
    connUpdate.each(attrs.connectionsUpdate);

    // Remove any  links which is exiting after animation
    connectionsSel.exit().attr('opacity', 1).transition().duration(attrs.duration).attr('opacity', 0).remove();
  }

  private createAndUpdateNodes(nodes: FlextreeD3Node<TData>[], { x0, y0, x = 0, y = 0, width, height }: D3Node<TData>) {
    const attrs = this.getOptions();

    // Get nodes selection
    const nodesSelection = this.nodesWrapper!.selectAll<SVGGraphicsElement, FlextreeD3Node<TData>>('g.node').data(
      nodes,
      ({ data }) => this.getNodeId(data),
    );

    // Enter any new nodes at the parent's previous position.
    const nodeEnter = nodesSelection
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: D3Node<TData>) => {
        if (d == this.root) {
          return `translate(${x0},${y0})`;
        }
        const xj = attrs.layoutBindings[attrs.layout].nodeJoinX({ x: x0, y: y0, width, height });
        const yj = attrs.layoutBindings[attrs.layout].nodeJoinY({ x: x0, y: y0, width, height });
        return `translate(${xj},${yj})`;
      })
      .attr('cursor', 'pointer')
      .on('click', (event: any, node: FlextreeD3Node<TData>) => {
        const { data } = node;
        if (event.target.classList.contains('node-button-foreign-object')) {
          return;
        }

        attrs.onNodeClick(data);
      });

    // Add Node rect for compactNoChildren mode
    const nodeCompactGroup = nodeEnter.patternify({
      tag: 'g',
      selector: 'node-compact-g',
      data: (d) => [d],
    });

    const nodeCompactGroupRect = nodeCompactGroup
      .patternify({
        tag: 'rect',
        selector: 'node-compact-rect',
        data: (d) => [d],
      })
      .attr('pointer-events', 'none')
      .attr('width', (d) => {
        return attrs.nodeWidth(d) + attrs.compactNoChildrenMargin * 2;
      })
      .attr('height', (d) => {
        const { data, children } = d;

        if (
          children &&
          children.length > 1 &&
          attrs.compactNoChildren &&
          data._directSubordinates === data._totalSubordinates
        ) {
          const compactAsGroupChildrenSize =
            d3.sum(
              children,
              (d) => attrs.layoutBindings[attrs.layout].compactDimension.sizeColumn(d) + attrs.compactMarginBetween(d),
            ) - attrs.compactMarginBetween(d);
          return compactAsGroupChildrenSize + attrs.compactNoChildrenMargin * 2;
        }

        return attrs.nodeHeight(d) + attrs.compactNoChildrenMargin * 2;
      });

    attrs.compactNoChildrenUpdate(nodeCompactGroupRect);

    // Add Node wrapper
    const nodeWrapperGroup = nodeEnter;

    // Add background rectangle for the nodes
    nodeWrapperGroup.patternify({
      tag: 'rect',
      selector: 'node-rect',
      data: (d) => [d],
    });

    // Add foreignObject element inside rectangle
    const fo = nodeWrapperGroup
      .patternify({
        tag: 'foreignObject',
        selector: 'node-foreign-object',
        data: (d) => [d],
      })
      .style('overflow', 'visible');

    // Add foreign object
    fo.patternify({
      tag: 'xhtml:div',
      selector: 'node-foreign-object-div',
      data: (d) => [d],
    });

    this.restyleForeignObjectElements();

    // Add Node button circle's group (expand-collapse button)
    const nodeButtonGroups = nodeWrapperGroup
      .patternify({
        tag: 'g',
        selector: 'node-button-g',
        data: (d) => [d],
      })
      .on('click', (event, d) => this.onButtonClick(event, d));

    nodeButtonGroups
      .patternify({
        tag: 'rect',
        selector: 'node-button-rect',
        data: (d) => [d],
      })
      .attr('opacity', 0)
      .attr('pointer-events', 'all')
      .attr('width', (d) => attrs.nodeButtonWidth(d))
      .attr('height', (d) => attrs.nodeButtonHeight(d))
      .attr('x', (d) => attrs.nodeButtonX(d))
      .attr('y', (d) => attrs.nodeButtonY(d));

    // Add expand collapse button content
    nodeButtonGroups
      .patternify({
        tag: 'foreignObject',
        selector: 'node-button-foreign-object',
        data: (d) => [d],
      })
      .attr('width', (d) => attrs.nodeButtonWidth(d))
      .attr('height', (d) => attrs.nodeButtonHeight(d))
      .attr('x', (d) => attrs.nodeButtonX(d))
      .attr('y', (d) => attrs.nodeButtonY(d))
      .style('overflow', 'visible')
      .patternify({
        tag: 'xhtml:div',
        selector: 'node-button-div',
        data: (d) => [d],
      })
      .style('pointer-events', 'none')
      .style('display', 'flex')
      .style('width', '100%')
      .style('height', '100%');

    // Node update styles
    const nodeUpdate = nodeEnter.merge(nodesSelection).style('font', '12px sans-serif');

    // Transition to the proper position for the node
    nodeUpdate
      .transition()
      .attr('opacity', 0)
      .duration(attrs.duration)
      .attr('transform', ({ x, y, width, height }) => {
        return attrs.layoutBindings[attrs.layout].nodeUpdateTransform({ x, y, width, height });
      })
      .attr('opacity', 1);

    // Style node rectangles
    nodeUpdate
      .select('.node-rect')
      .attr('width', ({ width }) => width)
      .attr('height', ({ height }) => height)
      .attr('x', () => 0)
      .attr('y', () => 0)
      .attr('cursor', 'pointer')
      .attr('rx', 3)
      .attr('fill', 'none');

    nodeUpdate
      .select('.node-button-g')
      .attr('transform', (d) => {
        const x = attrs.layoutBindings[attrs.layout].buttonX(d);
        const y = attrs.layoutBindings[attrs.layout].buttonY(d);
        return `translate(${x},${y})`;
      })
      .attr('display', (d) => (attrs.isNodeButtonVisible(d) ? null : 'none'));
    nodeUpdate
      .select('.node-compact-g')
      .attr('transform', (d) => {
        const { height } = d;
        // todo: set to correct based on the layout
        const x = -attrs.compactNoChildrenMargin;
        const y = height - attrs.compactNoChildrenMargin + attrs.childrenMargin(d);
        return `translate(${x},${y})`;
      })
      .attr('display', (d) => {
        const { children, data } = d;

        return children &&
          children.length > 1 &&
          attrs.compactNoChildren &&
          data._directSubordinates === data._totalSubordinates
          ? null
          : 'none';
      });

    nodeUpdate.select('.node-compact-rect').attr('height', (d) => {
      const { children, data } = d;

      if (
        children &&
        children.length > 1 &&
        attrs.compactNoChildren &&
        data._directSubordinates === data._totalSubordinates
      ) {
        const compactAsGroupChildrenSize =
          d3.sum(
            children,
            (d) => attrs.layoutBindings[attrs.layout].compactDimension.sizeRow(d) + attrs.compactMarginBetween(d),
          ) - attrs.compactMarginBetween(d);
        return compactAsGroupChildrenSize + attrs.compactNoChildrenMargin * 2;
      }

      return attrs.nodeHeight(d) + attrs.compactNoChildrenMargin * 2;
    });

    // Restyle node button circle
    nodeUpdate.select('.node-button-foreign-object .node-button-div').html((node) => {
      return attrs.buttonContent({ node, state: attrs });
    });

    // Restyle button texts
    nodeUpdate
      .select('.node-button-text')
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .attr('font-size', ({ children }) => {
        if (children) return 40;
        return 26;
      })
      .text(({ children }) => {
        if (children) return '-';
        return '+';
      })
      .attr('y', isEdge() ? 10 : 0);

    nodeUpdate.each(attrs.nodeUpdate);

    // Remove any exiting nodes after transition
    nodesSelection
      .exit()
      .attr('opacity', 1)
      .transition()
      .duration(attrs.duration)
      .attr('transform', () => {
        const ex = attrs.layoutBindings[attrs.layout].nodeJoinX({ x, y, width, height });
        const ey = attrs.layoutBindings[attrs.layout].nodeJoinY({ x, y, width, height });
        return `translate(${ex},${ey})`;
      })
      .on('end', function (this: BaseType) {
        d3.select<BaseType, D3Node<TData>>(this).remove();
      })
      .attr('opacity', 0);
  }

  /**
   * Toggle children on click
   */
  private onButtonClick(e: MouseEvent, d: D3Node<TData>) {
    const attrs = this.getOptions();

    attrs.onNodeButtonClick?.(e, d);

    if (e.defaultPrevented) {
      return;
    }

    if (attrs.setActiveNodeCentered) {
      d.data._centered = true;
      d.data._centeredWithDescendants = true;
    }

    // If children are expanded
    if (d.children) {
      //Collapse them
      d._children = d.children;
      d.children = undefined;

      // Set descendants expanded property to false
      this.setExpansionFlagToChildren(d, false);
    } else {
      // Expand children
      d.children = d._children;
      d._children = undefined;

      // Set each child as expanded
      if (d.children) {
        d.children.forEach(({ data }) => (data._expanded = true));
      }
    }

    // Redraw Graph
    this.update(d);
  }

  /**
   * This function basically redraws visible graph, based on nodes state
   */
  private restyleForeignObjectElements() {
    const attrs = this.getOptions();

    this.svg!.selectAll<HTMLImageElement, D3Node<TData>>('.node-foreign-object')
      .attr('width', ({ width }) => width)
      .attr('height', ({ height }) => height)
      .attr('x', () => 0)
      .attr('y', () => 0);
    this.svg!.selectAll<HTMLElement, D3Node<TData>>('.node-foreign-object-div')
      .style('width', ({ width }: D3Node<TData>) => `${width}px`)
      .style('height', ({ height }: D3Node<TData>) => `${height}px`)
      .html(function (d, i, arr) {
        return attrs.nodeContent.bind(null)(d, i, arr, attrs);
      });
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
      this.restyleForeignObjectElements();
    }
  }

  getRootNode() {
    return this.root;
  }

  /**
   * This function updates nodes state and redraws graph, usually after data change
   */
  private updateNodesState() {
    this.setLayouts({ expandNodesFirst: true });

    // Redraw Graphs
    this.update(this.root);
  }

  private setLayouts({ expandNodesFirst = true }) {
    const attrs = this.getOptions();
    // Store new root by converting flat data to hierarchy
    this.root = d3
      .stratify<TData>()
      .id((d) => this.getNodeId(d))
      .parentId((d) => this.getParentNodeId(d))(attrs.data || []) as D3Node<TData>;

    this.root.each((node) => {
      let width = attrs.nodeWidth(node);
      let height = attrs.nodeHeight(node);
      Object.assign(node, { width, height });
    });

    // Store positions, where children appear during their enter animation
    this.root.x0 = 0;
    this.root.y0 = 0;
    this.allNodes = this.root.descendants();

    // Store direct and total descendants count
    this.allNodes.forEach((d) => {
      Object.assign(d.data, {
        _directSubordinates: d.children ? d.children.length : 0,
        _totalSubordinates: d.descendants().length - 1,
      });
    });

    if (this.root.children) {
      if (expandNodesFirst) {
        // Expand all nodes first
        this.root.children.forEach(this.expand);
      }
      // Then collapse them all
      this.root.children.forEach((d) => this.collapse(d));

      // Collapse root if level is 0
      if (attrs.expandLevel === 0) {
        this.root._children = this.root.children;
        this.root.children = undefined;
      }

      // Then only expand nodes, which have expanded property set to true
      [this.root].forEach((ch) => this.expandSomeNodes(ch));
    }
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
    node.data._expanded = true;
    return this;
  }

  setHighlighted(nodeId: string) {
    const node = this.allNodes.filter((d) => this.getNodeId(d.data) === nodeId)[0];
    if (!node) {
      console.warn(`${LibName} setHighlighted: Node with id (${nodeId}) not found in the tree`);
      return this;
    }
    node.data._highlighted = true;
    node.data._expanded = true;
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
    node.data._expanded = true;
    node.ancestors().forEach((d) => (d.data._upToTheRootHighlighted = true));
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

  // This function changes `expanded` property to descendants
  private setExpansionFlagToChildren(d: D3Node<TData>, flag: boolean) {
    const { data, children, _children } = d;
    // Set flag to the current property
    data._expanded = flag;

    // Loop over and recursively update expanded children's descendants
    if (children) {
      children.forEach((d) => {
        this.setExpansionFlagToChildren(d, flag);
      });
    }

    // Loop over and recursively update collapsed children's descendants
    if (_children) {
      _children.forEach((d) => {
        this.setExpansionFlagToChildren(d, flag);
      });
    }
  }

  // Method which only expands nodes, which have property set "expanded=true"
  private expandSomeNodes(d: D3Node<TData>) {
    // If node has expanded property set
    if (d.data._expanded) {
      // Retrieve node's parent
      let parent = d.parent;

      // While we can go up
      while (parent) {
        // Expand all current parent's children
        if (parent._children) {
          parent.children = parent._children;
        }

        // Replace current parent holding object
        parent = parent.parent;
      }
    }

    // Recursively do the same for collapsed nodes
    if (d._children) {
      d._children.forEach((ch) => this.expandSomeNodes(ch));
    }

    // Recursively do the same for expanded nodes
    if (d.children) {
      d.children.forEach((ch) => this.expandSomeNodes(ch));
    }
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
    node.data._expanded = expandedFlag;
    return this;
  }

  /**
   * Collapses passed node and it's descendants
   */
  collapse(d: D3Node<TData>) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach((ch) => this.collapse(ch));
      d.children = undefined;
    }
  }

  /**
   * Expands passed node and it's descendants
   */
  expand(d: D3Node<TData>) {
    if (d._children) {
      d.children = d._children;
      d.children.forEach((ch) => this.expand(ch));
      d._children = undefined;
    }
  }

  expandAll() {
    this.allNodes.forEach((d) => (d.data._expanded = true));
    this.render();
    return this;
  }

  collapseAll() {
    this.allNodes.forEach((d) => (d.data._expanded = false));
    this.render();
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
          .clickDistance(100)
          .filter((e) => !e.target.closest('.node-button-g'))
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
    (draggingElClone.select('.node-compact-g').node() as HTMLElement).remove();
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
