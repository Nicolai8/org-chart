import type { BaseType, Selection } from 'd3-selection';
import type { D3ZoomEvent, ZoomedElementBaseType } from 'd3-zoom';
import type { HierarchyNode } from 'd3-hierarchy';
import type { FlextreeNode } from 'd3-flextree';
import type { Link } from 'd3-shape';
import { d3 } from 'constants';

declare module 'd3-selection' {
  export interface Selection<GElement extends BaseType, Datum, PElement extends BaseType, PDatum> {
    patternify<NewGElement, T = any>(params: {
      selector: string;
      tag: string;
      data?: (d: T) => T[];
    }): Selection<NewGElement, Datum, PElement, PDatum>;
  }
}

export type OrgChartDataItem<TData = {}> = TData & {
  id: string;
  parentId?: string;
  _highlighted?: boolean;
  _upToTheRootHighlighted?: boolean;
  _centeredWithDescendants?: boolean;
  _directSubordinates?: number;
  _totalSubordinates?: number;
  _expanded?: boolean;
  _centered?: boolean;
  _filtered?: boolean;
  _filteredOut?: boolean;
};

export type D3NodeDimensions = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type D3Node<TData> = D3NodeDimensions &
  HierarchyNode<TData> & {
    x0: number;
    y0: number;
    firstCompact?: boolean;
    firstCompactNode?: D3Node<TData>;
    flexCompactDim?: [number, number];
    compactEven?: boolean;
    row?: number;
    _children?: D3Node<TData>[];
  };

export type FlextreeD3Node<TData> = D3Node<TData> & FlextreeNode<TData> & {};

export type Coords = {
  x: number;
  y: number;
};

export type OrgChartLayoutType = 'top' | 'right' | 'bottom' | 'left';

export type OrgChartConnection = {
  from: string;
  to: string;
  label: string;
  _source: D3NodeDimensions;
  _target: D3NodeDimensions;
};

export type LayoutBinding<TData extends OrgChartDataItem = OrgChartDataItem> = {
  nodeLeftX: (node: D3NodeDimensions) => number;
  nodeRightX: (node: D3NodeDimensions) => number;
  nodeTopY: (node: D3NodeDimensions) => number;
  nodeBottomY: (node: D3NodeDimensions) => number;
  nodeJoinX: (node: D3NodeDimensions) => number;
  nodeJoinY: (node: D3NodeDimensions) => number;
  linkJoinX: (node: D3NodeDimensions) => number;
  linkJoinY: (node: D3NodeDimensions) => number;
  linkX: (node: D3NodeDimensions) => number;
  linkY: (node: D3NodeDimensions) => number;
  linkCompactXStart: (node: D3Node<TData>) => number;
  linkCompactYStart: (node: D3Node<TData>) => number;
  compactLinkMidX: (node: D3Node<TData>, state: OrgChartState<TData>) => number;
  compactLinkMidY: (node: D3Node<TData>, state: OrgChartState<TData>) => number;
  linkParentX: (node: D3Node<TData>) => number;
  linkParentY: (node: D3Node<TData>) => number;
  buttonX: (node: D3NodeDimensions) => number;
  buttonY: (node: D3NodeDimensions) => number;
  centerTransform: ({ root, rootMargin, centerY, scale, centerX, chartWidth, chartHeight }) => string;
  compactDimension: {
    sizeColumn: (node: D3Node<TData>) => number;
    sizeRow: (node: D3Node<TData>) => number;
    reverse: <T>(arr: Array<T>) => Array<T>;
  };
  nodeFlexSize: ({ height, width, siblingsMargin, childrenMargin, state, node }) => [number, number];
  zoomTransform: ({ centerX, centerY, scale }) => string;
  diagonal: (s, t, m) => string;
  swap: (d: D3Node<TData>) => void;
  nodeUpdateTransform: ({ x, y, width, height }) => string;
};

export type LayoutBindings<TData extends OrgChartDataItem = OrgChartDataItem> = {
  left: LayoutBinding<TData>;
  top: LayoutBinding<TData>;
  bottom: LayoutBinding<TData>;
  right: LayoutBinding<TData>;
};

