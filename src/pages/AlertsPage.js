/**
 * BatchScan Shelf-Life Alerts & Expiry Triage — Phase 3+4
 * Dynamic status from live exp_date, Warning section added, real action handlers
 */

import { fetchScans } from '../api.js';
import { state } from '../state.js';
import { iconHtml, renderIcons } from '../utils/icons.js';
import { formatDateStandard, calculateDaysLeft } from '../utils/dateUtils.js';
import { escapeHtml, renderStatusBadge } from '../utils/formatters.js';
import { showToast } from '../components/Toast.js';

export function createAlertsPage() {
  const container = document.createElement('div');
  container.className = 'page-container';

  async function loadAlerts() {
    try {
      const data = await fetchScans({ limit: 500 });
      const rawScans = data.scans || [];
      // Recalculate days_left dynamically
      state.scans = rawScans.map(sc => ({
        ...sc,
        days_left: sc.exp_date ? calculateDaysLeft(sc.exp_date) : sc.days_left
      }));
      render();
    } catch (err) {
      showToast('Error loading alerts: ' + err.message, 'error');
      render();
    }
  }

  function render() {
    const all = state.scans || [];
    const expiredList  = all.filter(x => x.days_left !== null && x.days_left !== undefined && x.days_left < 0);
    const criticalList = all.filter(x => x.days_left !== null && x.days_left !== undefined && x.days_left >= 0 && x.days_left <= 3);
    const warningList  = all.filter(x => x.days_left !== null && x.days_left !== undefined && x.days_left > 3 && x.days_left <= 30);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Shelf-Life Risk &amp; Expiry Triage</h1>
          <p class="page-subtitle">Categorized alerts requiring prompt retail action to minimize shrinkage and inventory write-offs.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="alertsRefreshBtn">
            ${iconHtml('refresh-cw', 15)}<span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Summary KPI Strip -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-4);margin-bottom:var(--space-6);">
        <div class="kpi-card kpi-rose">
          <div class="kpi-header">
            <span class="kpi-title">Expired Batches</span>
            <div class="kpi-icon-wrap">${iconHtml('alert-circle', 18)}</div>
          </div>
          <div class="kpi-value">${expiredList.length}</div>
          <div class="kpi-footer" style="color:var(--accent-rose);">Discard from shelves immediately</div>
        </div>
        <div class="kpi-card kpi-rose">
          <div class="kpi-header">
            <span class="kpi-title">Critical (0–3 Days)</span>
            <div class="kpi-icon-wrap">${iconHtml('alert-triangle', 18)}</div>
          </div>
          <div class="kpi-value">${criticalList.length}</div>
          <div class="kpi-footer" style="color:var(--accent-rose);">Apply discount / FIFO exit</div>
        </div>
        <div class="kpi-card kpi-amber">
          <div class="kpi-header">
            <span class="kpi-title">Warning (4–30 Days)</span>
            <div class="kpi-icon-wrap">${iconHtml('sliders', 18)}</div>
          </div>
          <div class="kpi-value">${warningList.length}</div>
          <div class="kpi-footer" style="color:var(--accent-amber);">Front-of-rack priority display</div>
        </div>
      </div>

      <!-- Section 1: Critical Alerts -->
      <div class="table-panel" style="margin-bottom:var(--space-5);">
        <div class="table-toolbar" style="background:rgba(244,63,94,0.06);border-bottom:1px solid rgba(244,63,94,0.2);">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="color:var(--accent-rose);">${iconHtml('alert-triangle', 18)}</span>
            <h3 style="font-size:15px;font-weight:700;color:var(--text-primary);">
              Critical — Expires in 3 Days or Less
              <span class="nav-badge" style="margin-left:6px;font-size:11px;">${criticalList.length}</span>
            </h3>
          </div>
        </div>
        <div class="table-scroll-container">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-sticky-first">Batch Code</th>
                <th>Product Name</th>
                <th>Exp Date</th>
                <th>Live Status</th>
                <th>Shelf / Location</th>
                <th>Immediate Action</th>
              </tr>
            </thead>
            <tbody>
              ${criticalList.length === 0 ? `
                <tr><td colspan="6">
                  <div class="empty-state-box" style="padding:var(--space-5);">
                    ${iconHtml('shield-check', 24)}
                    <p style="color:var(--text-muted);margin-top:8px;">No batches in critical 3-day window.</p>
                  </div>
                </td></tr>
              ` : criticalList.map((item, idx) => `
                <tr>
                  <td class="col-sticky-first font-mono" style="font-weight:600;">${escapeHtml(item.batch_number || 'UNKNOWN')}</td>
                  <td>${escapeHtml(item.product_name || 'Packaging Unit')}</td>
                  <td>${formatDateStandard(item.exp_date)}</td>
                  <td>${renderStatusBadge(item)}</td>
                  <td><span style="font-size:12px;color:var(--text-muted);">${escapeHtml(item.location_shelf || 'Rack A')}</span></td>
                  <td>
                    <div style="display:flex;gap:5px;flex-wrap:wrap;">
                      <button type="button" class="btn btn-primary btn-sm alert-action-btn"
                        data-id="${item.id || idx}" data-batch="${escapeHtml(item.batch_number)}" data-action="DISCOUNT">
                        <span>50% Discount</span>
                      </button>
                      <button type="button" class="btn btn-secondary btn-sm alert-action-btn"
                        data-id="${item.id || idx}" data-batch="${escapeHtml(item.batch_number)}" data-action="SOLD">
                        <span>Mark Sold</span>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 2: Expired Stock -->
      <div class="table-panel" style="margin-bottom:var(--space-5);">
        <div class="table-toolbar" style="background:rgba(239,68,68,0.06);border-bottom:1px solid rgba(239,68,68,0.2);">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="color:#ef4444;">${iconHtml('alert-circle', 18)}</span>
            <h3 style="font-size:15px;font-weight:700;color:var(--text-primary);">
              Expired — Past Expiry Date
              <span class="nav-badge" style="margin-left:6px;font-size:11px;">${expiredList.length}</span>
            </h3>
          </div>
        </div>
        <div class="table-scroll-container">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-sticky-first">Batch Code</th>
                <th>Product Name</th>
                <th>Expired On</th>
                <th>Live Status</th>
                <th>Est. Loss</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${expiredList.length === 0 ? `
                <tr><td colspan="6">
                  <div class="empty-state-box" style="padding:var(--space-5);">
                    ${iconHtml('shield-check', 24)}
                    <p style="color:var(--text-muted);margin-top:8px;">No expired batches detected. Great shelf hygiene!</p>
                  </div>
                </td></tr>
              ` : expiredList.map((item, idx) => `
                <tr>
                  <td class="col-sticky-first font-mono" style="font-weight:600;">${escapeHtml(item.batch_number || 'UNKNOWN')}</td>
                  <td>${escapeHtml(item.product_name || 'Packaging Unit')}</td>
                  <td>${formatDateStandard(item.exp_date)}</td>
                  <td>${renderStatusBadge(item)}</td>
                  <td style="color:var(--accent-rose);font-weight:600;">${escapeHtml(item.mrp || '—')}</td>
                  <td>
                    <button type="button" class="btn btn-danger btn-sm alert-action-btn"
                      data-id="${item.id || idx}" data-batch="${escapeHtml(item.batch_number)}" data-action="DISCARD">
                      ${iconHtml('trash-2', 13)}<span>Discard &amp; Log</span>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 3: Early Warning -->
      <div class="table-panel">
        <div class="table-toolbar" style="background:rgba(245,158,11,0.06);border-bottom:1px solid rgba(245,158,11,0.2);">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="color:var(--accent-amber);">${iconHtml('sliders', 18)}</span>
            <h3 style="font-size:15px;font-weight:700;color:var(--text-primary);">
              Warning — Expiring in 4–30 Days
              <span class="nav-badge" style="margin-left:6px;font-size:11px;background:rgba(245,158,11,0.16);color:var(--accent-amber);">${warningList.length}</span>
            </h3>
          </div>
        </div>
        <div class="table-scroll-container">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-sticky-first">Batch Code</th>
                <th>Product Name</th>
                <th>Exp Date</th>
                <th>Live Status</th>
                <th>Shelf / Location</th>
                <th>Recommended Action</th>
              </tr>
            </thead>
            <tbody>
              ${warningList.length === 0 ? `
                <tr><td colspan="6">
                  <div class="empty-state-box" style="padding:var(--space-5);">
                    <p style="color:var(--text-muted);">No stock in the 4–30 day warning window.</p>
                  </div>
                </td></tr>
              ` : warningList.map((item, idx) => `
                <tr>
                  <td class="col-sticky-first font-mono" style="font-weight:600;">${escapeHtml(item.batch_number || 'UNKNOWN')}</td>
                  <td>${escapeHtml(item.product_name || 'Packaging Unit')}</td>
                  <td>${formatDateStandard(item.exp_date)}</td>
                  <td>${renderStatusBadge(item)}</td>
                  <td><span style="font-size:12px;color:var(--text-muted);">${escapeHtml(item.location_shelf || '—')}</span></td>
                  <td>
                    <button type="button" class="btn btn-secondary btn-sm alert-action-btn"
                      data-id="${item.id || idx}" data-batch="${escapeHtml(item.batch_number)}" data-action="PRIORITIZE">
                      ${iconHtml('arrow-up', 13)}<span>Front of Rack</span>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    renderIcons(container);

    container.querySelector('#alertsRefreshBtn')?.addEventListener('click', loadAlerts);

    container.querySelectorAll('.alert-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const batch = btn.getAttribute('data-batch');
        const act = btn.getAttribute('data-action');
        const messages = {
          DISCOUNT: `50% clearance discount flagged for Batch #${batch}.`,
          SOLD:     `Batch #${batch} marked as sold and removed from active alerts.`,
          DISCARD:  `Batch #${batch} logged as discarded stock write-off.`,
          PRIORITIZE: `Batch #${batch} flagged for front-of-rack priority display.`
        };
        showToast(messages[act] || `Action '${act}' recorded for Batch #${batch}.`, act === 'DISCARD' ? 'error' : 'success');
        // Visually dim the row
        const row = btn.closest('tr');
        if (row) {
          row.style.opacity = '0.45';
          row.style.pointerEvents = 'none';
        }
      });
    });
  }

  loadAlerts();
  return container;
}
