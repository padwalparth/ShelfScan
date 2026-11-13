/**
 * BatchScan Reports & Data Export Center — Phase 3+4
 * Date range filter, CSV with live status, PDF print, summary stats panel
 */

import { fetchScans } from '../api.js';
import { state } from '../state.js';
import { iconHtml, renderIcons } from '../utils/icons.js';
import { formatDateStandard, calculateDaysLeft, parseDateSafe } from '../utils/dateUtils.js';
import { showToast } from '../components/Toast.js';

export function createReportsPage() {
  const container = document.createElement('div');
  container.className = 'page-container';

  // Date range state
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  let dateFrom = thirtyDaysAgo.toISOString().slice(0, 10);
  let dateTo   = today.toISOString().slice(0, 10);

  async function loadData() {
    if (!state.scans || state.scans.length === 0) {
      try {
        const data = await fetchScans({ limit: 1000 });
        state.scans = (data.scans || []).map(sc => ({
          ...sc,
          days_left: sc.exp_date ? calculateDaysLeft(sc.exp_date) : sc.days_left
        }));
      } catch (err) {
        showToast('Could not load scan data: ' + err.message, 'error');
      }
    }
    render();
  }

  function getFilteredScans() {
    const from = new Date(dateFrom + 'T00:00:00');
    const to   = new Date(dateTo   + 'T23:59:59');
    return (state.scans || []).filter(sc => {
      if (!sc.created_at) return true;
      const d = new Date(sc.created_at);
      return d >= from && d <= to;
    });
  }

  function exportCSV() {
    const list = getFilteredScans();
    if (list.length === 0) {
      showToast('No records in the selected date range.', 'warning');
      return;
    }

    const headers = [
      'Created At', 'Batch Code', 'Product Name', 'Manufacturer',
      'Mfg Date', 'Exp Date', 'Shelf Status', 'Days Left',
      'MRP', 'Barcode', 'Source Image', 'Model Used', 'Confidence Score'
    ];
    const rows = list.map(s => {
      const daysLeft = s.exp_date ? calculateDaysLeft(s.exp_date) : s.days_left;
      let status = 'Valid';
      if (typeof daysLeft === 'number') {
        if (daysLeft < 0) status = 'Expired';
        else if (daysLeft <= 3) status = 'Critical';
        else if (daysLeft <= 30) status = 'Expiring Soon';
        else status = 'Valid';
      }
      return [
        `"${formatDateStandard(s.created_at, true)}"`,
        `"${(s.batch_number || '').replace(/"/g, '""')}"`,
        `"${(s.product_name || '').replace(/"/g, '""')}"`,
        `"${(s.manufacturer || '').replace(/"/g, '""')}"`,
        `"${formatDateStandard(s.mfg_date)}"`,
        `"${formatDateStandard(s.exp_date)}"`,
        `"${status}"`,
        typeof daysLeft === 'number' ? daysLeft : '',
        `"${(s.mrp || '').replace(/"/g, '""')}"`,
        `"${(s.barcode || s.extracted_json?.barcode || '').replace(/"/g, '""')}"`,
        `"${(s.source_filename || '').replace(/"/g, '""')}"`,
        `"${(s.model_used || '').replace(/"/g, '""')}"`,
        typeof s.confidence_score === 'number' ? Math.round(s.confidence_score * 100) + '%' : ''
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BatchScan_Report_${dateFrom}_to_${dateTo}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast(`CSV exported — ${list.length} records from ${dateFrom} to ${dateTo}.`, 'success');
  }

  function exportPDF() {
    window.print();
    showToast('Print dialog opened — save as PDF.', 'info');
  }

  function render() {
    const filtered = getFilteredScans();
    const expiredCount  = filtered.filter(x => typeof x.days_left === 'number' && x.days_left < 0).length;
    const criticalCount = filtered.filter(x => typeof x.days_left === 'number' && x.days_left >= 0 && x.days_left <= 3).length;
    const expiringCount = filtered.filter(x => typeof x.days_left === 'number' && x.days_left > 3 && x.days_left <= 30).length;
    const validCount    = filtered.filter(x => typeof x.days_left === 'number' && x.days_left > 30).length;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Compliance Reports &amp; Data Exports</h1>
          <p class="page-subtitle">Generate regulatory audit reports, packaging inspection logs, and warehouse CSV summaries.</p>
        </div>
      </div>

      <!-- Date Range Filter -->
      <div class="table-panel" style="padding:var(--space-5);margin-bottom:var(--space-5);">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:var(--space-3);">
          ${iconHtml('calendar', 15)}
          Date Range Filter
        </h3>
        <div style="display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:8px;">
            <label style="font-size:12px;color:var(--text-muted);font-weight:600;">From</label>
            <input type="date" id="dateFromInput" value="${dateFrom}"
              style="height:36px;padding:0 10px;background:var(--bg-input);border:1px solid var(--border-medium);border-radius:var(--radius-md);color:var(--text-primary);font-size:13px;" />
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <label style="font-size:12px;color:var(--text-muted);font-weight:600;">To</label>
            <input type="date" id="dateToInput" value="${dateTo}"
              style="height:36px;padding:0 10px;background:var(--bg-input);border:1px solid var(--border-medium);border-radius:var(--radius-md);color:var(--text-primary);font-size:13px;" />
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="applyDateRangeBtn">
            ${iconHtml('filter', 14)}<span>Apply Filter</span>
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="resetDateRangeBtn">
            ${iconHtml('refresh-cw', 14)}<span>Reset</span>
          </button>
          <span style="font-size:12px;color:var(--text-muted);margin-left:auto;">
            <strong>${filtered.length}</strong> records in range
          </span>
        </div>
      </div>

      <!-- Summary Stats for Range -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--space-3);margin-bottom:var(--space-5);">
        <div class="kpi-card kpi-teal" style="padding:var(--space-4);">
          <div class="kpi-title" style="font-size:11px;">Valid</div>
          <div class="kpi-value" style="font-size:28px;">${validCount}</div>
        </div>
        <div class="kpi-card kpi-amber" style="padding:var(--space-4);">
          <div class="kpi-title" style="font-size:11px;">Expiring Soon</div>
          <div class="kpi-value" style="font-size:28px;">${expiringCount}</div>
        </div>
        <div class="kpi-card kpi-rose" style="padding:var(--space-4);">
          <div class="kpi-title" style="font-size:11px;">Critical</div>
          <div class="kpi-value" style="font-size:28px;">${criticalCount}</div>
        </div>
        <div class="kpi-card kpi-rose" style="padding:var(--space-4);">
          <div class="kpi-title" style="font-size:11px;">Expired</div>
          <div class="kpi-value" style="font-size:28px;">${expiredCount}</div>
        </div>
      </div>

      <!-- Export Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:var(--space-6);margin-bottom:var(--space-6);">
        <!-- CSV Export -->
        <div class="table-panel" style="padding:var(--space-6);">
          <div style="width:44px;height:44px;border-radius:var(--radius-md);background:rgba(16,185,129,0.14);color:var(--accent-teal);display:flex;align-items:center;justify-content:center;margin-bottom:var(--space-4);">
            ${iconHtml('file-spreadsheet', 24)}
          </div>
          <h3 style="font-size:16px;font-weight:700;margin-bottom:6px;">Warehouse Dataset (CSV)</h3>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:var(--space-5);">
            Complete tabular dataset with standardized dates, lot numbers, live shelf-life ratings, and barcode data.
            <strong style="color:var(--text-primary);">${filtered.length} records</strong> in selected range.
          </p>
          <button type="button" class="btn btn-primary" id="exportCsvBtn">
            ${iconHtml('download', 16)}<span>Download CSV / Excel</span>
          </button>
        </div>

        <!-- PDF Export -->
        <div class="table-panel" style="padding:var(--space-6);">
          <div style="width:44px;height:44px;border-radius:var(--radius-md);background:rgba(99,102,241,0.14);color:var(--accent-indigo);display:flex;align-items:center;justify-content:center;margin-bottom:var(--space-4);">
            ${iconHtml('printer', 24)}
          </div>
          <h3 style="font-size:16px;font-weight:700;margin-bottom:6px;">Executive Audit Summary (PDF)</h3>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:var(--space-5);">
            Print-formatted document for retail management review. Opens browser print dialog — save as PDF for archival.
          </p>
          <button type="button" class="btn btn-secondary" id="exportPdfBtn">
            ${iconHtml('download', 16)}<span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      <!-- Inline preview table -->
      ${filtered.length > 0 ? `
      <div class="table-panel">
        <div class="table-toolbar">
          <h3 style="font-size:14px;font-weight:700;">Preview — First 50 Records in Range</h3>
        </div>
        <div class="table-scroll-container">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-sticky-first">Batch Code</th>
                <th>Product</th>
                <th>Created At</th>
                <th>Mfg Date</th>
                <th>Exp Date</th>
                <th>Status</th>
                <th>M.R.P.</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.slice(0, 50).map(s => `
                <tr>
                  <td class="col-sticky-first font-mono" style="font-weight:600;">${s.batch_number || 'UNKNOWN'}</td>
                  <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.product_name || '—'}</td>
                  <td style="font-size:12px;color:var(--text-muted);">${formatDateStandard(s.created_at, true)}</td>
                  <td>${formatDateStandard(s.mfg_date)}</td>
                  <td>${formatDateStandard(s.exp_date)}</td>
                  <td>${renderStatusCell(s)}</td>
                  <td style="font-weight:600;">${s.mrp || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${filtered.length > 50 ? `
        <div style="padding:var(--space-3) var(--space-4);font-size:12px;color:var(--text-muted);border-top:1px solid var(--border-subtle);">
          Showing 50 of ${filtered.length} records. Download CSV for full dataset.
        </div>
        ` : ''}
      </div>
      ` : ''}
    `;

    renderIcons(container);

    // Date range events
    container.querySelector('#applyDateRangeBtn')?.addEventListener('click', () => {
      const fromVal = container.querySelector('#dateFromInput')?.value;
      const toVal   = container.querySelector('#dateToInput')?.value;
      if (fromVal) dateFrom = fromVal;
      if (toVal)   dateTo   = toVal;
      render();
    });

    container.querySelector('#resetDateRangeBtn')?.addEventListener('click', () => {
      dateFrom = thirtyDaysAgo.toISOString().slice(0, 10);
      dateTo   = today.toISOString().slice(0, 10);
      render();
    });

    container.querySelector('#exportCsvBtn')?.addEventListener('click', exportCSV);
    container.querySelector('#exportPdfBtn')?.addEventListener('click', exportPDF);
  }

  function renderStatusCell(sc) {
    const d = sc.days_left;
    if (typeof d !== 'number') return `<span style="font-size:12px;color:var(--text-muted);">${sc.expiry_status || '—'}</span>`;
    if (d < 0)  return `<span class="status-badge badge-expired"  style="font-size:11px;">Expired</span>`;
    if (d <= 3) return `<span class="status-badge badge-critical" style="font-size:11px;">Critical (${d}d)</span>`;
    if (d <= 30) return `<span class="status-badge badge-expiring" style="font-size:11px;">Expiring (${d}d)</span>`;
    return `<span class="status-badge badge-valid" style="font-size:11px;">Valid (${d}d)</span>`;
  }

  loadData();
  return container;
}
