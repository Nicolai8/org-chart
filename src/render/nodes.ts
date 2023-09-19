import { D3Node, FlextreeD3Node, OrgChartDataItem, OrgChartOptions } from '../types';
import { d3 } from '../constants';
import { isEdge } from '../utils/core';
import { BaseType, Selection } from 'd3-selection';
import collapseBtn from '../icons/collapse-btn.svg';

/**
 * This function basically redraws visible graph, based on nodes state
 */
export const restyleForeignObjectElements = <TData extends OrgChartDataItem = OrgChartDataItem>(
  options: OrgChartOptions<TData>,
  svg: Selection<SVGElement, string, any, any>,
) => {
  svg
    .selectAll<HTMLImageElement, D3Node<TData>>('.node-foreign-object')
    .attr('width', ({ width }) => width)
    .attr('height', ({ height }) => height)
    .attr('x', () => 0)
    .attr('y', () => 0);
  svg
    .selectAll<HTMLElement, D3Node<TData>>('.node-foreign-object-div')
    .style('width', ({ width }: D3Node<TData>) => `${width}px`)
    .style('height', ({ height }: D3Node<TData>) => `${height}px`)
    .html(function (d, i, arr) {
      return options.nodeContent.bind(null)(d, i, arr, options);
    });
};

const renderAndUpdateForeignObjectElements = <TData extends OrgChartDataItem = OrgChartDataItem>(
  options: OrgChartOptions<TData>,
  nodeWrapperGroup: Selection<SVGGraphicsElement, FlextreeD3Node<TData>, SVGGraphicsElement, string>,
  onNodeClick: (e: MouseEvent, d: D3Node<TData>) => void,
  svg: Selection<SVGElement, string, any, any>,
) => {
  // Add foreignObject element inside rectangle
  const fo = nodeWrapperGroup
    .patternify({
      tag: 'foreignObject',
      selector: 'node-foreign-object',
      data: (d) => [d],
    })
    .style('overflow', 'visible')
    .attr('cursor', 'pointer')
    .on('click', (event: any, node: FlextreeD3Node<TData>) => {
      if (event.target.classList.contains('node-button-foreign-object')) {
        return;
      }

      onNodeClick(event, node);
    });

  // Add foreign object
  fo.patternify({
    tag: 'xhtml:div',
    selector: 'node-foreign-object-div',
    data: (d) => [d],
  });

  restyleForeignObjectElements(options, svg);
};

const renderNodeButton = <TData extends OrgChartDataItem = OrgChartDataItem>(
  options: OrgChartOptions<TData>,
  nodeWrapperGroup: Selection<SVGGraphicsElement, FlextreeD3Node<TData>, SVGGraphicsElement, string>,
  onButtonClick: (e: MouseEvent, d: D3Node<TData>) => void,
) => {
  // Add Node button circle's group (expand-collapse button)
  const nodeButtonGroups = nodeWrapperGroup
    .patternify({
      tag: 'g',
      selector: 'node-button-g',
      data: (d) => [d],
    })
    .on('click', onButtonClick);

  nodeButtonGroups
    .patternify({
      tag: 'rect',
      selector: 'node-button-rect',
      data: (d) => [d],
    })
    .attr('opacity', 0)
    .attr('pointer-events', 'all')
    .attr('width', (d) => options.nodeButtonWidth(d))
    .attr('height', (d) => options.nodeButtonHeight(d))
    .attr('x', (d) => options.nodeButtonX(d))
    .attr('y', (d) => options.nodeButtonY(d));

  // Add expand collapse button content
  nodeButtonGroups
    .patternify({
      tag: 'foreignObject',
      selector: 'node-button-foreign-object',
      data: (d) => [d],
    })
    .attr('width', (d) => options.nodeButtonWidth(d))
    .attr('height', (d) => options.nodeButtonHeight(d))
    .attr('x', (d) => options.nodeButtonX(d))
    .attr('y', (d) => options.nodeButtonY(d))
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
};

