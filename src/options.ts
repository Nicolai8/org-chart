import { d3 } from './constants';
import { D3Node, OrgChartConnection, OrgChartDataItem, OrgChartOptions } from './types';
import { BaseType } from 'd3-selection';
import { getTextWidth } from './utils/core';
import { diagonal, hdiagonal } from './utils/calculations';

const canvasContext = document.createElement('canvas').getContext('2d');

export const getChartOptions = <TData extends OrgChartDataItem = OrgChartDataItem>(): OrgChartOptions<TData> => ({
  svgWidth: 800,
  svgHeight: window.innerHeight - 100,
  container: document.body,

  nodeIdKey: 'id',
  parentNodeIdKey: 'parentId',
  data: null,
  onDataChange: () => {},
  connections: [],

  rootMargin: 40,
  neighbourMargin: () => 80,
  siblingsMargin: () => 20,
  childrenMargin: () => 60,
  linkYOffset: 30,

  expandLevel: 1,
  defaultFont: 'Helvetica',
  duration: 400,
  imageName: 'Chart',
  setActiveNodeCentered: true,
  layout: 'top',

  compact: true,
  compactNoChildren: false,
  compactNoChildrenMargin: 15,
  compactToggleButtonMargin: 10,
  compactMarginPair: () => 100,
  compactMarginBetween: () => 20,
  compactNoChildrenUpdate: function (compactGroupRect) {
    compactGroupRect.attr('fill', '#fff').attr('rx', 10).attr('stroke', '#e4e2e9').attr('stroke-width', 1);
  },
  compactCollapsedContent: (d) =>
    `<div style="height: 100%;display:flex;align-items:center;justify-content:center;">${d.data._directSubordinates}</div>`,
  compactCollapsedNodeWidth: function (d) {
    return this.nodeWidth(d);
  },
  compactCollapsedNodeHeight: function (d) {
    return this.nodeHeight(d);
  },

  scaleExtent: [0.001, 20],
  onZoomStart: () => {},
  onZoom: () => {},
  onZoomEnd: () => {},
  enableDoubleClickZoom: false,
  enableWheelZoom: true,

  nodeWidth: (_) => 250,
  nodeHeight: (_) => 150,
  onNodeClick: (d) => d,
  nodeContent: (d) => `<div style="padding:5px;font-size:10px;">Sample Node(id=${d.id}), override using <br/> 
            <code>chart.nodeContent({data}=>{ <br/>
             &nbsp;&nbsp;&nbsp;&nbsp;return '' // Custom HTML <br/>
             })</code>
             <br/> 
             Or check different <a href="https://github.com/bumbeishvili/org-chart#jump-to-examples" target="_blank">layout examples</a>
             </div>`,
  nodeUpdate: function (d) {
    d3.select<BaseType, D3Node<TData>>(this)
      .select('.node-rect')
      .attr('stroke', (d) => (d.data._highlighted || d.data._upToTheRootHighlighted ? '#E27396' : 'none'))
      .attr('stroke-width', d.data._highlighted || d.data._upToTheRootHighlighted ? 10 : 1);
  },

  dragNDrop: true,
  onNodeDrop: () => true,
  isNodeDraggable: () => true,
  isNodeDroppable: () => true,

  isNodeButtonVisible: ({ data }) => {
    return !!data._directSubordinates && data._directSubordinates > 0;
  },
  nodeButtonWidth: () => 40,
  nodeButtonHeight: () => 40,
  nodeButtonX: () => -20,
  nodeButtonY: () => -20,
  buttonContent: ({ node, state }) => {
    const icons = {
      left: (d?: Array<D3Node<TData>> | null) =>
        d
          ? `<div style="display:flex;"><span style="align-items:center;display:flex;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.283 3.50094L6.51 11.4749C6.37348 11.615 6.29707 11.8029 6.29707 11.9984C6.29707 12.194 6.37348 12.3819 6.51 12.5219L14.283 20.4989C14.3466 20.5643 14.4226 20.6162 14.5066 20.6516C14.5906 20.6871 14.6808 20.7053 14.772 20.7053C14.8632 20.7053 14.9534 20.6871 15.0374 20.6516C15.1214 20.6162 15.1974 20.5643 15.261 20.4989C15.3918 20.365 15.4651 20.1852 15.4651 19.9979C15.4651 19.8107 15.3918 19.6309 15.261 19.4969L7.9515 11.9984L15.261 4.50144C15.3914 4.36756 15.4643 4.18807 15.4643 4.00119C15.4643 3.81431 15.3914 3.63482 15.261 3.50094C15.1974 3.43563 15.1214 3.38371 15.0374 3.34827C14.9534 3.31282 14.8632 3.29456 14.772 3.29456C14.6808 3.29456 14.5906 3.31282 14.5066 3.34827C14.4226 3.38371 14.3466 3.43563 14.283 3.50094V3.50094Z" fill="#716E7B" stroke="#716E7B"/>
                      </svg></span><span style="color:#716E7B">${node.data._directSubordinates}</span></div>`
          : `<div style="display:flex;"><span style="align-items:center;display:flex;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M7.989 3.49944C7.85817 3.63339 7.78492 3.8132 7.78492 4.00044C7.78492 4.18768 7.85817 4.36749 7.989 4.50144L15.2985 11.9999L7.989 19.4969C7.85817 19.6309 7.78492 19.8107 7.78492 19.9979C7.78492 20.1852 7.85817 20.365 7.989 20.4989C8.05259 20.5643 8.12863 20.6162 8.21261 20.6516C8.2966 20.6871 8.38684 20.7053 8.478 20.7053C8.56916 20.7053 8.6594 20.6871 8.74338 20.6516C8.82737 20.6162 8.90341 20.5643 8.967 20.4989L16.74 12.5234C16.8765 12.3834 16.9529 12.1955 16.9529 11.9999C16.9529 11.8044 16.8765 11.6165 16.74 11.4764L8.967 3.50094C8.90341 3.43563 8.82737 3.38371 8.74338 3.34827C8.6594 3.31282 8.56916 3.29456 8.478 3.29456C8.38684 3.29456 8.2966 3.31282 8.21261 3.34827C8.12863 3.38371 8.05259 3.43563 7.989 3.50094V3.49944Z" fill="#716E7B" stroke="#716E7B"/>
                          </svg></span><span style="color:#716E7B">${node.data._directSubordinates}</span></div>`,
      bottom: (d?: Array<D3Node<TData>> | null) =>
        d
          ? `<div style="display:flex;"><span style="align-items:center;display:flex;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                       <path d="M19.497 7.98903L12 15.297L4.503 7.98903C4.36905 7.85819 4.18924 7.78495 4.002 7.78495C3.81476 7.78495 3.63495 7.85819 3.501 7.98903C3.43614 8.05257 3.38462 8.12842 3.34944 8.21213C3.31427 8.29584 3.29615 8.38573 3.29615 8.47653C3.29615 8.56733 3.31427 8.65721 3.34944 8.74092C3.38462 8.82463 3.43614 8.90048 3.501 8.96403L11.4765 16.74C11.6166 16.8765 11.8044 16.953 12 16.953C12.1956 16.953 12.3834 16.8765 12.5235 16.74L20.499 8.96553C20.5643 8.90193 20.6162 8.8259 20.6517 8.74191C20.6871 8.65792 20.7054 8.56769 20.7054 8.47653C20.7054 8.38537 20.6871 8.29513 20.6517 8.21114C20.6162 8.12715 20.5643 8.05112 20.499 7.98753C20.3651 7.85669 20.1852 7.78345 19.998 7.78345C19.8108 7.78345 19.6309 7.85669 19.497 7.98753V7.98903Z" fill="#716E7B" stroke="#716E7B"/>
                       </svg></span><span style="margin-left:1px;color:#716E7B" >${node.data._directSubordinates}</span></div>
                       `
          : `<div style="display:flex;"><span style="align-items:center;display:flex;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                       <path d="M11.457 8.07005L3.49199 16.4296C3.35903 16.569 3.28485 16.7543 3.28485 16.9471C3.28485 17.1398 3.35903 17.3251 3.49199 17.4646L3.50099 17.4736C3.56545 17.5414 3.64304 17.5954 3.72904 17.6324C3.81504 17.6693 3.90765 17.6883 4.00124 17.6883C4.09483 17.6883 4.18745 17.6693 4.27344 17.6324C4.35944 17.5954 4.43703 17.5414 4.50149 17.4736L12.0015 9.60155L19.4985 17.4736C19.563 17.5414 19.6405 17.5954 19.7265 17.6324C19.8125 17.6693 19.9052 17.6883 19.9987 17.6883C20.0923 17.6883 20.1849 17.6693 20.2709 17.6324C20.3569 17.5954 20.4345 17.5414 20.499 17.4736L20.508 17.4646C20.641 17.3251 20.7151 17.1398 20.7151 16.9471C20.7151 16.7543 20.641 16.569 20.508 16.4296L12.543 8.07005C12.4729 7.99653 12.3887 7.93801 12.2954 7.89801C12.202 7.85802 12.1015 7.8374 12 7.8374C11.8984 7.8374 11.798 7.85802 11.7046 7.89801C11.6113 7.93801 11.527 7.99653 11.457 8.07005Z" fill="#716E7B" stroke="#716E7B"/>
                       </svg></span><span style="margin-left:1px;color:#716E7B" >${node.data._directSubordinates}</span></div>
                    `,
      right: (d?: Array<D3Node<TData>> | null) =>
        d
          ? `<div style="display:flex;"><span style="align-items:center;display:flex;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                       <path d="M7.989 3.49944C7.85817 3.63339 7.78492 3.8132 7.78492 4.00044C7.78492 4.18768 7.85817 4.36749 7.989 4.50144L15.2985 11.9999L7.989 19.4969C7.85817 19.6309 7.78492 19.8107 7.78492 19.9979C7.78492 20.1852 7.85817 20.365 7.989 20.4989C8.05259 20.5643 8.12863 20.6162 8.21261 20.6516C8.2966 20.6871 8.38684 20.7053 8.478 20.7053C8.56916 20.7053 8.6594 20.6871 8.74338 20.6516C8.82737 20.6162 8.90341 20.5643 8.967 20.4989L16.74 12.5234C16.8765 12.3834 16.9529 12.1955 16.9529 11.9999C16.9529 11.8044 16.8765 11.6165 16.74 11.4764L8.967 3.50094C8.90341 3.43563 8.82737 3.38371 8.74338 3.34827C8.6594 3.31282 8.56916 3.29456 8.478 3.29456C8.38684 3.29456 8.2966 3.31282 8.21261 3.34827C8.12863 3.38371 8.05259 3.43563 7.989 3.50094V3.49944Z" fill="#716E7B" stroke="#716E7B"/>
                       </svg></span><span style="color:#716E7B">${node.data._directSubordinates}</span></div>`
          : `<div style="display:flex;"><span style="align-items:center;display:flex;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                       <path d="M14.283 3.50094L6.51 11.4749C6.37348 11.615 6.29707 11.8029 6.29707 11.9984C6.29707 12.194 6.37348 12.3819 6.51 12.5219L14.283 20.4989C14.3466 20.5643 14.4226 20.6162 14.5066 20.6516C14.5906 20.6871 14.6808 20.7053 14.772 20.7053C14.8632 20.7053 14.9534 20.6871 15.0374 20.6516C15.1214 20.6162 15.1974 20.5643 15.261 20.4989C15.3918 20.365 15.4651 20.1852 15.4651 19.9979C15.4651 19.8107 15.3918 19.6309 15.261 19.4969L7.9515 11.9984L15.261 4.50144C15.3914 4.36756 15.4643 4.18807 15.4643 4.00119C15.4643 3.81431 15.3914 3.63482 15.261 3.50094C15.1974 3.43563 15.1214 3.38371 15.0374 3.34827C14.9534 3.31282 14.8632 3.29456 14.772 3.29456C14.6808 3.29456 14.5906 3.31282 14.5066 3.34827C14.4226 3.38371 14.3466 3.43563 14.283 3.50094V3.50094Z" fill="#716E7B" stroke="#716E7B"/>
                       </svg></span><span style="color:#716E7B">${node.data._directSubordinates}</span></div>`,
      top: (d?: Array<D3Node<TData>> | null) =>
        d
          ? `<div style="display:flex;"><span style="align-items:center;display:flex;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.457 8.07005L3.49199 16.4296C3.35903 16.569 3.28485 16.7543 3.28485 16.9471C3.28485 17.1398 3.35903 17.3251 3.49199 17.4646L3.50099 17.4736C3.56545 17.5414 3.64304 17.5954 3.72904 17.6324C3.81504 17.6693 3.90765 17.6883 4.00124 17.6883C4.09483 17.6883 4.18745 17.6693 4.27344 17.6324C4.35944 17.5954 4.43703 17.5414 4.50149 17.4736L12.0015 9.60155L19.4985 17.4736C19.563 17.5414 19.6405 17.5954 19.7265 17.6324C19.8125 17.6693 19.9052 17.6883 19.9987 17.6883C20.0923 17.6883 20.1849 17.6693 20.2709 17.6324C20.3569 17.5954 20.4345 17.5414 20.499 17.4736L20.508 17.4646C20.641 17.3251 20.7151 17.1398 20.7151 16.9471C20.7151 16.7543 20.641 16.569 20.508 16.4296L12.543 8.07005C12.4729 7.99653 12.3887 7.93801 12.2954 7.89801C12.202 7.85802 12.1015 7.8374 12 7.8374C11.8984 7.8374 11.798 7.85802 11.7046 7.89801C11.6113 7.93801 11.527 7.99653 11.457 8.07005Z" fill="#716E7B" stroke="#716E7B"/>
                        </svg></span><span style="margin-left:1px;color:#716E7B">${node.data._directSubordinates}</span></div>
                        `
          : `<div style="display:flex;"><span style="align-items:center;display:flex;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.497 7.98903L12 15.297L4.503 7.98903C4.36905 7.85819 4.18924 7.78495 4.002 7.78495C3.81476 7.78495 3.63495 7.85819 3.501 7.98903C3.43614 8.05257 3.38462 8.12842 3.34944 8.21213C3.31427 8.29584 3.29615 8.38573 3.29615 8.47653C3.29615 8.56733 3.31427 8.65721 3.34944 8.74092C3.38462 8.82463 3.43614 8.90048 3.501 8.96403L11.4765 16.74C11.6166 16.8765 11.8044 16.953 12 16.953C12.1956 16.953 12.3834 16.8765 12.5235 16.74L20.499 8.96553C20.5643 8.90193 20.6162 8.8259 20.6517 8.74191C20.6871 8.65792 20.7054 8.56769 20.7054 8.47653C20.7054 8.38537 20.6871 8.29513 20.6517 8.21114C20.6162 8.12715 20.5643 8.05112 20.499 7.98753C20.3651 7.85669 20.1852 7.78345 19.998 7.78345C19.8108 7.78345 19.6309 7.85669 19.497 7.98753V7.98903Z" fill="#716E7B" stroke="#716E7B"/>
                        </svg></span><span style="margin-left:1px;color:#716E7B">${node.data._directSubordinates}</span></div>
                    `,
    };
    return `<div style="border:1px solid #E4E2E9;border-radius:3px;padding:3px;font-size:9px;margin:auto auto;background-color:white"> ${icons[
      state.layout
    ](node.children)}  </div>`;
  },

  linkUpdate: function (d) {
    d3.select<BaseType, D3Node<TData>>(this)
      .attr('stroke', (d) => (d.data._upToTheRootHighlighted ? '#E27396' : '#E4E2E9'))
      .attr('stroke-width', (d) => (d.data._upToTheRootHighlighted ? 5 : 1));

    if (d.data._upToTheRootHighlighted) {
      d3.select(this).raise();
    }
  },
  defs: function (state, visibleConnections) {
    return `<defs>
  ${visibleConnections
    .map((conn) => {
      const labelWidth = getTextWidth(conn.label, {
        ctx: canvasContext,
        fontSize: 2,
        defaultFont: state.defaultFont,
      });
      return `
     <marker id="${conn.from + '_' + conn.to}" refX="${
        conn._source.x < conn._target.x ? -7 : 7
      }" refY="5" markerWidth="500"  markerHeight="500"  orient="${
        conn._source.x < conn._target.x ? 'auto' : 'auto-start-reverse'
      }" >
     <rect rx=0.5 width=${conn.label ? labelWidth + 3 : 0} height=3 y=1  fill="#E27396"></rect>
     <text font-size="2px" x=1 fill="white" y=3>${conn.label || ''}</text>
     </marker>

     <marker id="arrow-${
       conn.from + '_' + conn.to
     }"  markerWidth="500"  markerHeight="500"  refY="2"  refX="1" orient="${
        conn._source.x < conn._target.x ? 'auto' : 'auto-start-reverse'
      }" >
     <path transform="translate(0)" d='M0,0 V4 L2,2 Z' fill='#E27396' />
     </marker>
  `;
    })
    .join('')}
  </defs>
  `;
  },
  connectionsUpdate: function () {
    d3.select<BaseType, OrgChartConnection>(this)
      .attr('stroke', () => '#E27396')
      .attr('stroke-linecap', 'round')
      .attr('stroke-width', () => '5')
      .attr('pointer-events', 'none')
      .attr('marker-start', (d) => `url(#${d.from + '_' + d.to})`)
      .attr('marker-end', (d) => `url(#arrow-${d.from + '_' + d.to})`);
  },
  linkGroupArc: d3
    .linkHorizontal<any, D3Node<TData>>()
    .x((d: D3Node<TData>) => d.x)
    .y((d: D3Node<TData>) => d.y),

  layoutBindings: {
    left: {
      nodeLeftX: () => 0,
      nodeRightX: (node) => node.width,
      nodeTopY: (node) => -node.height / 2,
      nodeBottomY: (node) => node.height / 2,
      nodeJoinX: (node) => node.x + node.width,
      nodeJoinY: (node) => node.y - node.height / 2,
      linkJoinX: (node) => node.x + node.width,
      linkJoinY: (node) => node.y,
      linkX: (node) => node.x,
      linkY: (node) => node.y,
      linkCompactXStart: (node) => node.x + node.width / 2,
      linkCompactYStart: (node) => node.y + (node.compactEven ? node.height / 2 : -node.height / 2),
      compactLinkMidX: (node) => node.firstCompactNode?.x ?? 0,
      compactLinkMidY: (node, state) =>
        (node.firstCompactNode?.y ?? 0) +
        (node.firstCompactNode?.flexCompactDim![0] ?? 0) / 4 +
        state.compactMarginPair(node) / 4,
      linkParentX: (node) => (node.parent?.x ?? 0) + (node.parent?.width ?? 0),
      linkParentY: (node) => node.parent?.y ?? 0,
      buttonX: (node) => node.width,
      buttonY: (node) => node.height / 2,
      centerTransform: ({ rootMargin, centerY, scale }) => `translate(${rootMargin},${centerY}) scale(${scale})`,
      compactDimension: {
        sizeColumn: (node) => node.height,
        sizeRow: (node) => node.width,
        reverse: (arr) => arr.slice().reverse(),
      },
      nodeFlexSize: ({ height, width, siblingsMargin, childrenMargin, state, node }) => {
        if (state.compact && node.flexCompactDim) {
          return [node.flexCompactDim[0], node.flexCompactDim[1]];
        }
        return [height + siblingsMargin, width + childrenMargin];
      },
      zoomTransform: ({ centerY, scale }) => `translate(${0},${centerY}) scale(${scale})`,
      diagonal: hdiagonal.bind(this),
      swap: (d) => {
        const x = d.x;
        d.x = d.y;
        d.y = x;
      },
      nodeUpdateTransform: ({ x, y, height }) => `translate(${x},${y - height / 2})`,
    },
    top: {
      nodeLeftX: (node) => -node.width / 2,
      nodeRightX: (node) => node.width / 2,
      nodeTopY: () => 0,
      nodeBottomY: (node) => node.height,
      nodeJoinX: (node) => node.x - node.width / 2,
      nodeJoinY: (node) => node.y + node.height,
      linkJoinX: (node) => node.x,
      linkJoinY: (node) => node.y + node.height,
      linkCompactXStart: (node) => node.x + (node.compactEven ? node.width / 2 : -node.width / 2),
      linkCompactYStart: (node) => node.y + node.height / 2,
      compactLinkMidX: (node, state) =>
        (node.firstCompactNode?.x ?? 0) +
        (node.firstCompactNode?.flexCompactDim![0] ?? 0) / 4 +
        state.compactMarginPair(node) / 4,
      compactLinkMidY: (node) => node.firstCompactNode?.y ?? 0,
      compactDimension: {
        sizeColumn: (node) => node.width,
        sizeRow: (node) => node.height,
        reverse: (arr) => arr,
      },
      linkX: (node) => node.x,
      linkY: (node) => node.y,
      linkParentX: (node) => node.parent?.x ?? 0,
      linkParentY: (node) => (node.parent?.y ?? 0) + (node.parent?.height ?? 0),
      buttonX: (node) => node.width / 2,
      buttonY: (node) => node.height,
      centerTransform: ({ rootMargin, scale, centerX }) => `translate(${centerX},${rootMargin}) scale(${scale})`,
      nodeFlexSize: ({ height, width, siblingsMargin, childrenMargin, state, node }) => {
        if (state.compact && node.flexCompactDim) {
          return [node.flexCompactDim[0], node.flexCompactDim[1]];
        }
        return [width + siblingsMargin, height + childrenMargin];
      },
      zoomTransform: ({ centerX, scale }) => `translate(${centerX},0}) scale(${scale})`,
      diagonal: diagonal.bind(this),
      swap: () => {},
      nodeUpdateTransform: ({ x, y, width }) => `translate(${x - width / 2},${y})`,
    },
    bottom: {
      nodeLeftX: (node) => -node.width / 2,
      nodeRightX: (node) => node.width / 2,
      nodeTopY: (node) => -node.height,
      nodeBottomY: () => 0,
      nodeJoinX: (node) => node.x - node.width / 2,
      nodeJoinY: (node) => node.y - node.height - node.height,
      linkJoinX: (node) => node.x,
      linkJoinY: (node) => node.y - node.height,
      linkCompactXStart: (node) => node.x + (node.compactEven ? node.width / 2 : -node.width / 2),
      linkCompactYStart: (node) => node.y - node.height / 2,
      compactLinkMidX: (node, state) =>
        (node.firstCompactNode?.x ?? 0) +
        (node.firstCompactNode?.flexCompactDim![0] ?? 0) / 4 +
        state.compactMarginPair(node) / 4,
      compactLinkMidY: (node) => node.firstCompactNode?.y ?? 0,
      linkX: (node) => node.x,
      linkY: (node) => node.y,
      compactDimension: {
        sizeColumn: (node) => node.width,
        sizeRow: (node) => node.height,
        reverse: (arr) => arr,
      },
      linkParentX: (node) => node.parent?.x ?? 0,
      linkParentY: (node) => (node.parent?.y ?? 0) - (node.parent?.height ?? 0),
      buttonX: (node) => node.width / 2,
      buttonY: () => 0,
      centerTransform: ({ rootMargin, scale, centerX, chartHeight }) =>
        `translate(${centerX},${chartHeight - rootMargin}) scale(${scale})`,
      nodeFlexSize: ({ height, width, siblingsMargin, childrenMargin, state, node }) => {
        if (state.compact && node.flexCompactDim) {
          return [node.flexCompactDim[0], node.flexCompactDim[1]];
        }
        return [width + siblingsMargin, height + childrenMargin];
      },
      zoomTransform: ({ centerX, scale }) => `translate(${centerX},0}) scale(${scale})`,
      diagonal: diagonal.bind(this),
      swap: (d) => {
        d.y = -d.y;
      },
      nodeUpdateTransform: ({ x, y, width, height }) => `translate(${x - width / 2},${y - height})`,
    },
    right: {
      nodeLeftX: (node) => -node.width,
      nodeRightX: () => 0,
      nodeTopY: (node) => -node.height / 2,
      nodeBottomY: (node) => node.height / 2,
      nodeJoinX: (node) => node.x - node.width - node.width,
      nodeJoinY: (node) => node.y - node.height / 2,
      linkJoinX: (node) => node.x - node.width,
      linkJoinY: (node) => node.y,
      linkX: (node) => node.x,
      linkY: (node) => node.y,
      linkParentX: (node) => (node.parent?.x ?? 0) - (node.parent?.width ?? 0),
      linkParentY: (node) => node.parent?.y ?? 0,
      buttonX: () => 0,
      buttonY: (node) => node.height / 2,
      linkCompactXStart: (node) => node.x - node.width / 2,
      linkCompactYStart: (node) => node.y + (node.compactEven ? node.height / 2 : -node.height / 2),
      compactLinkMidX: (node) => node.firstCompactNode?.x ?? 0,
      compactLinkMidY: (node, state) =>
        (node.firstCompactNode?.y ?? 0) +
        (node.firstCompactNode?.flexCompactDim![0] ?? 0) / 4 +
        state.compactMarginPair(node) / 4,
      centerTransform: ({ rootMargin, centerY, scale, chartWidth }) =>
        `translate(${chartWidth - rootMargin},${centerY}) scale(${scale})`,
      nodeFlexSize: ({ height, width, siblingsMargin, childrenMargin, state, node }) => {
        if (state.compact && node.flexCompactDim) {
          return [node.flexCompactDim[0], node.flexCompactDim[1]];
        }
        return [height + siblingsMargin, width + childrenMargin];
      },
      compactDimension: {
        sizeColumn: (node) => node.height,
        sizeRow: (node) => node.width,
        reverse: (arr) => arr.slice().reverse(),
      },
      zoomTransform: ({ centerY, scale }) => `translate(${0},${centerY}) scale(${scale})`,
      diagonal: hdiagonal.bind(this),
      swap: (d) => {
        const x = d.x;
        d.x = -d.y;
        d.y = x;
      },
      nodeUpdateTransform: ({ x, y, width, height }) => `translate(${x - width},${y - height / 2})`,
    },
  },
});
