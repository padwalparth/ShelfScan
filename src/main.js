/**
 * BatchScan Production Application Bootstrap
 * Linear / Vercel / Stripe Design Architecture · Clean Component Structure
 */

import './styles/tokens.css';
import './styles/themes.css';
import './styles/layout.css';
import './styles/components.css';

import { state, subscribe, setTheme } from './state.js';
import { registerRoute, initRouter } from './router.js';
import { createSidebar } from './components/Sidebar.js';
import { createTopbar } from './components/Topbar.js';
import { createDetailDrawer } from './components/DetailDrawer.js';
import { renderIcons } from './utils/icons.js';

import { createDashboardPage } from './pages/DashboardPage.js';
import { createScanPage } from './pages/ScanPage.js';
import { createHistoryPage } from './pages/HistoryPage.js';
import { createInventoryPage } from './pages/InventoryPage.js';
import { createAlertsPage } from './pages/AlertsPage.js';
import { createReportsPage } from './pages/ReportsPage.js';
import { createSettingsPage } from './pages/SettingsPage.js';
import { createLoginPage } from './pages/LoginPage.js';

function bootstrap() {
  // Apply saved theme (dark default)
  document.documentElement.setAttribute('data-theme', state.theme);

  const root = document.getElementById('app');
  if (!root) return;

  root.innerHTML = '';

  // 1. Sidebar Component
  const sidebarComp = createSidebar();
  root.appendChild(sidebarComp.element);

  // 2. Main Wrapper
  const mainWrapper = document.createElement('div');
  mainWrapper.className = 'app-main';

  // 3. Topbar Component
  const topbarComp = createTopbar();
  mainWrapper.appendChild(topbarComp.element);

  // 4. Viewport Content Container
  const contentContainer = document.createElement('main');
  contentContainer.className = 'app-content';
  mainWrapper.appendChild(contentContainer);

  root.appendChild(mainWrapper);

  // 5. Slide-Out Detail Drawer
  const drawerComp = createDetailDrawer(() => {
    // on refresh callback
    window.dispatchEvent(new CustomEvent('hashchange'));
  });
  document.body.appendChild(drawerComp.backdrop);
  document.body.appendChild(drawerComp.drawer);

  // 6. Register Routes
  registerRoute('#/dashboard', createDashboardPage);
  registerRoute('#/scan', createScanPage);
  registerRoute('#/history', createHistoryPage);
  registerRoute('#/inventory', createInventoryPage);
  registerRoute('#/alerts', createAlertsPage);
  registerRoute('#/reports', createReportsPage);
  registerRoute('#/settings', createSettingsPage);
  registerRoute('#/login', createLoginPage);

  // 7. Subscribe to state updates
  subscribe((currentState, changedKey) => {
    if (changedKey === 'route' || changedKey === 'sidebar' || changedKey === 'stats') {
      sidebarComp.update();
    }
    if (changedKey === 'theme' || changedKey === 'user' || changedKey === 'stats') {
      topbarComp.update();
    }
    if (changedKey === 'drawer') {
      drawerComp.update();
    }
  });

  // 8. Initialize Router
  initRouter(contentContainer);

  renderIcons(document.body);
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

