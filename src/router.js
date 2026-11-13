/**
 * BatchScan Client-Side Hash Router
 */

import { state, notify } from './state.js';

const routes = {};

export function registerRoute(path, componentHandler) {
  routes[path] = componentHandler;
}

export function navigate(path) {
  window.location.hash = path;
}

export function initRouter(mountContainer) {
  async function handleRouteChange() {
    const hash = window.location.hash || '#/dashboard';
    const cleanPath = hash.split('?')[0];
    state.currentRoute = cleanPath;

    // Default route fallback
    const handler = routes[cleanPath] || routes['#/dashboard'];

    if (handler) {
      mountContainer.innerHTML = '';
      const pageEl = await handler();
      if (pageEl) mountContainer.appendChild(pageEl);
      window.scrollTo(0, 0);
    }

    notify('route');
  }

  window.addEventListener('hashchange', handleRouteChange);
  handleRouteChange();
}

