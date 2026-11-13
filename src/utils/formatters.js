/**
 * BatchScan Visual Formatters & Status Badge Generators
 * Phase 3+4: Dynamic status from live exp_date, clean badges (no emojis in class names)
 */

import { calculateDaysLeft } from './dateUtils.js';

/**
 * Returns formatted HTML for shelf-life status badges with accurate styles
 */
export function renderStatusBadge(row, onRetryClick = null) {
  const batchNo = String(row.batch_number || '').trim().toUpperCase();
  const expDate = row.exp_date;
  const isUnreadable = !batchNo || ['UNKNOWN', 'N/A', '-', 'NULL'].includes(batchNo);

  // Bug 5 fix: "UNKNOWN" / "N/A" rows must show "Couldn't read label" with a Retry button
  if (isUnreadable) {
    return `
      <span class="status-badge badge-unreadable">
        <span class="status-badge-dot"></span>
        <span>Couldn't read label</span>
        <button type="button" class="retry-inline-btn" data-retry-id="${row.id || ''}" title="Retry OCR Extraction">Retry</button>
      </span>
    `;
  }

  // Calculate live days left
  const daysLeft = row.days_left !== undefined && row.days_left !== null
    ? row.days_left
    : calculateDaysLeft(expDate);

  if (daysLeft === null) {
    return `
      <span class="status-badge badge-valid">
        <span class="status-badge-dot"></span>
        <span>${row.expiry_status || 'DETECTED'}</span>
      </span>
    `;
  }

  if (daysLeft < 0) {
    return `
      <span class="status-badge badge-expired">
        <span class="status-badge-dot"></span>
        <span>⛔ EXPIRED (${Math.abs(daysLeft)}d ago)</span>
      </span>
    `;
  }

  if (daysLeft <= 3) {
    return `
      <span class="status-badge badge-critical">
        <span class="status-badge-dot"></span>
        <span>🚨 ${daysLeft === 0 ? 'EXPIRES TODAY' : `EXPIRES IN ${daysLeft}d`}</span>
      </span>
    `;
  }

  if (daysLeft <= 30) {
    return `
      <span class="status-badge badge-expiring">
        <span class="status-badge-dot"></span>
        <span>⚠️ EXPIRING (${daysLeft}d)</span>
      </span>
    `;
  }

  return `
    <span class="status-badge badge-valid">
      <span class="status-badge-dot"></span>
      <span>✅ VALID (${daysLeft}d left)</span>
    </span>
  `;
}

/**
 * Sanitizes HTML strings
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats currency values
 */
export function formatCurrency(val) {
  if (!val) return '₹0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.]/g, ''));
  if (isNaN(num)) return String(val);
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

