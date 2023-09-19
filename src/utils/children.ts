import { D3Node, OrgChartDataItem } from '../types';

/**
 * This method retrieves passed node's children IDs (including node)
 */
export const getNodeChildren = <TData extends OrgChartDataItem = OrgChartDataItem>(
  node: D3Node<TData>,
  result: Array<TData> = [],
) => {
  const { data, children, _children } = node;

  // Store current node ID
  result.push(data);

  // Loop over children and recursively store descendants id
  [...(children || []), ...(_children || [])].forEach((d) => {
    getNodeChildren(d, result);
  });

  // Return result
  return result;
};

/**
 * Collapses passed node and it's descendants
 */
export const collapse = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>) => {
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

export const isCollapsed = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>) => {
  return !!node._children;
};

export const collapseLevel = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>) => {
  if (node.children) {
    node.children.forEach(({ data }) => (data._visible = false));
  }

  collapse(node);
};

export const expandLevel = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>) => {
  expand(node);

  if (node.children) {
    node.children.forEach(({ data }) => (data._visible = true));
  }
};

/**
 * Method which only expands nodes, which have property set "expanded=true"
 */
export const expandNodesWithExpandedFlag = <TData extends OrgChartDataItem = OrgChartDataItem>(
  allNodes: Array<D3Node<TData>>,
) => {
  const visibleNodes = allNodes.filter((node) => node.data._visible);

  visibleNodes.forEach((d) => {
    let parent = d.parent;

    while (parent && isCollapsed(parent)) {
      parent.data._visible = true;
      expand(parent);

      parent = parent.parent;
    }
  });
};
