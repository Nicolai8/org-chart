import { Coords } from '../types';

/* Horizontal diagonal generation algorithm - https://observablehq.com/@bumbeishvili/curved-edges-compact-horizontal */
export const hdiagonal = function (s: Coords, t: Coords, m?: Coords, offsets?: { sy: number }): string {
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
export const diagonal = function (s: Coords, t: Coords, m?: Coords, offsets?: { sy: number }): string {
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
