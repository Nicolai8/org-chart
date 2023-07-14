export type ExportedD3Functions = {
  selection: any;
  select: any;
  max: any;
  min: any;
  sum: any;
  cumsum: any;
  tree: any;
  stratify: any;
  zoom: any;
  zoomIdentity: any;
  linkHorizontal: any;
  flextree: any;
  drag: any;
  selectAll: any;
}

export type OrgChartDataItem<TData = {}> = TData & {
  id: string;
  parentId?: string;
  _directSubordinatesPaging?: number;
};

export type D3Node<TData> = {
  data: TData;
  depth: number;
  children?: D3Node<TData>[] | null;
};

export type OrgChartZoomEvent = {
  sourceEvent: Event;
  target: any;
  transform: {
    x: number;
    y: number;
    k: number;
  };
  type: 'zoom';
};

export type OrgChartLayoutType = 'top' | 'right' | 'bottom' | 'left';

export type OrgChartState<TData extends {} = OrgChartDataItem> = {
  // Configure svg width
  svgWidth: number;
  // Configure svg height
  svgHeight: number;
  expandLevel: number;
  // Set parent container, either CSS style selector or DOM element
  container: HTMLDivElement | string;
  // Set data, it must be an array of objects, where hierarchy is clearly defined via id and parent ID (property names are configurable)
  data: TData[] | null;
  // Sets connection data, array of objects, SAMPLE:  [{from:"145",to:"201",label:"Conflicts of interest"}]
  connections: OrgChartConnection[];
  // Set default font
  defaultFont: string;
  // Configure accessor for node id, default is either odeId or id
  nodeId: (d) => string;
  // Configure accessor for parent node id, default is either parentNodeId or parentId
  parentNodeId: (d) => string | undefined;
  // Configure how much root node is offset from top
  rootMargin: number;
  // Configure each node width, use with caution, it is better to have the same value set for all nodes
  nodeWidth: (d) => number;
  //  Configure each node height, use with caution, it is better to have the same value set for all nodes
  nodeHeight: (d) => number;
  // Configure margin between two nodes, use with caution, it is better to have the same value set for all nodes
  neighbourMargin: (n1, n2) => number;
  // Configure margin between two siblings, use with caution, it is better to have the same value set for all nodes
  siblingsMargin: (d) => number;
  // Configure margin between parent and children, use with caution, it is better to have the same value set for all nodes
  childrenMargin: (d) => number;
  // Configure margin between two nodes in compact mode, use with caution, it is better to have the same value set for all nodes
  compactMarginPair: (d) => number;
  // Configure margin between two nodes in compact mode, use with caution, it is better to have the same value set for all nodes
  compactMarginBetween: (d) => number;
  // Configure expand & collapse button width
  nodeButtonWidth: (d: D3Node<TData>) => number;
  // Configure expand & collapse button height
  nodeButtonHeight: (d: D3Node<TData>) => number;
  // Configure expand & collapse button x position
  nodeButtonX: (d) => number;
  // Configure expand & collapse button y position
  nodeButtonY: (d) => number;
  // When correcting links which is not working for safari
  linkYOffset: number;
  // Configure how many nodes to show when making new nodes appear
  pagingStep: (d) => number;
  // Configure minimum number of visible nodes , after which paging button appears
  minPagingVisibleNodes: (d) => number;
  // Configure zoom scale extent , if you don't want any kind of zooming, set it to [1,1]
  scaleExtent: [number, number];
  duration: number; // Configure duration of transitions
  // Configure exported PNG and SVG image name
  imageName: string;
  // Configure if active node should be centered when expanded and collapsed
  setActiveNodeCentered: boolean;
  // Configure layout direction , possible values are "top", "left", "right", "bottom"
  layout: OrgChartLayoutType;
  // Configure if compact mode is enabled , when enabled, nodes are shown in compact positions, instead of horizontal spread
  compact: boolean;
  // Callback for zoom & panning start
  onZoomStart: (d: OrgChartZoomEvent) => void;
  // Callback for zoom & panning
  onZoom: (event: OrgChartZoomEvent, d) => void;
  // Callback for zoom & panning end
  onZoomEnd: (d: OrgChartZoomEvent) => void;
  enableDoubleClickZoom: boolean;
  enableWheelZoom: boolean;
  // Callback for node click
  onNodeClick: (d) => void;
  nodeContent: (d: D3Node<TData>) => string;

  // Enable drag and drop
  dragNDrop: boolean;
  onNodeDrop: (source, target) => boolean;
  isNodeDraggable: (node) => boolean;
  isNodeDroppable: (source, target) => boolean;

  /* Node expand & collapse button content and styling. You can access same helper methods as above */
  buttonContent: ({ node, state }: { node: D3Node<TData>; state: OrgChartState<TData> }) => string;
  /* Node paging button content and styling. You can access same helper methods as above. */
  pagingButton: (d: D3Node<TData>, i, arr, state) => string;
  /* You can access and modify actual node DOM element in runtime using this method. */
  nodeUpdate: (d: D3Node<TData>, i, arr) => void;
  /* You can access and modify actual link DOM element in runtime using this method. */
  linkUpdate: (d: D3Node<TData>, i, arr) => void;
  /* Horizontal diagonal generation algorithm - https://observablehq.com/@bumbeishvili/curved-edges-compact-horizontal */
  hdiagonal: (s, t, m) => string;
  /* Vertical diagonal generation algorithm - https://observablehq.com/@bumbeishvili/curved-edges-compacty-vertical */
  diagonal: (s, t, m, offsets?: { sy: number }) => string;
  // Defining arrows with markers for connections
  defs: (state, visibleConnections) => string;
  /* You can update connections with custom styling using this function */
  connectionsUpdate: (d, i, arr) => void;
  // Link generator for connections
  linkGroupArc: any;

  /*
   *   You can customize/offset positions for each node and link by overriding these functions
   *   For example, suppose you want to move link y position 30 px bellow in top layout. You can do it like this:
   *   ```javascript
   *   const layout = chart.layoutBindings();
   *   layout.top.linkY = node => node.y + 30;
   *   chart.layoutBindings(layout);
   *   ```
   */
  layoutBindings: LayoutBindings;
  root?: D3Node<TData>;
};

