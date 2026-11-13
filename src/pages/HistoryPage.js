/**
 * BatchScan Scan History Page — Phase 3+4
 * URL param search, column sort, pagination, duplicate detection, retry button
 */

import { fetchScans } from '../api.js';
import { state, openDrawer } from '../state.js';
import { iconHtml, renderIcons } from '../utils/icons.js';
import { formatDateStandard, calculateDaysLeft } from '../utils/dateUtils.js';
import { renderStatusBadge, escapeHtml } from '../utils/formatters.js';
import { showToast } from '../components/Toast.js';

const PAGE_SIZE = 25;

export function createHistoryPage() {
  const container = document.createElement('div');
  container.className = 'page-container';

  // Parse URL param for initial search
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  let currentSearch = urlParams.get('search') || '';
  let currentStatus = 'ALL';
  let sortKey = 'created_at';
  let sortDir = 'desc'; // 'asc' | 'desc'
  let currentPage = 1;
  let isLoading = true;

  async function loadData() {
    isLoading = true;
    renderTable([], true);
    try {
      const data = await fetchScans({ search: currentSearch, status: currentStatus, limit: 500 });
      const rawScans = data.scans || [];
      state.scans = rawScans.map(sc => ({
        ...sc,
        days_left: sc.exp_date ? calculateDaysLeft(sc.exp_date) : sc.days_left
      }));
    } catch (err) {
      console.error('Failed to load scans:', err);
      showToast('Error loading scan records: ' + err.message, 'error');
      state.scans = [];
    } finally {
      isLoading = false;
      currentPage = 1;
      renderPage();
    }
  }

  function markDuplicates(scans) {
    const counts = {};
    scans.forEach(s => {
      const key = `${(s.batch_number || '').trim().toUpperCase()}::${(s.source_filename || '').trim()}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return scans.map(s => {
      const key = `${(s.batch_number || '').trim().toUpperCase()}::${(s.source_filename || '').trim()}`;
      return {
        ...s,
        isDuplicate: counts[key] > 1 && s.batch_number && !['UNKNOWN', 'N/A'].includes(s.batch_number),
        dupCount: counts[key]
      };
    });
  }

  function sortScans(scans) {
    return [...scans].sort((a, b) => {
      let va = a[sortKey] ?? '';
      let vb = b[sortKey] ?? '';
      if (sortKey === 'created_at' || sortKey === 'exp_date' || sortKey === 'mfg_date') {
        va = new Date(va).getTime() || 0;
        vb = new Date(vb).getTime() || 0;
      } else if (sortKey === 'days_left') {
        va = typeof va === 'number' ? va : 99999;
        vb = typeof vb === 'number' ? vb : 99999;
      } else {
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  function renderPage() {
    const processed = markDuplicates(state.scans || []);
    const sorted = sortScans(processed);
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);
    const pageSlice = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Scan History &amp; Cloud Records</h1>
          <p class="page-subtitle">Search, filter, and inspect verified optical packaging extractions.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="refreshBtn">
            ${iconHtml('refresh-cw', 15)}<span>Refresh</span>
          </button>
          <a href="#/scan" class="btn btn-primary btn-sm">
            ${iconHtml('scan-line', 15)}<span>New Scan</span>
          </a>
        </div>
      </div>

      <div class="table-panel">
        <div class="table-toolbar">
          <div class="table-filters">
            <div class="input-search-wrap">
              <span class="search-icon">${iconHtml('search', 16)}</span>
              <input type="text" id="historySearchInput" placeholder="Search batch number, product…" value="${escapeHtml(currentSearch)}" />
            </div>
            <select class="filter-select" id="historyStatusFilter">
              <option value="ALL" ${currentStatus === 'ALL' ? 'selected' : ''}>All Statuses</option>
              <option value="VALID" ${currentStatus === 'VALID' ? 'selected' : ''}>Valid (&gt; 30d)</option>
              <option value="EXPIRING" ${currentStatus === 'EXPIRING' ? 'selected' : ''}>Expiring (4–30d)</option>
              <option value="CRITICAL" ${currentStatus === 'CRITICAL' ? 'selected' : ''}>Critical (0–3d)</option>
              <option value="EXPIRED" ${currentStatus === 'EXPIRED' ? 'selected' : ''}>Expired</option>
            </select>
          </div>
          <div style="font-size:12px;color:var(--text-muted);">
            Showing <strong>${pageSlice.length}</strong> of <strong>${sorted.length}</strong> records
            (Page ${currentPage}/${totalPages})
          </div>
        </div>

        <div class="table-scroll-container">
          <table class="data-table sortable-table" id="scansDataTable">
            <thead>
              <tr>
                ${thCell('batch_number', 'Batch / Lot Code', sortKey, sortDir, true)}
                ${thCell('created_at', 'Created At', sortKey, sortDir)}
                <th>Source Image</th>
                <th>Barcode / GTIN</th>
                ${thCell('product_name', 'Product / Brand', sortKey, sortDir)}
                ${thCell('mfg_date', 'Mfg Date', sortKey, sortDir)}
                ${thCell('exp_date', 'Exp Date', sortKey, sortDir)}
                ${thCell('days_left', 'Shelf-Life Status', sortKey, sortDir)}
                <th>M.R.P.</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${renderTableBody(pageSlice, isLoading)}
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        ${totalPages > 1 ? `
        <div class="pagination-bar" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:var(--space-4);border-top:1px solid var(--border-subtle);">
          <button type="button" class="btn btn-secondary btn-sm page-nav-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
            ${iconHtml('chevron-left', 14)}<span>Prev</span>
          </button>
          ${Array.from({length: Math.min(totalPages, 7)}, (_, i) => {
            let pg;
            if (totalPages <= 7) pg = i + 1;
            else if (currentPage <= 4) pg = i + 1;
            else if (currentPage >= totalPages - 3) pg = totalPages - 6 + i;
            else pg = currentPage - 3 + i;
            return `<button type="button" class="btn ${pg === currentPage ? 'btn-primary' : 'btn-secondary'} btn-sm page-nav-btn" data-page="${pg}" style="min-width:32px;">${pg}</button>`;
          }).join('')}
          <button type="button" class="btn btn-secondary btn-sm page-nav-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
            <span>Next</span>${iconHtml('chevron-right', 14)}
          </button>
        </div>
        ` : ''}
      </div>
    `;

    renderIcons(container);
    attachEvents(pageSlice);
  }

  function thCell(key, label, sortKey, sortDir, isSticky = false) {
    const isActive = sortKey === key;
    const icon = isActive ? (sortDir === 'asc' ? 'arrow-up' : 'arrow-down') : 'chevrons-up-down';
    return `
      <th class="${isSticky ? 'col-sticky-first' : ''} sortable-col" data-sort="${key}" style="cursor:pointer;white-space:nowrap;">
        <span style="display:inline-flex;align-items:center;gap:4px;">
          ${label}
          <span style="color:${isActive ? 'var(--accent-teal)' : 'var(--text-muted)'};">${iconHtml(icon, 12)}</span>
        </span>
      </th>
    `;
  }

  function renderTable(pageSlice, loading) {
    // used for initial skeleton only
  }

  function renderTableBody(pageSlice, loading) {
    if (loading) {
      return Array(5).fill(0).map(() => `
        <tr>
          ${Array(11).fill(0).map(() => `<td><div class="skeleton" style="height:14px;border-radius:4px;"></div></td>`).join('')}
        </tr>
      `).join('');
    }
    if (pageSlice.length === 0) {
      return `
        <tr>
          <td colspan="11">
            <div class="empty-state-box">
              <div class="empty-state-icon">${iconHtml('history', 28)}</div>
              <h4 class="empty-state-title">No Scan Records Found</h4>
              <p class="empty-state-desc">Try adjusting your search filters, or capture a new packaging label to populate records.</p>
              <a href="#/scan" class="btn btn-primary btn-sm">${iconHtml('scan-line', 15)} Start Scanning</a>
            </div>
          </td>
        </tr>
      `;
    }

    return pageSlice.map((row, idx) => {
      const bno = row.batch_number || 'UNKNOWN';
      const isUnreadable = !row.batch_number || ['UNKNOWN', 'N/A', '-', 'NULL'].includes(bno.toUpperCase());
      const created = formatDateStandard(row.created_at, true);
      const mfg = formatDateStandard(row.mfg_date);
      const exp = formatDateStandard(row.exp_date);
      const barcode = row.barcode || row.extracted_json?.barcode || 'N/A';
      const product = row.product_name || 'Packaging Unit';
      const location = row.location_shelf || '—';
      const mrp = row.mrp || '—';

      return `
        <tr data-scan-index="${idx}" style="cursor:pointer;">
          <!-- Sticky First Column: Batch Code -->
          <td class="col-sticky-first font-mono" style="font-weight:600;color:var(--text-primary);">
            <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
              <span>${escapeHtml(bno)}</span>
              ${row.isDuplicate ? `<span class="badge-duplicate" title="Duplicate scan detected">Dup×${row.dupCount}</span>` : ''}
              ${isUnreadable ? `<button type="button" class="retry-inline-btn btn btn-secondary btn-sm" data-index="${idx}" style="font-size:10px;padding:1px 6px;" title="Retry OCR">Retry</button>` : ''}
            </div>
          </td>

          <td style="font-size:12px;color:var(--text-muted);">${created}</td>
          <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;" title="${escapeHtml(row.source_filename || '')}">
            ${escapeHtml(row.source_filename || 'Label')}
          </td>
          <td class="font-mono" style="font-size:12px;color:var(--text-secondary);">${escapeHtml(barcode)}</td>
          <td style="font-weight:500;color:var(--text-primary);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(product)}">
            ${escapeHtml(product)}
          </td>
          <td style="font-size:13px;">${mfg}</td>
          <td style="font-size:13px;">${exp}</td>
          <td>${renderStatusBadge(row)}</td>
          <td style="font-weight:600;">${escapeHtml(mrp)}</td>
          <td><span style="font-size:12px;color:var(--text-muted);">${escapeHtml(location)}</span></td>
          <td>
            <div style="display:flex;gap:5px;" onclick="event.stopPropagation();">
              <button type="button" class="btn btn-secondary btn-sm inspect-row-btn" data-index="${idx}" title="Open detail drawer">
                ${iconHtml('eye', 13)}<span>View</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function attachEvents(pageSlice) {
    container.querySelector('#refreshBtn')?.addEventListener('click', loadData);

    // Search
    const searchInput = container.querySelector('#historySearchInput');
    if (searchInput) {
      // Pre-populate and focus if URL param was set
      if (currentSearch && searchInput.value !== currentSearch) {
        searchInput.value = currentSearch;
      }
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          currentSearch = searchInput.value.trim();
          currentPage = 1;
          loadData();
        }
      });
    }

    // Status filter
    const filterSelect = container.querySelector('#historyStatusFilter');
    filterSelect?.addEventListener('change', () => {
      currentStatus = filterSelect.value;
      currentPage = 1;
      loadData();
    });

    // Column sort headers
    container.querySelectorAll('.sortable-col').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-sort');
        if (sortKey === key) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = key;
          sortDir = key === 'created_at' ? 'desc' : 'asc';
        }
        currentPage = 1;
        renderPage();
      });
    });

    // Pagination buttons
    container.querySelectorAll('.page-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pg = parseInt(btn.getAttribute('data-page'), 10);
        if (!isNaN(pg) && pg >= 1) {
          currentPage = pg;
          renderPage();
          container.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Row click → opens drawer
    container.querySelectorAll('#scansDataTable tbody tr[data-scan-index]').forEach(tr => {
      tr.addEventListener('click', () => {
        const idx = parseInt(tr.getAttribute('data-scan-index'), 10);
        if (!isNaN(idx) && pageSlice[idx]) openDrawer(pageSlice[idx]);
      });
    });

    // Inspect buttons
    container.querySelectorAll('.inspect-row-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        if (!isNaN(idx) && pageSlice[idx]) openDrawer(pageSlice[idx]);
      });
    });

    // Retry buttons for unreadable rows
    container.querySelectorAll('.retry-inline-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.hash = '#/scan';
        showToast('Redirecting to Scanner to recapture unreadable label.', 'info');
      });
    });
  }

  loadData();
  return container;
}
