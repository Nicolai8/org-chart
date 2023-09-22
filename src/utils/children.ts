import { D3Node, OrgChartDataItem } from '../types';

export const setExpandedFlag = <TData extends OrgChartDataItem = OrgChartDataItem>(
  node: D3Node<TData> | null,
  flag: boolean,
) => {
  if (!node) {
    return;
  }

  if (flag) {
    node.data._expanded = true;
    if (node.compactNoChildren) {
      node.data._compactExpanded = true;
    }
  } else {
    node.data._expanded = false;
    if (node.compactNoChildren) {
      node.data._compactExpanded = false;
    }
  }
};

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

const resetCompactGroupToggle = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>) => {
  if (node._children?.[0] && node._children[0].data._type === 'group-toggle') {
    node._children[0].data._type = undefined;
  }
};

const setCompactGroupToggle = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>) => {
  if (node._children?.[0]) {
    // mark first child as group-toggle
    node._children[0].data._type = 'group-toggle';
    node.children = [node._children[0]];
  }
};

export const collapseInitiallyExpanded = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>) => {
  node._children = node.children;
  node.children = undefined;
  resetCompactGroupToggle(node);
};

/**
 * Collapses passed node and it's descendants
 */
const collapse = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>, setFlags: boolean) => {
  // !compactNoChildren
  // default
  // compactNoChildren && !_expanded
  // default
  // compactNoChildren && _expanded && !_compactExpanded
  // resetCompactGroupToggle
  // compactNoChildren && _expanded && _compactExpanded
  // default

  resetCompactGroupToggle(node);
  // if toggle compact group is visible instead of nodes
  if (node.compactNoChildren && !node.data._compactExpanded && node.data._expanded) {
  } else {
    node._children = node.children;
  }
  node.children = undefined;

  if (setFlags) {
    node.data._compactExpanded = false;
    node.data._expanded = false;
  }
};

/**
 * Expands passed node and it's descendants
 */
export const expand = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>, setFlags: boolean, expandCompact: boolean = false) => {
  resetCompactGroupToggle(node);

  node.children = node._children;
  node._children = undefined;

  if (setFlags) {
    node.data._expanded = true;
    if (node.compactNoChildren && expandCompact) {
      node.data._compactExpanded = true;
    }
  }
};

const expandLevel = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>) => {
  node.data._expanded = true;

  if (node.compactNoChildren && !node.data._compactExpanded) {
    node.data._compactExpanded = false;
    setCompactGroupToggle(node);
  } else {
    expand(node, false);
  }
};

/**
 * Collapse compact nodes and shows Group-toggle. Triggered on Group-toggle Button click.
 */
export const collapseCompact = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>) => {
  collapse(node, false);

  node.data._compactExpanded = false;
  setCompactGroupToggle(node);
};

/**
 * Expand compact nodes and removes Group-toggle. Triggered on Group-toggle Node click.
 */
export const expandCompact = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>) => {
  expand(node, true, true);
};

/**
 * Toggle single level. Triggered on Node button click.
 */
export const toggleLevel = <TData extends OrgChartDataItem = OrgChartDataItem>(node: D3Node<TData>) => {
  if (node.data._expanded) {
    collapse(node, true);
  } else {
    expandLevel(node);
  }
};

/**
 * Method which only expands nodes, which have property set "expanded=true"
 */
export const expandNodesWithExpandedFlag = <TData extends OrgChartDataItem = OrgChartDataItem>(
  allNodes: Array<D3Node<TData>>,
) => {
  const expandedNodes = allNodes.filter((node) => node.data._expanded);

  expandedNodes.forEach((d) => {
    expandLevel(d);

    let parent = d.parent;

    while (parent && !parent.data._expanded) {
      expandLevel(parent);

      parent = parent.parent;
    }
  });
};
