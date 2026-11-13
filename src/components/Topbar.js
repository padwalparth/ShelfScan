/**
 * BatchScan Topbar Component
 * Global Search · Connection Status Dot with Tooltip · Theme Toggle · Role Profile
 */

import { state, setTheme, setUserRole } from '../state.js';
import { iconHtml, renderIcons } from '../utils/icons.js';

export function createTopbar() {
  const topbar = document.createElement('header');
  topbar.className = 'app-topbar';

  function renderContent() {
    const isDark = state.theme === 'dark';
    const alertCount = (state.stats.criticalCount || 0) + (state.stats.expiredCount || 0);

    topbar.innerHTML = `
      <div class="topbar-left">
        <button type="button" class="mobile-menu-btn" id="mobileMenuToggle" title="Open Menu">
          ${iconHtml('menu', 20)}
        </button>

        <div class="global-search-wrapper">
          <span class="global-search-icon">${iconHtml('search', 16)}</span>
          <input type="text" class="global-search-input" id="globalSearchInput" placeholder="Search batch number, product, GTIN..." autocomplete="off" />
          <span class="search-kbd">Ctrl K</span>
        </div>
      </div>

      <div class="topbar-right">
        <!-- Live Connection Status Dot with Tooltip -->
        <div class="status-dot-container" id="statusDotContainer" tabindex="0">
          <span class="status-dot ${state.connection.status}"></span>
          <span class="status-dot-text">System Live</span>

          <div class="status-tooltip">
            <div class="tooltip-row">
              <span>AI Vision Engine</span>
              <span>Online (Gemini Flash)</span>
            </div>
            <div class="tooltip-row">
              <span>Raspberry Pi Node</span>
              <span>${window.location.host || '10.67.245.3:8000'}</span>
            </div>
            <div class="tooltip-row">
              <span>Supabase Cloud DB</span>
              <span>PostgreSQL Active</span>
            </div>
            <div class="tooltip-row">
              <span>Active Role</span>
              <span style="text-transform: uppercase; color: var(--accent-teal); font-weight: bold;">${state.user.role}</span>
            </div>
          </div>
        </div>

        <!-- Notification Bell -->
        <button type="button" class="topbar-btn" id="topbarBellBtn" title="Alert Notifications" onclick="window.location.hash='#/alerts'">
          ${iconHtml('bell', 18)}
          ${alertCount > 0 ? `<span class="btn-badge">${alertCount}</span>` : ''}
        </button>

        <!-- Theme Toggle -->
        <button type="button" class="topbar-btn" id="topbarThemeBtn" title="Toggle Light/Dark Theme">
          ${iconHtml(isDark ? 'sun' : 'moon', 18)}
        </button>

        <!-- Role & User Profile Switcher -->
        <div style="position: relative;">
          <button type="button" class="topbar-btn" id="topbarUserBtn" title="Switch Role / Profile" style="width: auto; padding: 0 10px; gap: 6px;">
            <div class="user-avatar" style="width: 24px; height: 24px; font-size: 10px;">${state.user.name[0]}</div>
            <span style="font-size: 12px; font-weight: 600; text-transform: uppercase;">${state.user.role}</span>
          </button>
        </div>
      </div>
    `;

    renderIcons(topbar);

    // Theme toggle event
    const themeBtn = topbar.querySelector('#topbarThemeBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        setTheme(state.theme === 'dark' ? 'light' : 'dark');
        renderContent();
      });
    }

    // Role switcher toggle
    const userBtn = topbar.querySelector('#topbarUserBtn');
    if (userBtn) {
      userBtn.addEventListener('click', () => {
        const nextRole = state.user.role === 'admin' ? 'staff' : (state.user.role === 'staff' ? 'viewer' : 'admin');
        setUserRole(nextRole);
        renderContent();
      });
    }

    // Mobile menu toggle
    const mobileBtn = topbar.querySelector('#mobileMenuToggle');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
        const sidebar = document.getElementById('appSidebar');
        if (sidebar) sidebar.classList.toggle('mobile-open');
      });
    }

    // Global search keyboard shortcut
    const searchInput = topbar.querySelector('#globalSearchInput');
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInput?.focus();
      }
    });

    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const q = searchInput.value.trim();
          if (q) window.location.hash = `#/history?search=${encodeURIComponent(q)}`;
        }
      });
    }
  }

  renderContent();
  return { element: topbar, update: renderContent };
}