export type OrgChartPropertySetter<T, TData extends {} = OrgChartDataItem> = (value: T) => OrgChart<TData>;

export type OrgChartConnection = {
  from: string;
  to: string;
  label: string;
};

export type LayoutBinding = {
  nodeLeftX: (node) => number;
  nodeRightX: (node) => number;
  nodeTopY: (node) => number;
  nodeBottomY: (node) => number;
  nodeJoinX: (node) => number;
  nodeJoinY: (node) => number;
  linkJoinX: (node) => number;
  linkJoinY: (node) => number;
  linkX: (node) => number;
  linkY: (node) => number;
  linkCompactXStart: (node) => number;
  linkCompactYStart: (node) => number;
  compactLinkMidX: (node) => number;
  compactLinkMidY: (node) => number;
  linkParentX: (node) => number;
  linkParentY: (node) => number;
  buttonX: (node) => number;
  buttonY: (node) => number;
  centerTransform: ({ root, rootMargin, centerY, scale, centerX }) => string;
  compactDimension: {
    sizeColumn: (node) => number;
    sizeRow: (node) => number;
    reverse: <T>(arr: Array<T>) => Array<T>;
  };
  nodeFlexSize: ({ height, width, siblingsMargin, childrenMargin, state, node }) => [number, number];
  zoomTransform: ({ centerY, scale }) => string;
  diagonal: (s, t, m) => string;
  swap: (d) => void;
  nodeUpdateTransform: ({ x, y, width, height }) => string;
};

export type LayoutBindings = {
  left: LayoutBinding;
  top: LayoutBinding;
  bottom: LayoutBinding;
  right: LayoutBinding;
};

