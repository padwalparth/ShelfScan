/**
 * BatchScan Settings & System Configuration — Phase 3+4
 * System · Roles · Recall (inline results) · Notifications · Danger Zone
 */

import { fetchConfig, fetchScans, clearAllScans } from '../api.js';
import { state, setUserRole } from '../state.js';
import { iconHtml, renderIcons } from '../utils/icons.js';
import { formatDateStandard, calculateDaysLeft } from '../utils/dateUtils.js';
import { renderStatusBadge, escapeHtml } from '../utils/formatters.js';
import { showToast } from '../components/Toast.js';

export function createSettingsPage() {
  const container = document.createElement('div');
  container.className = 'page-container';

  let currentTab = 'system';
  let recallResults = null;
  let recallQuery   = '';
  let recallLoading = false;

  function render() {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Settings &amp; System Governance</h1>
          <p class="page-subtitle">Hardware telemetry, AI vision models, RBAC credentials &amp; database administration.</p>
        </div>
      </div>

      <!-- Settings Nav Tabs -->
      <div style="display:flex;gap:2px;border-bottom:1px solid var(--border-subtle);margin-bottom:var(--space-6);flex-wrap:wrap;">
        ${tabBtn('system',   'System &amp; Hardware', 'system')}
        ${tabBtn('roles',    'Users &amp; Roles',     'roles')}
        ${tabBtn('recall',   'Batch Recall',          'recall')}
        ${tabBtn('notifs',   'Notifications',         'notifs')}
        ${tabBtn('danger',   'Danger Zone',           'danger', true)}
      </div>

      ${currentTab === 'system'  ? renderSystemTab()  : ''}
      ${currentTab === 'roles'   ? renderRolesTab()   : ''}
      ${currentTab === 'recall'  ? renderRecallTab()  : ''}
      ${currentTab === 'notifs'  ? renderNotifsTab()  : ''}
      ${currentTab === 'danger'  ? renderDangerTab()  : ''}
    `;

    renderIcons(container);
    attachEvents();
  }

  function tabBtn(id, label, tab, isDanger = false) {
    const isActive = currentTab === tab;
    const color = isDanger
      ? (isActive ? 'var(--accent-rose)' : 'var(--text-muted)')
      : (isActive ? 'var(--accent-teal)' : 'var(--text-muted)');
    const border = isActive
      ? (isDanger ? 'var(--accent-rose)' : 'var(--accent-teal)')
      : 'transparent';
    return `
      <button type="button" class="settings-tab-btn" data-tab="${tab}"
        style="padding:10px 18px;background:none;border:none;border-bottom:2px solid ${border};
               font-weight:600;font-size:13px;color:${color};cursor:pointer;white-space:nowrap;
               transition:color 0.15s,border-color 0.15s;">
        ${label}
      </button>
    `;
  }

  /* ── System Tab ─────────────────────────────────────────────────── */
  function renderSystemTab() {
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);">

        <!-- AI Vision Engine -->
        <div class="table-panel" style="padding:var(--space-5);">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-4);">
            ${iconHtml('cpu', 18)}
            <h3 style="font-size:15px;font-weight:700;">AI Vision Engine</h3>
          </div>
          <div style="display:flex;flex-direction:column;gap:var(--space-3);">
            <div class="meta-field">
              <label>Default Vision Model</label>
              <select class="filter-select" id="settingsModelSelect" style="width:100%;">
                <option value="gemini-3.5-flash-lite" selected>Google Gemini 3.5 Flash-Lite (Recommended)</option>
                <option value="gemini-3.5-flash">Google Gemini 3.5 Flash (High Precision)</option>
                <option value="gemini-3.7-flash">Google Gemini 3.7 Flash</option>
                <option value="meta/llama-3.2-90b-vision-instruct">NVIDIA NIM Llama 3.2 90B Vision</option>
              </select>
            </div>
            <div class="meta-field">
              <label>Gemini API Key</label>
              <input type="password" value="••••••••••••••••••••••••••••••••••••" readonly
                style="color:var(--accent-teal);font-family:var(--font-mono);" />
            </div>
            <div style="font-size:12px;color:var(--text-muted);padding:8px;background:var(--bg-subtle);border-radius:var(--radius-sm);">
              Key sourced from <code>.env</code> — never stored in browser. Managed via <code>GEMINI_API_KEY</code>.
            </div>
          </div>
        </div>

        <!-- Raspberry Pi Node -->
        <div class="table-panel" style="padding:var(--space-5);">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-4);">
            ${iconHtml('server', 18)}
            <h3 style="font-size:15px;font-weight:700;">Raspberry Pi Hardware Node</h3>
          </div>
          <div style="display:flex;flex-direction:column;gap:var(--space-3);">
            <div class="meta-field">
              <label>Ingest Endpoint (LAN)</label>
              <input type="text" value="${window.location.origin}/api/rpi/upload" readonly class="font-mono" />
            </div>
            <div class="meta-field">
              <label>Edge Client Command</label>
              <input type="text" value="python rpi_camera_client.py" readonly class="font-mono"
                style="color:var(--accent-teal);" />
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="pingPiBtn">
              ${iconHtml('wifi', 14)}<span>Ping Pi Node</span>
            </button>
          </div>
        </div>

        <!-- Supabase Cloud -->
        <div class="table-panel" style="padding:var(--space-5);">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-4);">
            ${iconHtml('cloud', 18)}
            <h3 style="font-size:15px;font-weight:700;">Supabase Cloud PostgreSQL</h3>
          </div>
          <div style="display:flex;flex-direction:column;gap:var(--space-3);">
            <div class="meta-field">
              <label>Connection Status</label>
              <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
                <span class="status-dot online" style="width:9px;height:9px;border-radius:50%;background:var(--accent-teal);box-shadow:0 0 8px var(--accent-teal);"></span>
                <span class="status-badge badge-valid">PostgreSQL Cloud Connected</span>
              </div>
            </div>
            <div style="font-size:12px;color:var(--text-muted);padding:8px;background:var(--bg-subtle);border-radius:var(--radius-sm);">
              Row-Level Security (RLS) enabled. Keys stored in <code>.env</code> as <code>SUPABASE_URL</code> &amp; <code>SUPABASE_KEY</code>.
            </div>
          </div>
        </div>

        <!-- Mobile APK -->
        <div class="table-panel" style="padding:var(--space-5);">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-4);">
            ${iconHtml('smartphone', 18)}
            <h3 style="font-size:15px;font-weight:700;">Android Mobile APK</h3>
          </div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:var(--space-4);">
            Standalone APK for Android handheld barcode scanners. Install directly on device (enable Unknown Sources).
          </p>
          <a href="/BatchScan-AI.apk" class="btn btn-primary btn-sm" download>
            ${iconHtml('download', 14)}<span>Download BatchScan-AI.apk</span>
          </a>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;">
            Version: 1.0.0 · Built with Capacitor 7 · ~57 MB
          </p>
        </div>
      </div>
    `;
  }

  /* ── Roles Tab ──────────────────────────────────────────────────── */
  function renderRolesTab() {
    const roles = [
      { key: 'admin',  label: 'Admin',           desc: 'Full access — scan, edit, delete, configure system settings.' },
      { key: 'staff',  label: 'Staff',           desc: 'Can scan and view records. Cannot delete or change settings.' },
      { key: 'viewer', label: 'Viewer (Read-Only)', desc: 'View-only access. Cannot scan, edit, or export data.' }
    ];
    return `
      <div style="max-width:640px;">
        <div class="table-panel" style="padding:var(--space-5);margin-bottom:var(--space-5);">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:var(--space-2);">Role-Based Access Control (RBAC)</h3>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:var(--space-4);">
            Switch the active session role to verify Supabase RLS permission policies. In production, roles are enforced server-side.
          </p>
          <div style="display:flex;flex-direction:column;gap:var(--space-3);">
            ${roles.map(r => `
              <label style="display:flex;align-items:flex-start;gap:12px;padding:var(--space-4);border:1px solid ${state.user.role === r.key ? 'var(--accent-teal)' : 'var(--border-subtle)'};border-radius:var(--radius-md);cursor:pointer;transition:border-color 0.15s;background:${state.user.role === r.key ? 'rgba(16,185,129,0.06)' : 'transparent'};">
                <input type="radio" name="roleSelect" value="${r.key}" ${state.user.role === r.key ? 'checked' : ''} class="role-radio" style="margin-top:3px;accent-color:var(--accent-teal);" />
                <div>
                  <div style="font-weight:700;font-size:14px;margin-bottom:2px;">${r.label}</div>
                  <div style="font-size:12px;color:var(--text-muted);">${r.desc}</div>
                </div>
              </label>
            `).join('')}
          </div>
          <div style="margin-top:var(--space-4);padding:var(--space-3);background:var(--bg-subtle);border-radius:var(--radius-md);font-size:12px;color:var(--text-secondary);">
            ${iconHtml('info', 13)}
            <strong>Active role:</strong> <span style="color:var(--accent-teal);text-transform:uppercase;font-weight:700;margin-left:4px;">${state.user.role}</span>
            <span style="margin-left:8px;">as ${state.user.name}</span>
          </div>
        </div>
      </div>
    `;
  }

  /* ── Recall Tab ─────────────────────────────────────────────────── */
  function renderRecallTab() {
    return `
      <div style="max-width:720px;">
        <div class="table-panel" style="padding:var(--space-5);">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:var(--space-2);">Batch Recall &amp; Traceability Lookup</h3>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:var(--space-4);">
            Enter any batch code or lot number to immediately find all corresponding scans, shelf locations, and expiry status.
          </p>

          <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-4);">
            <input type="text" id="recallInput" value="${escapeHtml(recallQuery)}"
              placeholder="e.g. FK11626, BHR249, LOT2026…" class="font-mono"
              style="flex:1;height:40px;padding:0 14px;background:var(--bg-input);border:1px solid var(--border-medium);border-radius:var(--radius-md);color:var(--text-primary);font-size:14px;" />
            <button type="button" class="btn btn-primary" id="recallSearchBtn">
              ${iconHtml('search', 15)}<span>Search Traceability</span>
            </button>
          </div>

          <!-- Inline Results Box -->
          <div id="recallResultsBox">
            ${recallLoading ? `
              <div style="display:flex;align-items:center;gap:10px;padding:var(--space-4);color:var(--text-muted);">
                <div style="width:18px;height:18px;border:2px solid var(--accent-teal);border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
                <span>Searching Supabase for batch "${escapeHtml(recallQuery)}"…</span>
              </div>
            ` : recallResults === null ? `
              <div style="text-align:center;padding:var(--space-5);color:var(--text-muted);">
                ${iconHtml('search', 24)}
                <p style="margin-top:8px;">Enter a batch code above to search all cloud scan records.</p>
              </div>
            ` : recallResults.length === 0 ? `
              <div style="text-align:center;padding:var(--space-5);color:var(--text-muted);">
                ${iconHtml('x-circle', 24)}
                <p style="margin-top:8px;">No records found for <strong>"${escapeHtml(recallQuery)}"</strong>.</p>
              </div>
            ` : `
              <div style="margin-bottom:var(--space-3);padding:var(--space-3);background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);border-radius:var(--radius-md);font-size:13px;color:var(--text-secondary);">
                ${iconHtml('check-circle-2', 14)}
                Found <strong>${recallResults.length} record${recallResults.length !== 1 ? 's' : ''}</strong> matching <strong>"${escapeHtml(recallQuery)}"</strong>
              </div>
              <div class="table-scroll-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th class="col-sticky-first">Batch Code</th>
                      <th>Product</th>
                      <th>Source Image</th>
                      <th>Created At</th>
                      <th>Exp Date</th>
                      <th>Live Status</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recallResults.map(r => `
                      <tr>
                        <td class="col-sticky-first font-mono" style="font-weight:700;">${escapeHtml(r.batch_number || '—')}</td>
                        <td>${escapeHtml(r.product_name || '—')}</td>
                        <td style="font-size:12px;color:var(--text-muted);">${escapeHtml(r.source_filename || '—')}</td>
                        <td style="font-size:12px;color:var(--text-muted);">${formatDateStandard(r.created_at, true)}</td>
                        <td>${formatDateStandard(r.exp_date)}</td>
                        <td>${renderStatusBadge(r)}</td>
                        <td style="font-size:12px;color:var(--text-muted);">${escapeHtml(r.location_shelf || '—')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  /* ── Notifications Tab ──────────────────────────────────────────── */
  function renderNotifsTab() {
    return `
      <div style="max-width:640px;">
        <div class="table-panel" style="padding:var(--space-5);margin-bottom:var(--space-5);">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:var(--space-2);">Expiry Alert Notifications</h3>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:var(--space-5);">
            Configure automated alerts sent via Email or WhatsApp when batches approach expiry.
            Notifications are powered by a Supabase Edge Function (stub — configure server-side).
          </p>

          <div style="display:flex;flex-direction:column;gap:var(--space-4);">
            <!-- Email toggle -->
            <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-4);background:var(--bg-subtle);border-radius:var(--radius-md);">
              <div style="display:flex;align-items:center;gap:10px;">
                ${iconHtml('mail', 18)}
                <div>
                  <div style="font-weight:600;font-size:14px;">Email Alerts</div>
                  <div style="font-size:12px;color:var(--text-muted);">Send digest when batches hit 7-day threshold</div>
                </div>
              </div>
              <label style="display:inline-flex;align-items:center;cursor:pointer;">
                <input type="checkbox" id="emailToggle" style="accent-color:var(--accent-teal);width:16px;height:16px;" />
                <span style="margin-left:6px;font-size:12px;color:var(--text-muted);">Enable</span>
              </label>
            </div>

            <!-- WhatsApp toggle -->
            <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-4);background:var(--bg-subtle);border-radius:var(--radius-md);">
              <div style="display:flex;align-items:center;gap:10px;">
                ${iconHtml('message-circle', 18)}
                <div>
                  <div style="font-weight:600;font-size:14px;">WhatsApp Alerts</div>
                  <div style="font-size:12px;color:var(--text-muted);">Send WhatsApp message via Twilio webhook</div>
                </div>
              </div>
              <label style="display:inline-flex;align-items:center;cursor:pointer;">
                <input type="checkbox" id="waToggle" style="accent-color:var(--accent-teal);width:16px;height:16px;" />
                <span style="margin-left:6px;font-size:12px;color:var(--text-muted);">Enable</span>
              </label>
            </div>

            <!-- Webhook URL -->
            <div class="meta-field">
              <label>Webhook / Notification URL</label>
              <input type="url" id="webhookUrlInput" placeholder="https://hooks.supabase.io/v1/..." />
            </div>

            <!-- Alert threshold -->
            <div class="meta-field">
              <label>Alert Threshold (Days Before Expiry)</label>
              <select class="filter-select" style="width:100%;">
                <option value="4">4 days (Critical window)</option>
                <option value="7" selected>7 days (Recommended)</option>
                <option value="14">14 days (Early warning)</option>
                <option value="30">30 days (Planning ahead)</option>
              </select>
            </div>

            <div style="padding:var(--space-3);background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:var(--radius-md);font-size:12px;color:var(--text-secondary);">
              ${iconHtml('info', 13)}
              <strong>Note:</strong> Actual message delivery requires a deployed <code>notify-expiry</code> Supabase Edge Function.
              See <code>migrate_v2.sql</code> and project README for setup instructions.
            </div>

            <button type="button" class="btn btn-primary btn-sm" id="saveNotifsBtn">
              ${iconHtml('save', 14)}<span>Save Notification Settings</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /* ── Danger Zone Tab ────────────────────────────────────────────── */
  function renderDangerTab() {
    return `
      <div style="max-width:640px;">
        <div class="table-panel" style="padding:var(--space-6);border-color:rgba(244,63,94,0.4);">
          <div style="display:flex;align-items:center;gap:8px;color:var(--accent-rose);margin-bottom:var(--space-2);">
            ${iconHtml('alert-triangle', 20)}
            <h3 style="font-size:16px;font-weight:700;">Danger Zone: Cloud Database Purge</h3>
          </div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:var(--space-5);">
            This action will permanently delete <strong>all</strong> cloud scan logs and reset warehouse statistics.
            This operation <strong>cannot be undone</strong>. Only admins can execute this action.
          </p>

          <div style="background:rgba(244,63,94,0.06);border:1px solid rgba(244,63,94,0.2);padding:var(--space-5);border-radius:var(--radius-md);margin-bottom:var(--space-5);">
            <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:8px;">
              To confirm, type <strong style="color:var(--accent-rose);">DELETE</strong> below:
            </label>
            <input type="text" id="deleteConfirmInput"
              placeholder="Type DELETE to enable"
              style="width:100%;height:38px;padding:0 14px;background:var(--bg-input);border:1px solid var(--border-medium);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--font-mono);font-size:14px;" />
          </div>

          <button type="button" class="btn btn-danger" id="dangerPurgeBtn" disabled>
            ${iconHtml('trash-2', 16)}<span>Permanently Purge All Cloud Records</span>
          </button>

          <p style="margin-top:var(--space-3);font-size:11px;color:var(--text-muted);">
            ${state.user.role !== 'admin' ? '⛔ You must be Admin to execute this action.' : 'You are Admin — proceed with extreme caution.'}
          </p>
        </div>
      </div>
    `;
  }

  /* ── Event Handlers ─────────────────────────────────────────────── */
  function attachEvents() {
    // Tab buttons
    container.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.getAttribute('data-tab');
        recallResults = null;
        recallQuery   = '';
        recallLoading = false;
        render();
      });
    });

    // Role radio buttons
    container.querySelectorAll('.role-radio').forEach(radio => {
      radio.addEventListener('change', () => {
        const r = radio.value;
        setUserRole(r);
        showToast(`Active role switched to ${r.toUpperCase()}.`, 'info');
        render();
      });
    });

    // Ping Pi
    container.querySelector('#pingPiBtn')?.addEventListener('click', async () => {
      showToast('Checking Raspberry Pi status…', 'info');
      try {
        const res = await fetch('/api/rpi/status', { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const info = await res.json();
          showToast(`Pi status: ${info.status} (Captures: ${info.total_captures_received})`, 'success');
        } else {
          showToast('Pi responded with error: ' + res.status, 'error');
        }
      } catch {
        showToast('Pi node unreachable. Check LAN connection.', 'error');
      }
    });

    // Recall search
    const recallBtn   = container.querySelector('#recallSearchBtn');
    const recallInput = container.querySelector('#recallInput');
    if (recallBtn && recallInput) {
      const doSearch = async () => {
        const q = recallInput.value.trim();
        if (!q) return;
        recallQuery   = q;
        recallLoading = true;
        recallResults = null;
        render();
        try {
          const data = await fetchScans({ search: q, limit: 100 });
          const rawResults = data.scans || [];
          recallResults = rawResults.map(sc => ({
            ...sc,
            days_left: sc.exp_date ? calculateDaysLeft(sc.exp_date) : sc.days_left
          }));
        } catch (err) {
          showToast('Recall search error: ' + err.message, 'error');
          recallResults = [];
        } finally {
          recallLoading = false;
          render();
        }
      };
      recallBtn.addEventListener('click', doSearch);
      recallInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    }

    // Notifications save
    container.querySelector('#saveNotifsBtn')?.addEventListener('click', () => {
      showToast('Notification settings saved (UI only — configure Edge Function for delivery).', 'info');
    });

    // Danger zone
    const confirmInput = container.querySelector('#deleteConfirmInput');
    const purgeBtn     = container.querySelector('#dangerPurgeBtn');
    if (confirmInput && purgeBtn) {
      confirmInput.addEventListener('input', () => {
        purgeBtn.disabled = confirmInput.value.trim() !== 'DELETE' || state.user.role !== 'admin';
      });
      purgeBtn.addEventListener('click', async () => {
        if (state.user.role !== 'admin') {
          showToast('Only admins can purge cloud records.', 'error');
          return;
        }
        try {
          await clearAllScans();
          showToast('All cloud scan records have been permanently purged.', 'success');
          confirmInput.value = '';
          purgeBtn.disabled  = true;
        } catch (err) {
          showToast('Failed to purge records: ' + err.message, 'error');
        }
      });
    }
  }

  render();
  return container;
}
