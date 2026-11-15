/**
 * Hash router. The site is plain static files (GitHub Pages), so pages live
 * behind the # in the URL: `/#/submit`, `/#/admin`. That needs no server
 * rewrites and survives a refresh.
 */
const read = () => location.hash.replace(/^#\/?/, '').split('?')[0];

class Router {
  /** Current route path without the leading "#/": '' is the home page. */
  path = $state(read());

  constructor() {
    window.addEventListener('hashchange', () => {
      this.path = read();
      window.scrollTo(0, 0);
    });
  }

  go(path) {
    location.hash = `#/${path}`;
  }
}

export const router = new Router();

/** The href for a route, for use in links. */
export const href = (path) => `#/${path}`;
