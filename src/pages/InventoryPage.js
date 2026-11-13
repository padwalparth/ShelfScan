/**
 * BatchScan Master Inventory Page — Phase 3+4
 * FEFO sort, search, live days_left calculation, shelf tags, inspect drawer
 */

import { fetchInventory } from '../api.js';
import { state, openDrawer } from '../state.js';
import { iconHtml, renderIcons } from '../utils/icons.js';
import { formatDateStandard, calculateDaysLeft } from '../utils/dateUtils.js';
import { renderStatusBadge, escapeHtml } from '../utils/formatters.js';
import { showToast } from '../components/Toast.js';

export function createInventoryPage() {
  const container = document.createElement('div');
  container.className = 'page-container';

  let fefoAsc = true;
  let searchQuery = '';

  async function loadData() {
    try {
      // Show skeleton
      container.innerHTML = `<div class="page-header"><h1 class="page-title">Master Inventory</h1></div>
        <div class="table-panel" style="padding:var(--space-5);">
          ${Array(5).fill(0).map(() => `
            <div class="skeleton" style="height:48px;border-radius:8px;margin-bottom:10px;"></div>
          `).join('')}
        </div>`;

      const data = await fetchInventory();
      const rawInv = data.inventory || [];
      // Recalculate days_left dynamically
      state.inventory = rawInv.map(item => ({
        ...item,
        days_left: item.exp_date ? calculateDaysLeft(item.exp_date) : item.days_left
      }));
      render();
    } catch (err) {
      showToast('Error loading inventory: ' + err.message, 'error');
      state.inventory = [];
      render();
    }
  }

  function render() {
    let list = [...(state.inventory || [])];

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(x =>
        (x.batch_number || '').toLowerCase().includes(q) ||
        (x.product_name || '').toLowerCase().includes(q) ||
        (x.manufacturer || '').toLowerCase().includes(q)
      );
    }

    // FEFO Sort: First-Expired First-Out
    list.sort((a, b) => {
      const daysA = typeof a.days_left === 'number' ? a.days_left : 9999;
      const daysB = typeof b.days_left === 'number' ? b.days_left : 9999;
      return fefoAsc ? (daysA - daysB) : (daysB - daysA);
    });

    // FEFO urgency badge helper
    const urgencyBadge = (item) => {
      const d = item.days_left;
      if (typeof d !== 'number') return '';
      if (d < 0) return `<span class="status-badge badge-expired" style="font-size:10px;">EXPIRED</span>`;
      if (d <= 3) return `<span class="status-badge badge-critical" style="font-size:10px;">CRITICAL</span>`;
      if (d <= 30) return `<span class="status-badge badge-expiring" style="font-size:10px;">EXPIRING</span>`;
      return '';
    };

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Master Inventory &amp; Warehouse Batches</h1>
          <p class="page-subtitle">Unique product lots aggregated with location tags, stock counts &amp; FEFO rotation compliance.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="fefoToggleBtn">
            ${iconHtml('arrow-up-down', 14)}
            <span>FEFO: ${fefoAsc ? 'Earliest First' : 'Latest First'}</span>
          </button>
          <a href="#/scan" class="btn btn-primary btn-sm">
            ${iconHtml('scan-line', 14)}<span>Add Batch</span>
          </a>
        </div>
      </div>

      <!-- Summary strip -->
      <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-5);flex-wrap:wrap;">
        <div style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-full);font-size:12px;">
          ${iconHtml('boxes', 14)}
          <span><strong>${list.length}</strong> unique batches</span>
        </div>
        <div style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:rgba(244,63,94,0.08);border:1px solid rgba(244,63,94,0.2);border-radius:var(--radius-full);font-size:12px;color:var(--accent-rose);">
          ${iconHtml('alert-circle', 14)}
          <span><strong>${list.filter(x => typeof x.days_left === 'number' && x.days_left < 0).length}</strong> expired</span>
        </div>
        <div style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:var(--radius-full);font-size:12px;color:var(--accent-amber);">
          ${iconHtml('alert-triangle', 14)}
          <span><strong>${list.filter(x => typeof x.days_left === 'number' && x.days_left >= 0 && x.days_left <= 30).length}</strong> near expiry</span>
        </div>
      </div>

      <div class="table-panel">
        <div class="table-toolbar">
          <div class="input-search-wrap">
            <span class="search-icon">${iconHtml('search', 16)}</span>
            <input type="text" id="invSearchInput" placeholder="Filter by batch, product or manufacturer…" value="${escapeHtml(searchQuery)}" />
          </div>
          <div style="font-size:12px;color:var(--text-muted);">
            <strong>${list.length}</strong> master batches · FEFO ${fefoAsc ? '↑ Earliest first' : '↓ Latest first'}
          </div>
        </div>

        <div class="table-scroll-container">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-sticky-first">Batch / Lot Code</th>
                <th>Product / Brand</th>
                <th>Units / Scans</th>
                <th>Shelf Location</th>
                <th>Manufacturer</th>
                <th>Mfg Date</th>
                <th>Exp Date</th>
                <th>Shelf-Life Status</th>
                <th>M.R.P.</th>
                <th>FEFO Priority</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.length === 0 ? `
                <tr>
                  <td colspan="11">
                    <div class="empty-state-box">
                      <div class="empty-state-icon">${iconHtml('boxes', 28)}</div>
                      <h4 class="empty-state-title">No Inventory Batches Found</h4>
                      <p class="empty-state-desc">Scan products to populate master batches with automatic FEFO sorting.</p>
                      <a href="#/scan" class="btn btn-primary btn-sm">Start Scanning</a>
                    </div>
                  </td>
                </tr>
              ` : list.map((item, idx) => {
                const daysLeft = item.days_left;
                const fefoRank = typeof daysLeft === 'number'
                  ? (daysLeft < 0 ? '⛔ Expired' : `${daysLeft}d left`)
                  : '—';
                return `
                  <tr data-inv-idx="${idx}" style="cursor:pointer;">
                    <td class="col-sticky-first font-mono" style="font-weight:600;">
                      <div style="display:flex;align-items:center;gap:4px;">
                        ${escapeHtml(item.batch_number || 'UNKNOWN')}
                        ${urgencyBadge(item)}
                      </div>
                    </td>
                    <td style="font-weight:500;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(item.product_name || '')}">
                      ${escapeHtml(item.product_name || 'Packaging Unit')}
                    </td>
                    <td>
                      <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:var(--radius-full);background:var(--bg-subtle);font-weight:600;font-size:12px;">
                        ${item.quantity || item.total_scans || 1} units
                      </span>
                    </td>
                    <td>
                      <span style="font-size:12px;color:var(--text-secondary);display:inline-flex;align-items:center;gap:4px;">
                        ${iconHtml('tag', 12)}
                        <span>${escapeHtml(item.location_shelf || 'Main Rack A')}</span>
                      </span>
                    </td>
                    <td style="font-size:12px;color:var(--text-muted);">${escapeHtml(item.manufacturer || '—')}</td>
                    <td>${formatDateStandard(item.mfg_date)}</td>
                    <td>${formatDateStandard(item.exp_date)}</td>
                    <td>${renderStatusBadge(item)}</td>
                    <td style="font-weight:600;">${escapeHtml(item.mrp || '—')}</td>
                    <td>
                      <span style="font-family:var(--font-mono);font-size:12px;font-weight:600;color:${typeof daysLeft === 'number' && daysLeft < 0 ? 'var(--accent-rose)' : daysLeft <= 30 ? 'var(--accent-amber)' : 'var(--accent-teal)'};">
                        ${fefoRank}
                      </span>
                    </td>
                    <td>
                      <button type="button" class="btn btn-secondary btn-sm inv-inspect-btn" data-idx="${idx}" onclick="event.stopPropagation()">
                        ${iconHtml('eye', 13)}<span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    renderIcons(container);

    // FEFO toggle
    container.querySelector('#fefoToggleBtn')?.addEventListener('click', () => {
      fefoAsc = !fefoAsc;
      render();
    });

    // Search
    const searchInput = container.querySelector('#invSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value;
        render();
      });
    }

    // Row click + Inspect button → open drawer
    container.querySelectorAll('tr[data-inv-idx]').forEach(tr => {
      tr.addEventListener('click', () => {
        const idx = parseInt(tr.getAttribute('data-inv-idx'), 10);
        if (!isNaN(idx) && list[idx]) openDrawer(list[idx]);
      });
    });

    container.querySelectorAll('.inv-inspect-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        if (!isNaN(idx) && list[idx]) openDrawer(list[idx]);
      });
    });
  }

  loadData();
  return container;
}
