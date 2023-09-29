import { BaseType, Selection } from 'd3-selection';
import { D3ZoomEvent, ZoomedElementBaseType } from 'd3-zoom';
import { HierarchyNode } from 'd3-hierarchy';
import { FlextreeNode } from 'd3-flextree';
import { Link } from 'd3-shape';

declare module 'd3-selection' {
  export interface Selection<GElement extends BaseType, Datum, PElement extends BaseType, PDatum> {
    patternify<NewGElement extends BaseType, T = any>(params: {
      selector: string;
      tag: string;
      data?: (d: T) => T[];
    }): Selection<NewGElement, Datum, PElement, PDatum>;
  }
}

export type OrgChartDataItem<
  TData = {
    id: string;
    parentId?: string;
  },
> = TData & {
  _highlighted?: boolean;
  _upToTheRootHighlighted?: boolean;
  _centeredWithDescendants?: boolean;
  _directSubordinates?: number;
  _totalSubordinates?: number;
  _centered?: boolean;
  _expanded?: boolean;
  /**
   * true if compact "no children" is expanded
   */
  _compactExpanded?: boolean;
  _toDelete?: boolean;
  _type?: 'normal' | 'group-toggle';
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
    /**
     * true if it's first node of compact node
     */
    firstCompact?: boolean;
    /**
     * first compact node reference
     */
    firstCompactNode?: D3Node<TData>;
    /**
     * node compact dimensions. It's [0, 0] for non-first child
     */
    flexCompactDim?: [number, number];
    compactEven?: boolean;
    /**
     * row number in compact mode
     */
    row?: number;
    /**
     * true if all children nodes doesn't have its own children
     */
    compactNoChildren?: boolean;
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

type CenterTransformOptions<TData extends OrgChartDataItem = OrgChartDataItem> = {
  root?: D3Node<TData>;
  rootMargin: number;
  centerY: number;
  scale: number;
  centerX: number;
  chartWidth: number;
  chartHeight: number;
};

type NodeFlexSizeOptions<TData extends OrgChartDataItem = OrgChartDataItem> = {
  height: number;
  width: number;
  siblingsMargin: number;
  childrenMargin: number;
  state: OrgChartOptions<TData>;
  node: D3Node<TData>;
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
  compactLinkMidX: (node: D3Node<TData>, state: OrgChartOptions<TData>) => number;
  compactLinkMidY: (node: D3Node<TData>, state: OrgChartOptions<TData>) => number;
  linkParentX: (node: D3Node<TData>) => number;
  linkParentY: (node: D3Node<TData>) => number;
  buttonX: (node: D3NodeDimensions) => number;
  buttonY: (node: D3NodeDimensions) => number;
  centerTransform: (options: CenterTransformOptions<TData>) => string;
  compactDimension: {
    sizeColumn: (node: D3Node<TData>) => number;
    sizeRow: (node: D3Node<TData>) => number;
    reverse: <T>(arr: Array<T>) => Array<T>;
  };
  nodeFlexSize: (options: NodeFlexSizeOptions<TData>) => [number, number];
  zoomTransform: ({ centerX, centerY, scale }: { centerX: number; centerY: number; scale: number }) => string;
  diagonal: (s: Coords, t: Coords, m?: Coords, offsets?: { sy: number }) => string;
  swap: (d: D3Node<TData>) => void;
  nodeUpdateTransform: ({ x, y, width, height }: D3NodeDimensions) => string;
};

export type LayoutBindings<TData extends OrgChartDataItem = OrgChartDataItem> = {
  left: LayoutBinding<TData>;
  top: LayoutBinding<TData>;
  bottom: LayoutBinding<TData>;
  right: LayoutBinding<TData>;
};

export type OrgChartOptions<TData extends OrgChartDataItem = OrgChartDataItem> = {
  // Configure svg width
  svgWidth: number;
  // Configure svg height
  svgHeight: number;
  // Set parent container, either CSS style selector or DOM element
  container: HTMLElement;

  /**
   * Configure accessor for node id, default is id
   */
  nodeIdKey: keyof TData;
  /**
   * Configure accessor for parent node id, default is parentId
   */
  parentNodeIdKey: keyof TData;
  // Set data, it must be an array of objects, where hierarchy is clearly defined via id and parent ID (property names are configurable)
  data: TData[] | null;
  // Callback for data change
  onDataChange: (data: TData[]) => void;
  // Sets connection data, array of objects, SAMPLE:  [{from:"145",to:"201",label:"Conflicts of interest"}]
  connections: OrgChartConnection[];

  // Configure how much root node is offset from top
  rootMargin: number;
  // Configure margin between two nodes, use with caution, it is better to have the same value set for all nodes
  neighbourMargin: (n1: D3Node<TData>, n2: D3Node<TData>) => number;
  // Configure margin between two siblings, use with caution, it is better to have the same value set for all nodes
  siblingsMargin: (d: D3Node<TData>) => number;
  // Configure margin between parent and children, use with caution, it is better to have the same value set for all nodes
  childrenMargin: (d: D3Node<TData>) => number; // Configure expand & collapse button width
  // When correcting links which is not working for safari
  linkYOffset: number;

  // Initial expand level
  expandLevel: number | null;
  // Set default font
  defaultFont: string;
  duration: number; // Configure duration of transitions
  // Configure exported PNG and SVG image name
  imageName: string;
  // Configure if active node should be centered when expanded and collapsed
  setActiveNodeCentered: boolean;
  // Configure layout direction , possible values are "top", "left", "right", "bottom"
  layout: OrgChartLayoutType;

  /**
   * Configure if compact mode is enabled , when enabled, nodes are shown in compact positions, instead of horizontal spread
   */
  compact: boolean;
  /**
   * Configure to compact nodes without children only.
   * @property compact should also be set to true
   */
  compactNoChildren: boolean;
  compactNoChildrenMargin: number;
  // Configure margin between two nodes in compact mode, use with caution, it is better to have the same value set for all nodes
  compactMarginPair: (d: D3Node<TData>) => number;
  // Configure margin between two nodes in compact mode, use with caution, it is better to have the same value set for all nodes
  compactMarginBetween: (d?: D3Node<TData>) => number;
  compactNoChildrenUpdate: (
    compactGroupRect: Selection<BaseType, FlextreeD3Node<TData>, SVGGraphicsElement, string>,
  ) => void;

  compactToggleButtonMargin: number;
  compactToggleBtnIcon?: string;
  compactCollapsedContent: (d: D3Node<TData>) => string;
  compactCollapsedNodeUpdate: (nodeGroup: Selection<SVGGraphicsElement, D3Node<TData>, null, undefined>) => void;
  compactCollapsedNodeWidth: (d: D3Node<TData>) => number;
  compactCollapsedNodeHeight: (d: D3Node<TData>) => number;

  // Configure zoom scale extent , if you don't want any kind of zooming, set it to [1,1]
  scaleExtent: [number, number];
  // Callback for zoom & panning start
  onZoomStart: (d: D3ZoomEvent<ZoomedElementBaseType, D3Node<TData>>) => void;
  // Callback for zoom & panning
  onZoom: (event: D3ZoomEvent<ZoomedElementBaseType, D3Node<TData>>, d: string) => void;
  // Callback for zoom & panning end
  onZoomEnd: (d: D3ZoomEvent<ZoomedElementBaseType, D3Node<TData>>) => void;
  enableDoubleClickZoom: boolean;
  enableWheelZoom: boolean;

  // Configure each node width, use with caution, it is better to have the same value set for all nodes
  nodeWidth: (d: D3Node<TData>) => number;
  //  Configure each node height, use with caution, it is better to have the same value set for all nodes
  nodeHeight: (d: D3Node<TData>) => number;
  // Callback for node click
  onNodeClick: (d: TData) => void;
  nodeContent: (d: D3Node<TData>) => string;
  /**
   * You can access and modify actual node DOM element in runtime using this method.
   */
  nodeUpdate: (nodeGroup: Selection<SVGGraphicsElement, D3Node<TData>, null, undefined>, d: D3Node<TData>, i: number, arr: ArrayLike<BaseType>) => void;

  // Enable drag and drop
  dragNDrop: boolean;
  onNodeDrop: (source: TData, target: TData) => boolean;
  isNodeDraggable: (node: TData) => boolean;
  isNodeDroppable: (source: TData, target: TData) => boolean;

  /**
   * Configure if you want to show/hide node button in specific case.
   * E.g. you want to use this button as children loader.
   * By default, it's shown when _directSubordinates > 0.
   */
  isNodeButtonVisible: (d: D3Node<TData>) => boolean;
  nodeButtonWidth: (d: D3Node<TData>) => number;
  // Configure expand & collapse button height
  nodeButtonHeight: (d: D3Node<TData>) => number;
  // Configure expand & collapse button x position
  nodeButtonX: (d: D3Node<TData>) => number;
  // Configure expand & collapse button y position
  nodeButtonY: (d: D3Node<TData>) => number;
  /**
   * Node expand & collapse button content and styling. You can access same helper methods as above
   */
  buttonContent: ({ node, state }: { node: D3Node<TData>; state: OrgChartOptions<TData> }) => string;
  onNodeButtonClick?: (e: MouseEvent, data: D3Node<TData>) => void;

  /**
   * You can access and modify actual link DOM element in runtime using this method.
   */
  linkUpdate: (this: BaseType, d: D3Node<TData>, i: number, arr: ArrayLike<BaseType>) => void;

  /**
   * Defining arrows with markers for connections
   */
  defs: (state: OrgChartOptions<TData>, visibleConnections: OrgChartConnection[]) => string;
  /**
   * You can update connections with custom styling using this function
   */
  connectionsUpdate: (this: BaseType, d: OrgChartConnection, i: number, arr: ArrayLike<BaseType>) => void;
  /**
   * Link generator for connections
   */
  linkGroupArc: Link<any, any, D3Node<TData>>;

  layoutBindings: LayoutBindings<TData>;
};

export type FitOptions<TData extends OrgChartDataItem = OrgChartDataItem> = {
  animate?: boolean;
  nodes?: D3Node<TData>[];
  scale?: boolean;
};

export type ExportImgOptions = { full?: boolean; scale?: number; onLoad?: (img: string) => void; save?: boolean };
