/**
 * BatchScan Executive Dashboard Page — Phase 3+4
 * KPIs · Chart.js (Line, Donut, Bar) · Top Products Bar · Expiring-This-Week Table
 * Fix: initCharts() wrapped in requestAnimationFrame to avoid getContext(null)
 */

import { fetchStats, fetchScans, fetchInventory } from '../api.js';
import { state } from '../state.js';
import { iconHtml, renderIcons } from '../utils/icons.js';
import { formatDateStandard, calculateDaysLeft } from '../utils/dateUtils.js';
import { renderStatusBadge, escapeHtml, formatCurrency } from '../utils/formatters.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

let lineChartInstance = null;
let donutChartInstance = null;
let barChartInstance = null;

export function createDashboardPage() {
  const container = document.createElement('div');
  container.className = 'page-container';

  async function loadDashboard() {
    // Show skeletons immediately
    renderSkeleton();
    try {
      const [statsData, scansData, invData] = await Promise.all([
        fetchStats(),
        fetchScans({ limit: 200 }),
        fetchInventory()
      ]);

      const s = statsData.stats || {};
      state.stats = {
        totalScans: s.total_scans || 0,
        uniqueBatches: s.total_unique_batches || 0,
        validCount: s.valid_count || 0,
        expiringCount: s.expiring_count || 0,
        criticalCount: s.critical_count || 0,
        expiredCount: s.expired_count || 0,
        accuracyRate: s.accuracy_rate || 100,
        valueAtRisk: (s.critical_count || 0) * 120 + (s.expired_count || 0) * 85
      };

      const rawScans = scansData.scans || [];
      // Recalculate days_left dynamically from exp_date
      state.scans = rawScans.map(sc => ({
        ...sc,
        days_left: sc.exp_date ? calculateDaysLeft(sc.exp_date) : sc.days_left
      }));
      state.inventory = invData.inventory || [];

      render();
      // RAF ensures canvas elements are in DOM before Chart.js runs
      requestAnimationFrame(() => setTimeout(initCharts, 30));
    } catch (err) {
      console.error('Dashboard load error:', err);
      render();
    }
  }

  function renderSkeleton() {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Executive Operations Dashboard</h1>
          <p class="page-subtitle">Loading real-time data from Supabase…</p>
        </div>
      </div>
      <div class="kpi-grid">
        ${Array(6).fill(0).map(() => `
          <div class="kpi-card">
            <div class="skeleton" style="height:14px;width:60%;margin-bottom:12px;border-radius:6px;"></div>
            <div class="skeleton" style="height:36px;width:40%;border-radius:6px;"></div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function render() {
    const s = state.stats;
    const all = state.scans || [];

    // Dynamically computed lists
    const expiringSoon = all.filter(x => x.days_left !== null && x.days_left !== undefined && x.days_left >= 0 && x.days_left <= 7);
    const expired = all.filter(x => x.days_left !== null && x.days_left !== undefined && x.days_left < 0);

    // Top products bar chart data
    const productMap = {};
    all.forEach(sc => {
      const name = (sc.product_name || 'Unknown').trim();
      if (name && name !== 'Unknown') productMap[name] = (productMap[name] || 0) + 1;
    });
    const topProducts = Object.entries(productMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);

    // Scan velocity — group by day for last 7 days
    const dayLabels = [];
    const dayData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const dateStr = d.toISOString().slice(0, 10);
      dayLabels.push(label);
      dayData.push(all.filter(sc => (sc.created_at || '').startsWith(dateStr)).length);
    }

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Executive Operations Dashboard</h1>
          <p class="page-subtitle">Real-time packaging OCR velocity, shelf-life integrity &amp; warehouse expiry tracking.</p>
        </div>
        <div class="page-actions">
          <a href="#/scan" class="btn btn-primary btn-sm">
            ${iconHtml('scan-line', 15)}
            <span>New Scan</span>
          </a>
          <button type="button" class="btn btn-secondary btn-sm" id="dashRefreshBtn">
            ${iconHtml('refresh-cw', 15)}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- KPI Cards Strip -->
      <div class="kpi-grid">
        <div class="kpi-card kpi-blue">
          <div class="kpi-header">
            <span class="kpi-title">Total Scans</span>
            <div class="kpi-icon-wrap">${iconHtml('database', 18)}</div>
          </div>
          <div class="kpi-value">${s.totalScans}</div>
          <div class="kpi-footer" style="color:var(--accent-blue);">
            ${iconHtml('check-circle-2', 13)}<span>Supabase cloud sync</span>
          </div>
        </div>

        <div class="kpi-card kpi-purple">
          <div class="kpi-header">
            <span class="kpi-title">Unique Batches</span>
            <div class="kpi-icon-wrap">${iconHtml('boxes', 18)}</div>
          </div>
          <div class="kpi-value">${s.uniqueBatches}</div>
          <div class="kpi-footer" style="color:var(--accent-purple);">
            ${iconHtml('layers', 13)}<span>Master inventory units</span>
          </div>
        </div>

        <div class="kpi-card kpi-teal">
          <div class="kpi-header">
            <span class="kpi-title">Valid Shelf-Life</span>
            <div class="kpi-icon-wrap">${iconHtml('shield-check', 18)}</div>
          </div>
          <div class="kpi-value">${s.validCount}</div>
          <div class="kpi-footer" style="color:var(--accent-teal);">
            ${iconHtml('check', 13)}<span>Fresh stock (&gt; 30 days)</span>
          </div>
        </div>

        <div class="kpi-card kpi-amber">
          <div class="kpi-header">
            <span class="kpi-title">Expiring Soon</span>
            <div class="kpi-icon-wrap">${iconHtml('alert-triangle', 18)}</div>
          </div>
          <div class="kpi-value">${s.expiringCount}</div>
          <div class="kpi-footer" style="color:var(--accent-amber);">
            ${iconHtml('sliders', 13)}<span>4–30 days remaining</span>
          </div>
        </div>

        <div class="kpi-card kpi-rose">
          <div class="kpi-header">
            <span class="kpi-title">Critical / Expired</span>
            <div class="kpi-icon-wrap">${iconHtml('alert-circle', 18)}</div>
          </div>
          <div class="kpi-value">${s.criticalCount + s.expiredCount}</div>
          <div class="kpi-footer" style="color:var(--accent-rose);">
            ${iconHtml('percent', 13)}<span>Requires instant action</span>
          </div>
        </div>

        <div class="kpi-card kpi-rose">
          <div class="kpi-header">
            <span class="kpi-title">Value at Risk</span>
            <div class="kpi-icon-wrap">${iconHtml('tag', 18)}</div>
          </div>
          <div class="kpi-value">${formatCurrency(s.valueAtRisk)}</div>
          <div class="kpi-footer" style="color:var(--accent-rose);">
            ${iconHtml('alert-triangle', 13)}<span>Clearance priority</span>
          </div>
        </div>
      </div>

      <!-- Charts Grid: Line + Donut top row, Bar bottom row -->
      <div class="dash-charts-top">
        <!-- Scan Velocity Line Chart -->
        <div class="table-panel" style="padding:var(--space-5);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);">
            <div>
              <h3 style="font-size:15px;font-weight:700;color:var(--text-primary);">OCR Scan Velocity</h3>
              <p style="font-size:12px;color:var(--text-muted);">Scans ingested over the last 7 days</p>
            </div>
            <span class="status-badge badge-valid">${s.accuracyRate}% Accuracy</span>
          </div>
          <div style="height:230px;position:relative;">
            <canvas id="velocityLineChart"></canvas>
          </div>
        </div>

        <!-- Expiry Distribution Donut -->
        <div class="table-panel" style="padding:var(--space-5);">
          <div style="margin-bottom:var(--space-4);">
            <h3 style="font-size:15px;font-weight:700;color:var(--text-primary);">Inventory Expiry Health</h3>
            <p style="font-size:12px;color:var(--text-muted);">Distribution across shelf-life tiers</p>
          </div>
          <div style="height:230px;position:relative;display:flex;align-items:center;justify-content:center;">
            <canvas id="expiryDonutChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Top Products Bar Chart -->
      ${topProducts.length > 0 ? `
      <div class="table-panel" style="padding:var(--space-5);margin-bottom:var(--space-5);">
        <div style="margin-bottom:var(--space-4);">
          <h3 style="font-size:15px;font-weight:700;color:var(--text-primary);">Top Scanned Products</h3>
          <p style="font-size:12px;color:var(--text-muted);">Most frequently scanned product names</p>
        </div>
        <div style="height:${Math.max(160, topProducts.length * 36)}px;position:relative;">
          <canvas id="topProductsBarChart"></canvas>
        </div>
      </div>
      ` : ''}

      <!-- Expiring This Week Priority List -->
      <div class="table-panel">
        <div class="table-toolbar">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="color:var(--accent-rose);">${iconHtml('alert-triangle', 18)}</span>
            <h3 style="font-size:15px;font-weight:700;color:var(--text-primary);">
              Priority: Expiring This Week
              <span style="font-size:12px;font-weight:400;color:var(--text-muted);margin-left:6px;">${expiringSoon.length} batches</span>
            </h3>
          </div>
          <a href="#/alerts" class="btn btn-secondary btn-sm">
            <span>View All Alerts</span>
            ${iconHtml('chevron-right', 14)}
          </a>
        </div>

        <div class="table-scroll-container">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-sticky-first">Batch Code</th>
                <th>Product / Brand</th>
                <th>Exp Date</th>
                <th>Shelf-Life Status</th>
                <th>M.R.P.</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${expiringSoon.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px;">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
                      ${iconHtml('shield-check', 28)}
                      <span>No critical stock expiring within 7 days. All warehouse units are healthy.</span>
                    </div>
                  </td>
                </tr>
              ` : expiringSoon.slice(0, 8).map(row => `
                <tr>
                  <td class="col-sticky-first font-mono" style="font-weight:600;">${escapeHtml(row.batch_number || 'UNKNOWN')}</td>
                  <td>${escapeHtml(row.product_name || 'Packaging Unit')}</td>
                  <td>${formatDateStandard(row.exp_date)}</td>
                  <td>${renderStatusBadge(row)}</td>
                  <td>${escapeHtml(row.mrp || '-')}</td>
                  <td>
                    <a href="#/alerts" class="btn btn-secondary btn-sm" style="font-size:11px;">
                      <span>Manage Alert</span>
                    </a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Expired Stock Warning -->
      ${expired.length > 0 ? `
      <div style="margin-top:var(--space-4);padding:var(--space-4);background:rgba(244,63,94,0.08);border:1px solid rgba(244,63,94,0.3);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px;color:var(--accent-rose);">
          ${iconHtml('alert-circle', 20)}
          <span style="font-weight:600;">${expired.length} batch${expired.length > 1 ? 'es' : ''} have passed their expiry date and need immediate action.</span>
        </div>
        <a href="#/alerts" class="btn btn-danger btn-sm">View Expired</a>
      </div>
      ` : ''}
    `;

    renderIcons(container);
    container.querySelector('#dashRefreshBtn')?.addEventListener('click', loadDashboard);

    // Store chart data on window for initCharts to read
    window.__dashChartData = { dayLabels, dayData, topProducts, s };
  }

  function initCharts() {
    const data = window.__dashChartData;
    if (!data) return;
    const { dayLabels, dayData, topProducts, s } = data;

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    // Line Chart: Scan Velocity
    const lineCtx = document.getElementById('velocityLineChart')?.getContext('2d');
    if (lineCtx) {
      if (lineChartInstance) lineChartInstance.destroy();
      lineChartInstance = new Chart(lineCtx, {
        type: 'line',
        data: {
          labels: dayLabels,
          datasets: [{
            label: 'Scans Ingested',
            data: dayData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.12)',
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointBackgroundColor: '#10b981',
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { grid: { color: gridColor }, ticks: { color: textColor }, beginAtZero: true }
          }
        }
      });
    }

    // Donut Chart: Expiry Health
    const donutCtx = document.getElementById('expiryDonutChart')?.getContext('2d');
    if (donutCtx) {
      if (donutChartInstance) donutChartInstance.destroy();
      donutChartInstance = new Chart(donutCtx, {
        type: 'doughnut',
        data: {
          labels: ['Valid (>30d)', 'Expiring (4–30d)', 'Critical (0–3d)', 'Expired'],
          datasets: [{
            data: [
              Math.max(s.validCount, 0),
              Math.max(s.expiringCount, 0),
              Math.max(s.criticalCount, 0),
              Math.max(s.expiredCount, 0)
            ],
            backgroundColor: ['#10b981', '#f59e0b', '#f43f5e', '#be123c'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: textColor, boxWidth: 12, padding: 14 } }
          },
          cutout: '72%'
        }
      });
    }

    // Horizontal Bar Chart: Top Products
    const barCtx = document.getElementById('topProductsBarChart')?.getContext('2d');
    if (barCtx && topProducts.length > 0) {
      if (barChartInstance) barChartInstance.destroy();
      barChartInstance = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: topProducts.map(([name]) => name.length > 22 ? name.slice(0, 22) + '…' : name),
          datasets: [{
            label: 'Scan Count',
            data: topProducts.map(([, count]) => count),
            backgroundColor: 'rgba(16,185,129,0.72)',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor, precision: 0 },
              beginAtZero: true
            },
            y: { grid: { display: false }, ticks: { color: textColor } }
          }
        }
      });
    }
  }

  loadDashboard();
  return container;
}
