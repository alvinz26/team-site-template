// Browser-tab icon generated from the team's colours and short name (used when there is no logo).
import type { APIRoute } from 'astro';
import { getSite } from '../lib/content';
import { textOn } from '../lib/theme';

export const GET: APIRoute = async () => {
  const site = await getSite();
  const letters = site.shortName.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 3).toUpperCase() || '•';
  const size = { 1: 40, 2: 30, 3: 22 }[letters.length] ?? 22;
  const { primary } = site.colors;
  const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="${primary}"/>
  <text x="32" y="33" text-anchor="middle" dominant-baseline="central" font-family="Georgia, 'Times New Roman', serif" font-size="${size}" letter-spacing="1" fill="${textOn(primary)}">${escape(letters)}</text>
</svg>
`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