export class OrgChart<TData extends {} = OrgChartDataItem> {
  // Configure svg width
  svgWidth: OrgChartPropertySetter<number, TData>;
  // Configure svg height
  svgHeight: OrgChartPropertySetter<number, TData>;
  expandLevel: OrgChartPropertySetter<number, TData>;
  // Set parent container, either CSS style selector or DOM element
  container: OrgChartPropertySetter<HTMLDivElement | string, TData>;
  // Set data, it must be an array of objects, where hierarchy is clearly defined via id and parent ID (property names are configurable)
  data: OrgChartPropertySetter<TData[] | null, TData>;
  // Sets connection data, array of objects, SAMPLE:  [{from:"145",to:"201",label:"Conflicts of interest"}]
  connections: OrgChartPropertySetter<OrgChartConnection[], TData>;
  // Set default font
  defaultFont: OrgChartPropertySetter<string, TData>;
  // Configure accessor for node id, default is either odeId or id
  nodeId: OrgChartPropertySetter<(d) => string, TData>;
  // Configure accessor for parent node id, default is either parentNodeId or parentId
  parentNodeId: OrgChartPropertySetter<(d) => string | undefined, TData>;
  // Configure how much root node is offset from top
  rootMargin: OrgChartPropertySetter<number, TData>;
  // Configure each node width, use with caution, it is better to have the same value set for all nodes
  nodeWidth: OrgChartPropertySetter<(d3Node) => number, TData>;
  //  Configure each node height, use with caution, it is better to have the same value set for all nodes
  nodeHeight: OrgChartPropertySetter<(d) => number, TData>;
  // Configure margin between two nodes, use with caution, it is better to have the same value set for all nodes
  neighbourMargin: OrgChartPropertySetter<(n1, n2) => number, TData>;
  // Configure margin between two siblings, use with caution, it is better to have the same value set for all nodes
  siblingsMargin: OrgChartPropertySetter<(d3Node) => number, TData>;
  // Configure margin between parent and children, use with caution, it is better to have the same value set for all nodes
  childrenMargin: OrgChartPropertySetter<(d) => number, TData>;
  // Configure margin between two nodes in compact mode, use with caution, it is better to have the same value set for all nodes
  compactMarginPair: OrgChartPropertySetter<(d) => number, TData>;
  // Configure margin between two nodes in compact mode, use with caution, it is better to have the same value set for all nodes
  compactMarginBetween: OrgChartPropertySetter<(d) => number, TData>;
  // Configure expand & collapse button width
  nodeButtonWidth: OrgChartPropertySetter<(d: D3Node<TData>) => number, TData>;
  // Configure expand & collapse button height
  nodeButtonHeight: OrgChartPropertySetter<(d: D3Node<TData>) => number, TData>;
  // Configure expand & collapse button x position
  nodeButtonX: OrgChartPropertySetter<(d) => number, TData>;
  // Configure expand & collapse button y position
  nodeButtonY: OrgChartPropertySetter<(d) => number, TData>;
  // When correcting links which is not working for safari
  linkYOffset: OrgChartPropertySetter<number, TData>;
  // Configure how many nodes to show when making new nodes appear
  pagingStep: OrgChartPropertySetter<(d) => number, TData>;
  // Configure minimum number of visible nodes , after which paging button appears
  minPagingVisibleNodes: OrgChartPropertySetter<(d) => number, TData>;
  // Configure zoom scale extent , if you don't want any kind of zooming, set it to [1,1]
  scaleExtent: OrgChartPropertySetter<[number, number], TData>;
  duration: OrgChartPropertySetter<number, TData>; // Configure duration of transitions
  // Configure exported PNG and SVG image name
  imageName: OrgChartPropertySetter<string, TData>;
  // Configure if active node should be centered when expanded and collapsed
  setActiveNodeCentered: OrgChartPropertySetter<boolean, TData>;
  // Configure layout direction , possible values are "top", "left", "right", "bottom"
  layout: OrgChartPropertySetter<OrgChartLayoutType, TData>;
  // Configure if compact mode is enabled , when enabled, nodes are shown in compact positions, instead of horizontal spread
  compact: OrgChartPropertySetter<boolean, TData>;
  // Callback for zoom & panning start
  onZoomStart: OrgChartPropertySetter<(d: OrgChartZoomEvent) => void, TData>;
  // Callback for zoom & panning
  onZoom: OrgChartPropertySetter<(event: OrgChartZoomEvent, d) => void, TData>;
  // Callback for zoom & panning end
  onZoomEnd: OrgChartPropertySetter<(d: OrgChartZoomEvent) => void, TData>;
  enableDoubleClickZoom: OrgChartPropertySetter<boolean, TData>;
  enableWheelZoom: OrgChartPropertySetter<boolean, TData>;