export type OrgChartState<TData extends {} = OrgChartDataItem> = {
  // Configure svg width
  svgWidth: number;
  // Configure svg height
  svgHeight: number;
  expandLevel: number;
  // Set parent container, either CSS style selector or DOM element
  container: HTMLElement;
  // Set data, it must be an array of objects, where hierarchy is clearly defined via id and parent ID (property names are configurable)
  data: TData[] | null;
  // Callback for data change
  onDataChange: (data: TData[]) => void;
  // Sets connection data, array of objects, SAMPLE:  [{from:"145",to:"201",label:"Conflicts of interest"}]
  connections: OrgChartConnection[];
  // Set default font
  defaultFont: string;
  // Configure accessor for node id, default is either odeId or id
  nodeId: (d: TData) => string;
  setNodeId: (d: TData, newId: string) => void;
  // Configure accessor for parent node id, default is either parentNodeId or parentId
  parentNodeId: (d: TData) => string | undefined;
  setParentNodeId: (d: TData, newId: string) => void;
  // Configure how much root node is offset from top
  rootMargin: number;
  // Configure each node width, use with caution, it is better to have the same value set for all nodes
  nodeWidth: (d: D3Node<TData>) => number;
  //  Configure each node height, use with caution, it is better to have the same value set for all nodes
  nodeHeight: (d: D3Node<TData>) => number;
  // Configure margin between two nodes, use with caution, it is better to have the same value set for all nodes
  neighbourMargin: (n1: D3Node<TData>, n2: D3Node<TData>) => number;
  // Configure margin between two siblings, use with caution, it is better to have the same value set for all nodes
  siblingsMargin: (d: D3Node<TData>) => number;
  // Configure margin between parent and children, use with caution, it is better to have the same value set for all nodes
  childrenMargin: (d: D3Node<TData>) => number;
  // Configure margin between two nodes in compact mode, use with caution, it is better to have the same value set for all nodes
  compactMarginPair: (d: D3Node<TData>) => number;
  // Configure margin between two nodes in compact mode, use with caution, it is better to have the same value set for all nodes
  compactMarginBetween: (d?: D3Node<TData>) => number;
  // Configure expand & collapse button width
  nodeButtonWidth: (d: D3Node<TData>) => number;
  // Configure expand & collapse button height
  nodeButtonHeight: (d: D3Node<TData>) => number;
  // Configure expand & collapse button x position
  nodeButtonX: (d: D3Node<TData>) => number;
  // Configure expand & collapse button y position
  nodeButtonY: (d: D3Node<TData>) => number;
  // When correcting links which is not working for safari
  linkYOffset: number;
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
  compactNoChildren: boolean;
  compactNoChildrenMargin: number;
  // Callback for zoom & panning start
  onZoomStart: (d: D3ZoomEvent<ZoomedElementBaseType, D3Node<TData>>) => void;
  // Callback for zoom & panning
  onZoom: (event: D3ZoomEvent<ZoomedElementBaseType, D3Node<TData>>, d: string) => void;
  // Callback for zoom & panning end
  onZoomEnd: (d: D3ZoomEvent<ZoomedElementBaseType, D3Node<TData>>) => void;
  enableDoubleClickZoom: boolean;
  enableWheelZoom: boolean;
  // Callback for node click
  onNodeClick: (d: TData) => void;
  nodeContent: (d: D3Node<TData>, i: number, arr: ArrayLike<HTMLElement>, state: OrgChartState<TData>) => string;

  // Enable drag and drop
  dragNDrop: boolean;
  onNodeDrop: (source: TData, target: TData) => boolean;
  isNodeDraggable: (node: TData) => boolean;
  isNodeDroppable: (source: TData, target: TData) => boolean;

  /* Node expand & collapse button content and styling. You can access same helper methods as above */
  buttonContent: ({ node, state }: { node: D3Node<TData>; state: OrgChartState<TData> }) => string;
  /* You can access and modify actual node DOM element in runtime using this method. */
  nodeUpdate: (this: BaseType, d: D3Node<TData>, i: number, arr: ArrayLike<BaseType>) => void;
  /* You can access and modify actual link DOM element in runtime using this method. */
  linkUpdate: (this: BaseType, d: D3Node<TData>, i: number, arr: ArrayLike<BaseType>) => void;
  compactNoChildrenUpdate: (compactGroupRect: Selection<BaseType, D3Node<TData>>) => void;
  // Defining arrows with markers for connections
  defs: (state: OrgChartState<TData>, visibleConnections: OrgChartConnection[]) => string;
  /* You can update connections with custom styling using this function */
  connectionsUpdate: (this: BaseType, d: OrgChartConnection, i: number, arr: ArrayLike<BaseType>) => void;
  // Link generator for connections
  linkGroupArc: Link<any, any, D3Node<TData>>;

  /*
   *   You can customize/offset positions for each node and link by overriding these functions
   *   For example, suppose you want to move link y position 30 px bellow in top layout. You can do it like this:
   *   ```javascript
   *   const layout = chart.layoutBindings();
   *   layout.top.linkY = node => node.y + 30;
   *   chart.layoutBindings(layout);
   *   ```
   */
  layoutBindings: LayoutBindings<TData>;
};

export type FitOptions<TData extends OrgChartDataItem = OrgChartDataItem> = {
  animate?: boolean;
  nodes?: D3Node<TData>[];
  scale?: boolean;
};
export type ExportImgOptions = { full?: boolean; scale?: number; onLoad?: (img: string) => void; save?: boolean };

export interface IOrgChart<TData extends OrgChartDataItem = OrgChartDataItem> {
  readonly d3Instance: typeof d3;

  /* Methods*/
  getData: () => TData[] | null;
  getChartState: () => OrgChartState<TData>;
  render: () => void;
  update: (node: D3Node<TData>) => void;
  updateNodesState: () => void;
  setExpanded: (nodeId: string, expandedFlag?: boolean) => IOrgChart<TData>;
  setCentered: (nodeId: string) => IOrgChart<TData>;
  setHighlighted: (nodeId: string) => IOrgChart<TData>;
  setUpToTheRootHighlighted: (nodeId: string) => IOrgChart<TData>;
  clearHighlighting: () => void;
  // This function can be invoked via chart.addNode API, and it adds node in tree at runtime
  addNode: (node: TData) => void;
  addNodes: (nodes: TData[]) => void;
  // This function can be invoked via chart.removeNode API, and it removes node from tree at runtime
  removeNode: (nodeId: string) => void;
  fit: (opts?: FitOptions<TData>) => void;
  // It can take selector which would go fullscreen
  fullscreen: (element?: HTMLElement) => void;
  // Zoom to specific scale
  zoom: (scale: number) => void;
  // Zoom in exposed method
  zoomIn: () => void;
  // Zoom out exposed method
  zoomOut: () => void;
  // Function which expands passed node and it's descendants
  expand: (d: D3Node<TData>) => void;
  expandAll: () => void;
  // Function which collapses passed node and it's descendants
  collapse: (d: D3Node<TData>) => void;
  collapseAll: () => void;
  exportSvg: () => void;
  exportImg: (opts?: ExportImgOptions) => void;
}
