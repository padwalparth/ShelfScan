/**
 * BatchScan Central Application State & Reactive Store
 */

const listeners = new Set();

export const state = {
  currentRoute: window.location.hash || '#/dashboard',
  theme: localStorage.getItem('batchscan_theme') || 'dark',
  user: JSON.parse(localStorage.getItem('batchscan_user') || JSON.stringify({
    email: 'admin@batchscan.ai',
    name: 'Lead Compliance Officer',
    role: 'admin' // 'admin' | 'staff' | 'viewer'
  })),
  connection: {
    status: 'online', // 'online' | 'warning' | 'offline'
    piIp: '192.168.0.102:8000',
    model: 'Google Gemini 3.5 Flash-Lite',
    cloudConnected: true,
    lastPing: new Date()
  },
  scans: [],
  inventory: [],
  stats: {
    totalScans: 0,
    uniqueBatches: 0,
    validCount: 0,
    expiringCount: 0,
    criticalCount: 0,
    expiredCount: 0,
    accuracyRate: 100,
    valueAtRisk: 0
  },
  selectedScan: null,
  isDrawerOpen: false,
  sidebarCollapsed: localStorage.getItem('batchscan_sidebar_collapsed') === '1'
};

export function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function notify(changedKey = null) {
  listeners.forEach(cb => cb(state, changedKey));
}

export function setTheme(newTheme) {
  state.theme = newTheme;
  localStorage.setItem('batchscan_theme', newTheme);
  document.documentElement.setAttribute('data-theme', newTheme);
  notify('theme');
}

export function toggleSidebar() {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  localStorage.setItem('batchscan_sidebar_collapsed', state.sidebarCollapsed ? '1' : '0');
  notify('sidebar');
}

export function setUserRole(role) {
  if (['admin', 'staff', 'viewer'].includes(role)) {
    state.user.role = role;
    localStorage.setItem('batchscan_user', JSON.stringify(state.user));
    notify('user');
  }
}

export function openDrawer(scan) {
  state.selectedScan = scan;
  state.isDrawerOpen = true;
  notify('drawer');
}

export function closeDrawer() {
  state.isDrawerOpen = false;
  state.selectedScan = null;
  notify('drawer');
}

