/**
 * BatchScan Supabase Auth Login Screen
 * Supports Email/Password & Instant Role Switching (Admin, Staff, Viewer)
 */

import { state, setUserRole, notify } from '../state.js';
import { iconHtml, renderIcons } from '../utils/icons.js';
import { showToast } from '../components/Toast.js';

export function createLoginPage() {
  const container = document.createElement('div');
  container.className = 'page-container';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.minHeight = '75vh';

  function render() {
    container.innerHTML = `
      <div class="table-panel" style="width: 100%; max-width: 440px; padding: var(--space-8); box-shadow: var(--shadow-lg);">
        <div style="text-align: center; margin-bottom: var(--space-6);">
          <div class="brand-icon-box" style="margin: 0 auto var(--space-3); width: 48px; height: 48px;">
            ${iconHtml('scan-line', 28)}
          </div>
          <h2 style="font-size: 20px; font-weight: 700;">Sign in to BatchScan</h2>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Packaging OCR & Manufacturing Intelligence</p>
        </div>

        <form id="loginForm" style="display: flex; flex-direction: column; gap: var(--space-4);">
          <div class="meta-field">
            <label>Enterprise Work Email</label>
            <input type="email" id="loginEmail" value="${state.user.email || 'admin@batchscan.ai'}" required />
          </div>

          <div class="meta-field">
            <label>Password</label>
            <input type="password" id="loginPassword" value="••••••••••••" required />
          </div>

          <div class="meta-field">
            <label>Select Access Role (RBAC Policy)</label>
            <select class="filter-select" id="loginRoleSelect" style="width: 100%;">
              <option value="admin" ${state.user.role === 'admin' ? 'selected' : ''}>Administrator (Full System & Cloud Rights)</option>
              <option value="staff" ${state.user.role === 'staff' ? 'selected' : ''}>Staff / Warehouse Operator (Scan & Review)</option>
              <option value="viewer" ${state.user.role === 'viewer' ? 'selected' : ''}>Auditor / Viewer (Read-Only Compliance)</option>
            </select>
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top: var(--space-2); height: 42px;">
            ${iconHtml('log-out', 16)}
            <span>Sign In to Cloud Workspace</span>
          </button>
        </form>
      </div>
    `;

    renderIcons(container);

    const form = container.querySelector('#loginForm');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const role = container.querySelector('#loginRoleSelect')?.value || 'admin';
      const email = container.querySelector('#loginEmail')?.value || 'admin@batchscan.ai';

      state.user = {
        email,
        name: email.split('@')[0].toUpperCase(),
        role
      };
      localStorage.setItem('batchscan_user', JSON.stringify(state.user));
      notify('user');

      showToast(`Authenticated as ${role.toUpperCase()}.`, 'success');
      window.location.hash = '#/dashboard';
    });
  }

  render();
  return container;
}

