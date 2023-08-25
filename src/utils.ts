import { Coords } from 'types';

export const groupBy = <T>(
  array: Array<T>,
  accessor: (item: T) => number,
  aggregator: (item: T[]) => number,
): [number, number][] => {
  const grouped: Record<number, T[]> = {};
  array.forEach((item) => {
    const key = accessor(item);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });

  const result: Record<number, number> = {};
  (Object.keys(grouped) as unknown as number[]).forEach((key) => {
    result[key] = aggregator(grouped[key]);
  });
  return Object.entries(result) as unknown as [number, number][];
};

// This function detects whether current browser is edge
export const isEdge = () => {
  return window.navigator.userAgent.includes('Edge');
};

export const toDataURL = (url: string, callback: (result: string) => void) => {
  const xhr = new XMLHttpRequest();
  xhr.onload = function () {
    const reader = new FileReader();
    reader.onloadend = function () {
      callback((reader.result || '') as string);
    };
    reader.readAsDataURL(xhr.response);
  };
  xhr.open('GET', url);
  xhr.responseType = 'blob';
  xhr.send();
};

export const downloadImage = (options: {
  node: SVGElement;
  scale?: number;
  imageName?: string;
  isSvg?: boolean;
  save?: boolean;
  onAlreadySerialized?: () => void;
  onLoad?: (url: string) => void;
}) => {
  const { node, scale = 2, imageName = 'graph', isSvg = false, save = true, onAlreadySerialized, onLoad } = options;

  // Retrieve svg node
  const svgNode = node;

  if (isSvg) {
    let source = serializeString(svgNode);
    //add xml declaration
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    //convert svg source to URI data scheme.
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
    saveAs(url, imageName + '.svg');
    onAlreadySerialized?.();
    return;
  }
  // Get image quality index (basically,  index you can zoom in)
  const quality = scale;
  // Create image
  const image = document.createElement('img');
  image.onload = function () {
    // Create image canvas
    const canvas = document.createElement('canvas');
    // Set width and height based on SVG node
    const rect = svgNode.getBoundingClientRect();
    canvas.width = rect.width * quality;
    canvas.height = rect.height * quality;
    // Draw background
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#FAFAFA';
    context.fillRect(0, 0, rect.width * quality, rect.height * quality);
    context.drawImage(image, 0, 0, rect.width * quality, rect.height * quality);
    // Set some image metadata
    let dt = canvas.toDataURL('image/png');

    onLoad?.(dt);
    if (save) {
      saveAs(dt, imageName + '.png');
    }
  };

  const url = 'data:image/svg+xml; charset=utf8, ' + encodeURIComponent(serializeString(svgNode));

  onAlreadySerialized?.();

  image.src = url; // URL.createObjectURL(blob);
  // This function invokes save window

  function saveAs(uri: string, filename: string) {
    // create link
    const link = document.createElement('a');
    document.body.appendChild(link);
    link.download = filename;
    link.href = uri;
    link.click();
    document.body.removeChild(link);
  }
  // This function serializes SVG and sets all necessary attributes

  function serializeString(svg: SVGElement) {
    const xmlns = 'http://www.w3.org/2000/xmlns/';
    const xlinkns = 'http://www.w3.org/1999/xlink';
    const svgns = 'http://www.w3.org/2000/svg';
    svg = svg.cloneNode(true) as SVGElement;
    const fragment = window.location.href + '#';
    const walker = document.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT, null);
    while (walker.nextNode()) {
      for (const attr of (walker.currentNode as HTMLElement).attributes) {
        if (attr.value.includes(fragment)) {
          attr.value = attr.value.replace(fragment, '#');
        }
      }
    }
    svg.setAttributeNS(xmlns, 'xmlns', svgns);
    svg.setAttributeNS(xmlns, 'xmlns:xlink', xlinkns);
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svg);
  }
};

export const createRandomString = () => Math.random().toString(36).substring(2, 15);

