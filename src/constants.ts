import { selection, select, selectAll, Selection, BaseType } from "d3-selection";
import { max, min, sum, cumsum } from 'd3-array';
import { stratify } from 'd3-hierarchy';
import { zoom, zoomIdentity } from 'd3-zoom';
import { flextree } from 'd3-flextree';
import { linkHorizontal } from 'd3-shape';
import { drag } from 'd3-drag';

export const LibName = 'd3-org-chart';

export const d3 = {
  selection,
  select,
  max,
  min,
  sum,
  cumsum,
  stratify,
  zoom,
  zoomIdentity,
  linkHorizontal,
  flextree,
  drag,
  selectAll,
};

d3.selection.prototype.patternify = function <T>(
  this: Selection<BaseType, any, any, any>,
  params: { selector: string; tag: string; data: (d: T) => T[] },
) {
  const container = this;
  const selector = params.selector;
  const elementTag = params.tag;
  const data = params.data || [selector];

  // Pattern in action
  let selection = container.selectAll<BaseType, any>(`.${selector}`).data(data, (d, i) => {
    if (typeof d === 'object') {
      if (d.id) {
        return d.id;
      }
    }
    return i;
  });
  selection.exit().remove();
  selection = selection.enter().append(elementTag).merge(selection);
  selection.attr('class', selector);
  return selection;
};