// Internal links must carry the GitHub Pages base path (SPEC constraint 3).
// Always build them with url(), never with a hard-coded "/...".

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');

/** url('about/') → "/team-site-template/about/" (or "/about/" for a root site). */
export const url = (path = '') => BASE + path.replace(/^\/+/, '');

/** True when `pathname` is the page `path` points to (ignores a missing trailing slash). */
export const isCurrent = (pathname: string, path: string) =>
  pathname.replace(/\/?$/, '/') === url(path).replace(/\/?$/, '/');