  // Callback for node click
  onNodeClick: OrgChartPropertySetter<(d) => void, TData>;
  nodeContent: OrgChartPropertySetter<(d: D3Node<TData>) => string, TData>;

  // Enable drag and drop
  dragNDrop: OrgChartPropertySetter<boolean, TData>;
  onNodeDrop: OrgChartPropertySetter<(source, target) => boolean, TData>;
  isNodeDraggable: OrgChartPropertySetter<(node) => boolean, TData>;
  isNodeDroppable: OrgChartPropertySetter<(source, target) => boolean, TData>;

  /* Node expand & collapse button content and styling. You can access same helper methods as above */
  buttonContent: OrgChartPropertySetter<
    ({ node, state }: { node: D3Node<TData>; state: OrgChartState<TData> }) => string,
    TData
  >;
  /* Node paging button content and styling. You can access same helper methods as above. */
  pagingButton: OrgChartPropertySetter<(d: D3Node<TData>, i, arr, state: OrgChartState<TData>) => string, TData>;
  /* You can access and modify actual node DOM element in runtime using this method. */
  nodeUpdate: OrgChartPropertySetter<(d: D3Node<TData>, i, arr) => void, TData>;
  /* You can access and modify actual link DOM element in runtime using this method. */
  linkUpdate: OrgChartPropertySetter<(d: D3Node<TData>, i, arr) => void, TData>;
  /* Horizontal diagonal generation algorithm - https://observablehq.com/@bumbeishvili/curved-edges-compact-horizontal */
  hdiagonal: OrgChartPropertySetter<(s, t, m) => string, TData>;
  /* Vertical diagonal generation algorithm - https://observablehq.com/@bumbeishvili/curved-edges-compacty-vertical */
  diagonal: OrgChartPropertySetter<(s, t, m, offsets?: { sy: number }) => string, TData>;
  // Defining arrows with markers for connections
  defs: OrgChartPropertySetter<(state, visibleConnections) => string, TData>;
  /* You can update connections with custom styling using this function */
  connectionsUpdate: OrgChartPropertySetter<(d, i, arr) => void, TData>;
  // Link generator for connections
  linkGroupArc: OrgChartPropertySetter<any, TData>;

  /*
   *   You can customize/offset positions for each node and link by overriding these functions
   *   For example, suppose you want to move link y position 30 px bellow in top layout. You can do it like this:
   *   ```javascript
   *   const layout = chart.layoutBindings();
   *   layout.top.linkY = node => node.y + 30;
   *   chart.layoutBindings(layout);
   *   ```
   */
  layoutBindings: OrgChartPropertySetter<LayoutBindings, TData>;
  readonly d3Instance: ExportedD3Functions;

  /* Methods*/
  setParentNodeId: (node: TData, newId: string) => void;
  getChartState: () => OrgChartState<TData>;
  render: () => void;
  setExpanded: (nodeId: string, expandedFlag?: boolean) => OrgChart<TData>;
  setCentered: (nodeId: string) => OrgChart<TData>;
  setHighlighted: (nodeId: string) => OrgChart<TData>;
  setUpToTheRootHighlighted: (nodeId: string) => OrgChart<TData>;
  clearHighlighting: () => void;
  addNode: (node: TData) => void;
  addNodes: (nodes: TData[]) => void;
  removeNode: (nodeId: string) => void;
  fit: (opts?: { animate: boolean; nodes: string[]; scale: boolean }) => OrgChart<TData>;
  fullscreen: () => void;
  zoom: (scale: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  expandAll: () => void;
  collapseAll: () => void;
  exportSvg: () => void;
  exportImg: (opts?: { full: boolean; scale: number; onLoad: (img: string) => void; save: boolean }) => void;
}

declare module '@nicolai8/d3-org-chart' { }
