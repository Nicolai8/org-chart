import { D3Node, OrgChartDataItem } from '../types';

export const getDirectChildren = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>) => {
  const { children, _children } = node;

  return [...(children || []), ...(_children || [])].filter((d) => d.data._type !== 'group-toggle');
};

/**
 * This method retrieves passed node's children IDs (including node)
 */
export const getNodeChildren = <TData extends OrgChartDataItem = OrgChartDataItem>(
  node: D3Node<TData>,
  result: Array<TData> = [],
) => {
  const { data } = node;

  // Store current node ID
  result.push(data);

  // Loop over children and recursively store descendants id
  getDirectChildren(node).forEach((d) => {
    getNodeChildren(d, result);
  });

  // Return result
  return result;
};

/**
 * Collapses passed node and it's descendants
 */
export const collapse = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>) => {
  // if toggle compact group is visible instead of nodes
  if (node.data._expanded && !node.data._compactExpanded) {
    node.children = undefined;
    return;
  }

  node._children = node.children;
  node.children = undefined;
};

/**
 * Expands passed node and it's descendants
 */
export const expand = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>) => {
  node.children = node._children;
  node._children = undefined;
};

export const collapseLevel = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>) => {
  collapse(node);

  node.data._compactExpanded = false;
  node.data._expanded = false;
};

export const expandLevel = <TData extends OrgChartDataItem = OrgChartDataItem>(
  node: D3Node<TData>,
  expandCompact: boolean = false,
) => {
  node.data._expanded = true;

  if (expandCompact && node.compactNoChildren) {
    node.data._compactExpanded = true;
  }

  if (node.compactNoChildren && !node.data._compactExpanded) {
    expandCompactLevel(node);
    return;
  }

  expand(node);
};

const expandCompactLevel = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>) => {
  if (node._children?.[0]) {
    // mark first child as group-toggle
    node._children[0].data._type = 'group-toggle';
    node.children = [node._children[0]];
  }
};

export const collapseCompactLevel = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>) => {
  collapse(node);
  node.data._compactExpanded = false;

  expandLevel(node);
}

/**
 * Method which only expands nodes, which have property set "expanded=true"
 */
export const expandNodesWithExpandedFlag = <TData extends OrgChartDataItem = OrgChartDataItem>(
  allNodes: Array<D3Node<TData>>,
) => {
  const expandedNodes = allNodes.filter((node) => node.data._expanded);

  expandedNodes.forEach((d) => {
    expandLevel(d, true);

    let parent = d.parent;

    while (parent && !parent.data._expanded) {
      expandLevel(parent, true);

      parent = parent.parent;
    }
  });
};
