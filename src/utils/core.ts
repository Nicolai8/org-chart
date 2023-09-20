/**
 * This function detects whether current browser is edge
 */
export const isEdge = () => {
  return window.navigator.userAgent.includes('Edge');
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

export const getNumber = (value: number | undefined, fallback: number = 0) => {
  return value ?? fallback;
};