const updateNodeButton = <TData extends OrgChartDataItem = OrgChartDataItem>(
  options: OrgChartOptions<TData>,
  nodeUpdate: Selection<SVGGraphicsElement, FlextreeD3Node<TData>, SVGGraphicsElement, string>,
) => {
  nodeUpdate
    .select('.node-button-g')
    .attr('transform', (d) => {
      const x = options.layoutBindings[options.layout].buttonX(d);
      const y = options.layoutBindings[options.layout].buttonY(d);
      return `translate(${x},${y})`;
    })
    .attr('display', (d) => (options.isNodeButtonVisible(d) ? null : 'none'));

  // Restyle node button circle
  nodeUpdate.select('.node-button-foreign-object .node-button-div').html((node) => {
    return options.buttonContent({ node, state: options });
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
};

const renderNodeCompact = <TData extends OrgChartDataItem = OrgChartDataItem>(
  options: OrgChartOptions<TData>,
  nodeEnter: Selection<SVGGraphicsElement, FlextreeD3Node<TData>, SVGGraphicsElement, string>,
  onCompactGroupToggleButtonClick: (e: MouseEvent, d: D3Node<TData>) => void,
) => {
  // Add Node rect for compactNoChildren mode
  const nodeCompactGroup = nodeEnter.patternify({
    tag: 'g',
    selector: 'node-compact',
    data: (d) => [d],
  });

  const nodeCompactGroupRect = nodeCompactGroup
    .patternify({
      tag: 'rect',
      selector: 'node-compact__rect',
      data: (d) => [d],
    })
    .attr('pointer-events', 'none')
    .attr('width', (d) => {
      return options.nodeWidth(d) + options.compactNoChildrenMargin * 2;
    })
    .attr('height', (d) => {
      const { children, compactNoChildren } = d;

      if (children && children.length > 1 && options.compactNoChildren && compactNoChildren) {
        const compactAsGroupChildrenSize =
          d3.sum(
            children,
            (d) =>
              options.layoutBindings[options.layout].compactDimension.sizeColumn(d) + options.compactMarginBetween(d),
          ) - options.compactMarginBetween(d);
        return compactAsGroupChildrenSize + options.compactNoChildrenMargin * 2;
      }

      return options.nodeHeight(d) + options.compactNoChildrenMargin * 2;
    });

  nodeCompactGroup
    .patternify({
      tag: 'g',
      selector: 'node-compact__toggle-btn',
    })
    .html(options.compactNoChildrenToggleBtnIcon || collapseBtn)
    .on('click', onCompactGroupToggleButtonClick);

  options.compactNoChildrenUpdate(nodeCompactGroupRect);
};

const updateNodeCompact = <TData extends OrgChartDataItem = OrgChartDataItem>(
  options: OrgChartOptions<TData>,
  nodeUpdate: Selection<SVGGraphicsElement, FlextreeD3Node<TData>, SVGGraphicsElement, string>,
) => {
  const compactGroup = nodeUpdate
    .select('.node-compact')
    .attr('transform', (d) => {
      const { height } = d;
      // todo: set to correct based on the layout
      const x = -options.compactNoChildrenMargin;
      const y = height - options.compactNoChildrenMargin + options.childrenMargin(d);
      return `translate(${x},${y})`;
    })
    .attr('display', (d) => {
      const { data, compactNoChildren } = d;

      return compactNoChildren && data._expanded ? null : 'none';
    });

  compactGroup.select('.node-compact__rect').attr('height', (d) => {
    const { children, compactNoChildren } = d;

    if (children && children.length > 1 && compactNoChildren) {
      const compactAsGroupChildrenSize =
        d3.sum(
          children,
          (d) => options.layoutBindings[options.layout].compactDimension.sizeRow(d) + options.compactMarginBetween(d),
        ) - options.compactMarginBetween(d);
      return compactAsGroupChildrenSize + options.compactNoChildrenMargin * 2;
    }

    return options.nodeHeight(d) + options.compactNoChildrenMargin * 2;
  });

  compactGroup
    .select('.node-compact__toggle-btn')
    .attr('transform', (d) => {
      const { width } = d;
      const x = width + options.compactNoChildrenMargin * 2 + options.compactNoChildrenToggleBtnMargin;
      return `translate(${x},0)`;
    })
    .attr('display', (d) => {
      const { data } = d;

      return data._compactExpanded ? null : 'none';
    });

  compactGroup.select('.node-compact__toggle-btn svg').attr('display', (d) => {
    const { data } = d;

    return data._compactExpanded ? null : 'none';
  });
};

export const renderOrUpdateNodes = <TData extends OrgChartDataItem = OrgChartDataItem>(
  options: OrgChartOptions<TData>,
  root: D3Node<TData> | undefined,
  node: D3Node<TData>,
  nodesSelection: Selection<SVGGraphicsElement, FlextreeD3Node<TData>, SVGGraphicsElement, string>,
  onNodeClick: (e: MouseEvent, d: D3Node<TData>) => void,
  onButtonClick: (e: MouseEvent, d: D3Node<TData>) => void,
  onCompactGroupToggleButtonClick: (e: MouseEvent, d: D3Node<TData>) => void,
  svg: Selection<SVGElement, string, any, any>,
) => {
  const { x0, y0, x = 0, y = 0, width, height } = node;

  // Enter any new nodes at the parent's previous position.
  const nodeEnter = nodesSelection
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', (d: D3Node<TData>) => {
      if (d == root) {
        return `translate(${x0},${y0})`;
      }
      const xj = options.layoutBindings[options.layout].nodeJoinX({ x: x0, y: y0, width, height });
      const yj = options.layoutBindings[options.layout].nodeJoinY({ x: x0, y: y0, width, height });
      return `translate(${xj},${yj})`;
    });

  renderNodeCompact(options, nodeEnter, onCompactGroupToggleButtonClick);

  // Add Node wrapper
  const nodeWrapperGroup = nodeEnter;

  // Add background rectangle for the nodes
  nodeWrapperGroup.patternify({
    tag: 'rect',
    selector: 'node-rect',
    data: (d) => [d],
  });

  renderAndUpdateForeignObjectElements(options, nodeWrapperGroup, onNodeClick, svg);

  renderNodeButton(options, nodeWrapperGroup, onButtonClick);

  // Node update styles
  const nodeUpdate = nodeEnter.merge(nodesSelection).style('font', '12px sans-serif');

  // Transition to the proper position for the node
  nodeUpdate
    .transition()
    .attr('opacity', 0)
    .duration(options.duration)
    .attr('transform', ({ x, y, width, height }) => {
      return options.layoutBindings[options.layout].nodeUpdateTransform({ x, y, width, height });
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

  updateNodeCompact(options, nodeUpdate);

  updateNodeButton(options, nodeUpdate);

  nodeUpdate.each(options.nodeUpdate);

  // Remove any exiting nodes after transition
  nodesSelection
    .exit()
    .attr('opacity', 1)
    .transition()
    .duration(options.duration)
    .attr('transform', () => {
      const ex = options.layoutBindings[options.layout].nodeJoinX({ x, y, width, height });
      const ey = options.layoutBindings[options.layout].nodeJoinY({ x, y, width, height });
      return `translate(${ex},${ey})`;
    })
    .on('end', function (this: BaseType) {
      d3.select<BaseType, D3Node<TData>>(this).remove();
    })
    .attr('opacity', 0);
};
