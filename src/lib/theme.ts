// Colour maths for the theme. Everything is derived from site.yaml → colors, so any team's
// palette gets readable text and a matching background pattern without extra settings.

type RGB = [number, number, number];

function parseHex(hex: string): RGB {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

const toHex = (rgb: RGB) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** Mix two colours: t = 0 gives `a`, t = 1 gives `b`. */
export const mix = (a: string, b: string, t: number) => {
  const [x, y] = [parseHex(a), parseHex(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * t) as RGB);
};

/** WCAG relative luminance. */
function luminance(hex: string) {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Black or white, whichever reads better on `background`. */
export const textOn = (background: string) => (contrast(background, '#ffffff') >= contrast(background, '#111111') ? '#ffffff' : '#111111');

/** CSS custom properties for the site's palette (consumed by src/styles/global.css). */
export function themeCss(colors: { primary: string; accent: string }) {
  const { primary, accent } = colors;
  return `:root{--color-primary:${primary};--color-accent:${accent};--on-primary:${textOn(primary)};--on-accent:${textOn(accent)};--color-tint:${mix(primary, '#ffffff', 0.9)};--color-primary-dark:${mix(primary, '#000000', 0.25)};}`;
}