type GetTextWidthOptions = {
  fontSize?: number;
  fontWeight?: number;
  defaultFont?: string;
  ctx: CanvasRenderingContext2D | null;
};

// Calculate what size text will take
export const getTextWidth = (text: string, options: GetTextWidthOptions) => {
  const { fontSize = 14, fontWeight = 400, defaultFont = 'Helvetica', ctx } = options;

  if (!ctx) {
    return 0;
  }

  ctx.font = `${fontWeight || ''} ${fontSize}px ${defaultFont} `;
  const measurement = ctx.measureText(text);
  return measurement.width;
};

/* Horizontal diagonal generation algorithm - https://observablehq.com/@bumbeishvili/curved-edges-compact-horizontal */
export const hdiagonal = function (s: Coords, t: Coords, m: Coords): string {
  // Define source and target x,y coordinates
  const x = s.x;
  const y = s.y;
  const ex = t.x;
  const ey = t.y;

  let mx = (m && m.x) || x;
  let my = (m && m.y) || y;

  // Values in case of top reversed and left reversed diagonals
  let xrvs = ex - x < 0 ? -1 : 1;
  let yrvs = ey - y < 0 ? -1 : 1;

  // Define preferred curve radius
  let rdef = 35;

  // Reduce curve radius, if source-target x space is smaller
  let r = Math.abs(ex - x) / 2 < rdef ? Math.abs(ex - x) / 2 : rdef;

  // Further reduce curve radius, is y space is more small
  r = Math.abs(ey - y) / 2 < r ? Math.abs(ey - y) / 2 : r;

  // Define width and height of link, excluding radius
  let w = Math.abs(ex - x) / 2 - r;

  // Build and return custom arc command
  return `
  M ${mx} ${my}
  L ${mx} ${y}
  L ${x} ${y}
  L ${x + w * xrvs} ${y}
  C ${x + w * xrvs + r * xrvs} ${y} 
    ${x + w * xrvs + r * xrvs} ${y} 
    ${x + w * xrvs + r * xrvs} ${y + r * yrvs}
  L ${x + w * xrvs + r * xrvs} ${ey - r * yrvs} 
  C ${x + w * xrvs + r * xrvs}  ${ey} 
    ${x + w * xrvs + r * xrvs}  ${ey} 
    ${ex - w * xrvs}  ${ey}
  L ${ex} ${ey}
               `;
};

/* Vertical diagonal generation algorithm - https://observablehq.com/@bumbeishvili/curved-edges-compacty-vertical */
export const diagonal = function (s: Coords, t: Coords, m: Coords, offsets?: { sy: number }): string {
  const x = s.x;
  let y = s.y;

  const ex = t.x;
  const ey = t.y;

  let mx = (m && m.x) || x;
  let my = (m && m.y) || y;

  let xrvs = ex - x < 0 ? -1 : 1;
  let yrvs = ey - y < 0 ? -1 : 1;

  y += offsets?.sy ?? 0;

  let rdef = 35;
  let r = Math.abs(ex - x) / 2 < rdef ? Math.abs(ex - x) / 2 : rdef;

  r = Math.abs(ey - y) / 2 < r ? Math.abs(ey - y) / 2 : r;

  let h = Math.abs(ey - y) / 2 - r;
  let w = Math.abs(ex - x) - r * 2;

  return `
M ${mx} ${my}
L ${x} ${my}
L ${x} ${y}
L ${x} ${y + h * yrvs}
C  ${x} ${y + h * yrvs + r * yrvs} ${x} ${y + h * yrvs + r * yrvs} ${x + r * xrvs} ${y + h * yrvs + r * yrvs}
L ${x + w * xrvs + r * xrvs} ${y + h * yrvs + r * yrvs}
C  ${ex}  ${y + h * yrvs + r * yrvs} ${ex}  ${y + h * yrvs + r * yrvs} ${ex} ${ey - h * yrvs}
L ${ex} ${ey}
`;
};

export const getNumber = (value: number | undefined, fallback: number = 0) => {
  return value ?? fallback;
};
