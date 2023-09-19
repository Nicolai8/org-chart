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

/**
 * This function invokes save window
 */
function saveAs(uri: string, filename: string) {
  // create link
  const link = document.createElement('a');
  document.body.appendChild(link);
  link.download = filename;
  link.href = uri;
  link.click();
  document.body.removeChild(link);
}

/**
 * This function serializes SVG and sets all necessary attributes
 */
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

  image.src = url;
};
