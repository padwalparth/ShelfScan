/**
 * BatchScan Sidebar Navigation Component
 * Strictly Lucide Icons Only (Zero emojis) · Collapsible
 */

import { state, toggleSidebar } from '../state.js';
import { iconHtml, renderIcons } from '../utils/icons.js';

export function createSidebar() {
  const sidebar = document.createElement('aside');
  sidebar.className = `app-sidebar ${state.sidebarCollapsed ? 'collapsed' : ''}`;
  sidebar.id = 'appSidebar';

  const navItems = [
    { route: '#/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { route: '#/scan', label: 'Scan', icon: 'scan-line' },
    { route: '#/history', label: 'Scan History', icon: 'history' },
    { route: '#/inventory', label: 'Inventory', icon: 'boxes' },
    { route: '#/alerts', label: 'Alerts', icon: 'alert-triangle', badge: state.stats.criticalCount || 0 },
    { route: '#/reports', label: 'Reports', icon: 'file-spreadsheet' },
    { route: '#/settings', label: 'Settings', icon: 'settings' }
  ];

  function renderContent() {
    const current = state.currentRoute;
    const criticalCount = state.stats.criticalCount || 0;

    sidebar.innerHTML = `
      <div class="sidebar-header">
        <a href="#/dashboard" class="sidebar-brand">
          <div class="brand-icon-box">
            ${iconHtml('scan-line', 20)}
          </div>
          <div class="brand-text">
            <span class="brand-name">BatchScan</span>
            <span class="brand-badge">Intelligence</span>
          </div>
        </a>
        <button type="button" class="sidebar-collapse-btn" id="sidebarCollapseBtn" title="Toggle Sidebar">
          ${iconHtml(state.sidebarCollapsed ? 'chevron-right' : 'chevron-left', 18)}
        </button>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-title">Navigation</div>
        ${navItems.map(item => {
          const isActive = current === item.route;
          const showBadge = item.badge && item.badge > 0;
          return `
            <a href="${item.route}" class="nav-link ${isActive ? 'active' : ''}" title="${item.label}">
              <span class="nav-link-icon">${iconHtml(item.icon, 18)}</span>
              <span class="nav-text">${item.label}</span>
              ${showBadge ? `<span class="nav-badge">${item.badge}</span>` : ''}
            </a>
          `;
        }).join('')}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar">${(state.user.name || 'U')[0]}</div>
          <div class="user-details">
            <span class="user-name">${state.user.name}</span>
            <span class="user-role-badge">${state.user.role}</span>
          </div>
        </div>
      </div>
    `;

    renderIcons(sidebar);

    const collapseBtn = sidebar.querySelector('#sidebarCollapseBtn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        toggleSidebar();
        sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
        renderContent();
      });
    }
  }

  renderContent();
  return { element: sidebar, update: renderContent };
}

