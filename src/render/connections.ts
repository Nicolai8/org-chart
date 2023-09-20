import { D3Node, OrgChartConnection, OrgChartDataItem, OrgChartOptions } from '../types';
import { Selection } from 'd3-selection';

export const renderOrUpdateConnections = <TData extends OrgChartDataItem = OrgChartDataItem>(
  options: OrgChartOptions<TData>,
  connectionsSelection: Selection<SVGPathElement, OrgChartConnection, SVGGraphicsElement, string>,
  node: D3Node<TData>,
) => {
  const { x0, y0, width, height } = node;

  // Enter any new connections at the parent's previous position.
  const connEnter = connectionsSelection
    .enter()
    .insert('path', 'g')
    .attr('class', 'connection')
    .attr('d', () => {
      const xo = options.layoutBindings[options.layout].linkJoinX({ x: x0, y: y0, width, height });
      const yo = options.layoutBindings[options.layout].linkJoinY({ x: x0, y: y0, width, height });
      const o = { x: xo, y: yo };
      return options.layoutBindings[options.layout].diagonal(o, o, undefined, { sy: options.linkYOffset });
    });

  // Get connections update selection
  const connUpdate = connEnter.merge(connectionsSelection);

  // Styling connections
  connUpdate.attr('fill', 'none');

  // Transition back to the parent element position
  connUpdate
    .transition()
    .duration(options.duration)
    .attr('d', (d) => {
      const xs = options.layoutBindings[options.layout].linkX({
        x: d._source.x,
        y: d._source.y,
        width: d._source.width,
        height: d._source.height,
      });
      const ys = options.layoutBindings[options.layout].linkY({
        x: d._source.x,
        y: d._source.y,
        width: d._source.width,
        height: d._source.height,
      });
      const xt = options.layoutBindings[options.layout].linkJoinX({
        x: d._target.x,
        y: d._target.y,
        width: d._target.width,
        height: d._target.height,
      });
      const yt = options.layoutBindings[options.layout].linkJoinY({
        x: d._target.x,
        y: d._target.y,
        width: d._target.width,
        height: d._target.height,
      });
      return options.linkGroupArc({ source: { x: xs, y: ys }, target: { x: xt, y: yt } });
    });

  // Allow external modifications
  connUpdate.each(options.connectionsUpdate);

  // Remove any  links which is exiting after animation
  connectionsSelection.exit().attr('opacity', 1).transition().duration(options.duration).attr('opacity', 0).remove();
};
