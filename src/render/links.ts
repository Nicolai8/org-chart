import { D3Node, FlextreeD3Node, OrgChartDataItem, OrgChartOptions } from '../types';
import { Selection } from 'd3-selection';
import { isEdge } from '../utils/core';

export const renderOrUpdateLinks = <TData extends OrgChartDataItem = OrgChartDataItem>(
  options: OrgChartOptions<TData>,
  linksSelection: Selection<SVGPathElement, FlextreeD3Node<TData>, SVGGraphicsElement, string>,
  node: D3Node<TData>,
) => {
  const { x0, y0, x = 0, y = 0, width, height } = node;

  // Enter any new links at the parent's previous position.
  const linkEnter = linksSelection
    .enter()
    .insert('path', 'g')
    .attr('class', 'link')
    .attr('d', () => {
      const xo = options.layoutBindings[options.layout].linkJoinX({ x: x0, y: y0, width, height });
      const yo = options.layoutBindings[options.layout].linkJoinY({ x: x0, y: y0, width, height });
      const o = { x: xo, y: yo };
      return options.layoutBindings[options.layout].diagonal(o, o, o);
    });

  // Get links update selection
  const linkUpdate = linkEnter.merge(linksSelection);

  // Styling links
  linkUpdate.attr('fill', 'none');

  if (isEdge()) {
    linkUpdate.style('display', 'auto');
  } else {
    linkUpdate.attr('display', 'auto');
  }

  // Allow external modifications
  linkUpdate.each(options.linkUpdate);

  // Transition back to the parent element position
  linkUpdate
    .transition()
    .duration(options.duration)
    .attr('d', (d) => {
      const n =
        options.compact && d.flexCompactDim && !options.compactNoChildren
          ? {
              x: options.layoutBindings[options.layout].compactLinkMidX(d, options),
              y: options.layoutBindings[options.layout].compactLinkMidY(d, options),
            }
          : {
              x: options.layoutBindings[options.layout].linkX(d),
              y: options.layoutBindings[options.layout].linkY(d),
            };

      const p = {
        x: options.layoutBindings[options.layout].linkParentX(d),
        y: options.layoutBindings[options.layout].linkParentY(d),
      };

      const m =
        options.compact && d.flexCompactDim && !options.compactNoChildren
          ? {
              x: options.layoutBindings[options.layout].linkCompactXStart(d),
              y: options.layoutBindings[options.layout].linkCompactYStart(d),
            }
          : n;
      return options.layoutBindings[options.layout].diagonal(n, p, m, { sy: options.linkYOffset });
    });

  // Remove any  links which is exiting after animation
  linksSelection
    .exit()
    .transition()
    .duration(options.duration)
    .attr('d', () => {
      const xo = options.layoutBindings[options.layout].linkJoinX({ x, y, width, height });
      const yo = options.layoutBindings[options.layout].linkJoinY({ x, y, width, height });
      const o = { x: xo, y: yo };
      return options.layoutBindings[options.layout].diagonal(o, o, undefined, { sy: options.linkYOffset });
    })
    .remove();
};
