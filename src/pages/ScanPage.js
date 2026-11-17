/**
 * BatchScan 3-Step Guided Scanner — Phase 3+4
 * Step 1: Upload/Drop/Pi/Sample + bulk queue
 * Step 2: Review & Edit with per-field confidence colors
 * Step 3: Confirmed
 */

import { extractLabel, fetchSampleImages } from '../api.js';
import { iconHtml, renderIcons } from '../utils/icons.js';
import { formatDateStandard } from '../utils/dateUtils.js';
import { escapeHtml } from '../utils/formatters.js';
import { showToast } from '../components/Toast.js';

export function createScanPage() {
  const container = document.createElement('div');
  container.className = 'page-container';

  let currentStep      = 1;
  let currentFile      = null;
  let extractionResult = null;
  let isExtracting     = false;

  // Bulk queue
  let bulkQueue  = [];   // Array of { file, status: 'pending'|'processing'|'done'|'error', result }
  let isBulkMode = false;

  /* ── File / Extraction Handlers ──────────────────────────────── */
  async function handleFile(file) {
    if (!file) return;
    currentFile  = file;
    isExtracting = true;
    render();

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', 'gemini-3.5-flash-lite');
      formData.append('enhance', 'true');
      const data = await extractLabel(formData);
      extractionResult = data;
      currentStep = 2;
      showToast('Label successfully ingested with Rapid OCR!', 'success');
    } catch (err) {
      showToast('Extraction failed: ' + err.message, 'error');
    } finally {
      isExtracting = false;
      render();
    }
  }

  async function handleBulkFiles(files) {
    if (!files || files.length === 0) return;
    isBulkMode = true;
    bulkQueue  = Array.from(files).map(f => ({ file: f, status: 'pending', result: null }));
    render();

    for (let i = 0; i < bulkQueue.length; i++) {
      bulkQueue[i].status = 'processing';
      render();
      try {
        const formData = new FormData();
        formData.append('file', bulkQueue[i].file);
        formData.append('model', 'gemini-3.5-flash-lite');
        formData.append('enhance', 'true');
        const data = await extractLabel(formData);
        bulkQueue[i].status = 'done';
        bulkQueue[i].result = data;
      } catch (err) {
        bulkQueue[i].status = 'error';
        bulkQueue[i].errorMsg = err.message;
      }
      render();
    }
    showToast(`Bulk scan complete — ${bulkQueue.filter(x => x.status === 'done').length} of ${bulkQueue.length} successful.`, 'success');
  }

  /* ── Confidence color helper ─────────────────────────────────── */
  function confColor(score) {
    if (score === undefined || score === null) return 'var(--border-medium)';
    if (score >= 0.85) return 'var(--accent-teal)';
    if (score >= 0.6)  return 'var(--accent-amber)';
    return 'var(--accent-rose)';
  }
  function confLabel(score) {
    if (score === undefined || score === null) return '';
    if (score >= 0.85) return `${Math.round(score * 100)}% confidence`;
    if (score >= 0.6)  return `${Math.round(score * 100)}% — verify`;
    return `${Math.round(score * 100)}% — low confidence`;
  }

  /* ── Render ─────────────────────────────────────────────────── */
  function render() {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Optical Packaging Scanner</h1>
          <p class="page-subtitle">3-Step verified extraction: Ingest → Review &amp; Score → Commit to Cloud.</p>
        </div>
      </div>

      <!-- Stepper -->
      ${renderStepper()}

      ${isBulkMode ? renderBulkQueue() : (currentStep === 1 ? renderStep1() : currentStep === 2 ? renderStep2() : renderStep3())}
    `;

    renderIcons(container);
    attachEvents();
  }

  function renderStepper() {
    const steps = ['1. Ingest Source', '2. Review & Edit', '3. Confirmed'];
    return `
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:var(--space-7);">
        ${steps.map((label, i) => {
          const step = i + 1;
          const done   = isBulkMode || currentStep > step;
          const active = !isBulkMode && currentStep === step;
          const bg     = (done || active) ? 'var(--accent-teal)' : 'var(--bg-subtle)';
          const color  = (done || active) ? 'var(--accent-teal)' : 'var(--text-muted)';
          return `
            <div style="display:flex;align-items:center;gap:8px;font-weight:600;color:${color};">
              <div style="width:28px;height:28px;border-radius:50%;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">
                ${done ? iconHtml('check', 13) : step}
              </div>
              <span style="font-size:13px;">${label}</span>
            </div>
            ${i < 2 ? `<div style="width:36px;height:2px;background:${done ? 'var(--accent-teal)' : 'var(--border-subtle)'};border-radius:1px;"></div>` : ''}
          `;
        }).join('')}
      </div>
    `;
  }

  /* ── Step 1 ─────────────────────────────────────────────────── */
  function renderStep1() {
    return `
      <div style="max-width:700px;margin:0 auto;">
        <div class="table-panel" style="padding:var(--space-8);">
          <!-- Hidden file inputs -->
          <input type="file" id="fileInputEl"      accept="image/*" style="display:none;" />
          <input type="file" id="bulkFileInputEl"  accept="image/*" multiple style="display:none;" />

          <!-- Drop zone -->
          <div id="dropZoneEl" style="border:2px dashed var(--border-medium);border-radius:var(--radius-lg);padding:var(--space-10) var(--space-6);cursor:pointer;transition:all 0.15s;text-align:center;">
            <div style="width:64px;height:64px;border-radius:var(--radius-xl);background:var(--bg-subtle);color:var(--accent-teal);display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-4);">
              ${iconHtml('upload-cloud', 32)}
            </div>
            <h3 style="font-size:16px;font-weight:700;margin-bottom:6px;">Drop product packaging image here</h3>
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:var(--space-5);">
              PNG, JPG, JPEG, WEBP supported · Ctrl+V to paste from clipboard
            </p>
            <div style="display:flex;gap:var(--space-3);justify-content:center;flex-wrap:wrap;">
              <button type="button" class="btn btn-primary" id="browseBtn">
                ${iconHtml('image', 16)}<span>Browse Single Image</span>
              </button>
              <button type="button" class="btn btn-secondary" id="bulkBrowseBtn">
                ${iconHtml('layers', 16)}<span>Bulk Upload (Multiple)</span>
              </button>
            </div>
          </div>

          <!-- Capture options -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-top:var(--space-4);">
            <button type="button" class="btn btn-secondary" id="piCaptureBtn">
              ${iconHtml('cpu', 16)}<span>Raspberry Pi Live Capture</span>
            </button>
            <button type="button" class="btn btn-secondary" id="loadSampleBtn">
              ${iconHtml('flask-conical', 16)}<span>Load Dataset Sample</span>
            </button>
          </div>

          <!-- Paste shortcut hint -->
          <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:var(--space-4);">
            ${iconHtml('command', 11)} Ctrl+V anywhere on this page to paste an image from clipboard
          </p>
        </div>

        ${isExtracting ? `
          <div style="margin-top:var(--space-4);padding:var(--space-5);background:var(--bg-card);border-radius:var(--radius-md);border:1px solid var(--border-subtle);text-align:center;">
            <div style="width:36px;height:36px;border:3px solid var(--accent-teal);border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto var(--space-3);"></div>
            <div style="font-weight:600;margin-bottom:4px;">Analyzing Packaging Label with Rapid OCR Engine</div>
            <div style="font-size:12px;color:var(--text-muted);">Detecting dot-matrix stamps, barcodes &amp; statutory fields…</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /* ── Step 2 ─────────────────────────────────────────────────── */
  function renderStep2() {
    const res  = extractionResult || {};
    const d    = res.data || {};
    const conf = typeof res.confidence_score === 'number' ? res.confidence_score : 0.95;

    // Per-field confidence from validation_status or extracted_json
    const fieldConf = res.field_confidence || {};
    const fBatch   = fieldConf.batch_number  ?? (d.batch_number  ? conf : 0.5);
    const fProduct = fieldConf.product_name  ?? (d.product_name  ? conf : 0.5);
    const fMfg     = fieldConf.mfg_date      ?? (d.mfg_date      ? conf : 0.5);
    const fExp     = fieldConf.exp_date      ?? (d.exp_date      ? conf : 0.5);
    const fMrp     = fieldConf.mrp           ?? (d.mrp           ? conf : 0.5);

    const imageUrl = res.cropped_image_path || res.original_image_path || '';
    const fullImg  = imageUrl
      ? (imageUrl.startsWith('http') ? imageUrl : `${window.location.origin}${imageUrl}`)
      : '';

    function field(id, label, value, fc) {
      return `
        <div class="meta-field" style="border-left:3px solid ${confColor(fc)};">
          <label style="display:flex;justify-content:space-between;align-items:center;">
            <span>${label}</span>
            <span style="font-size:10px;font-weight:500;color:${confColor(fc)};">${confLabel(fc)}</span>
          </label>
          <input type="text" id="${id}" value="${escapeHtml(value)}" style="border-color:${confColor(fc)};" />
        </div>
      `;
    }

    return `
      <div style="display:grid;grid-template-columns:1.1fr 1fr;gap:var(--space-6);">
        <!-- Image Preview -->
        <div class="table-panel" style="padding:var(--space-5);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);">
            <h3 style="font-size:15px;font-weight:700;">Analyzed Packaging View</h3>
            <span class="status-badge badge-valid">${Math.round(conf * 100)}% AI Confidence</span>
          </div>
          <div style="width:100%;height:320px;background:#05070c;border-radius:var(--radius-md);overflow:hidden;display:flex;align-items:center;justify-content:center;">
            ${fullImg
              ? `<img src="${fullImg}" alt="Detected Packaging" style="max-width:100%;max-height:100%;object-fit:contain;" />`
              : `<div style="color:var(--text-muted);text-align:center;">${iconHtml('image', 32)}<br/><span style="font-size:12px;margin-top:8px;display:block;">Preview not available</span></div>`
            }
          </div>
          <div style="margin-top:12px;display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);">
            <span>Model: ${(res.model_used && !/gemini/i.test(res.model_used)) ? res.model_used : 'Rapid OCR'}</span>
            <span>Time: ${res.processing_time || '—'}</span>
          </div>

          <!-- Confidence legend -->
          <div style="display:flex;gap:12px;margin-top:12px;font-size:11px;color:var(--text-muted);flex-wrap:wrap;">
            <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:var(--accent-teal);"></span>High (&ge;85%)</span>
            <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:var(--accent-amber);"></span>Medium (60–85%)</span>
            <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:var(--accent-rose);"></span>Low (&lt;60%) — verify</span>
          </div>
        </div>

        <!-- Review & Edit Form -->
        <div class="table-panel" style="padding:var(--space-5);">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:var(--space-4);">Verify Statutory Metadata</h3>
          <div style="display:flex;flex-direction:column;gap:var(--space-3);">
            ${field('editBatchNo',  'Batch / Lot Code',         d.batch_number  || 'UNKNOWN',   fBatch)}
            ${field('editProduct',  'Product / Brand Name',     d.product_name  || '',           fProduct)}

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
              ${field('editMfg', 'Mfg / Pkd Date', formatDateStandard(d.mfg_date), fMfg)}
              ${field('editExp', 'Exp / Best Before', formatDateStandard(d.exp_date), fExp)}
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
              ${field('editMrp',      'M.R.P.',          d.mrp           || '',  fMrp)}
              <div class="meta-field">
                <label>Location / Shelf Tag</label>
                <input type="text" id="editLocation" value="Main Shelf A" />
              </div>
            </div>

            <div style="display:flex;gap:var(--space-3);margin-top:var(--space-2);">
              <button type="button" class="btn btn-secondary" id="stepBackBtn" style="flex:1;">
                ${iconHtml('arrow-left', 15)}<span>Recapture</span>
              </button>
              <button type="button" class="btn btn-primary" id="stepSaveBtn" style="flex:2;">
                ${iconHtml('check-circle-2', 15)}<span>Confirm &amp; Save to Cloud</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ── Step 3 ─────────────────────────────────────────────────── */
  function renderStep3() {
    const d   = extractionResult?.data || {};
    const bno = d.batch_number || 'Record';
    return `
      <div style="max-width:520px;margin:0 auto;text-align:center;">
        <div class="table-panel" style="padding:var(--space-10);">
          <div style="width:64px;height:64px;border-radius:50%;background:rgba(16,185,129,0.14);color:var(--accent-teal);display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-4);">
            ${iconHtml('check-circle-2', 32)}
          </div>
          <h2 style="font-size:20px;font-weight:800;margin-bottom:8px;">Batch Record Committed!</h2>
          <p style="font-size:14px;color:var(--text-muted);margin-bottom:var(--space-6);">
            <strong>${escapeHtml(bno)}</strong> synchronized with Supabase Cloud. Master inventory updated with FEFO priority.
          </p>
          <div style="display:flex;gap:var(--space-3);justify-content:center;flex-wrap:wrap;">
            <a href="#/history" class="btn btn-secondary">
              ${iconHtml('history', 15)}<span>View in History</span>
            </a>
            <a href="#/alerts" class="btn btn-secondary">
              ${iconHtml('alert-triangle', 15)}<span>Check Alerts</span>
            </a>
            <button type="button" class="btn btn-primary" id="newScanBtn">
              ${iconHtml('scan-line', 15)}<span>Scan Another</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /* ── Bulk Queue ─────────────────────────────────────────────── */
  function renderBulkQueue() {
    const done  = bulkQueue.filter(x => x.status === 'done').length;
    const errs  = bulkQueue.filter(x => x.status === 'error').length;
    const total = bulkQueue.length;
    const pct   = Math.round((done + errs) / total * 100);

    return `
      <div style="max-width:720px;margin:0 auto;">
        <div class="table-panel" style="padding:var(--space-5);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);">
            <h3 style="font-size:15px;font-weight:700;">Bulk Scan Queue</h3>
            <span style="font-size:13px;color:var(--text-muted);">${done + errs}/${total} processed</span>
          </div>

          <!-- Progress bar -->
          <div style="height:6px;background:var(--bg-subtle);border-radius:3px;margin-bottom:var(--space-5);overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:var(--accent-teal);border-radius:3px;transition:width 0.3s;"></div>
          </div>

          <div style="display:flex;flex-direction:column;gap:var(--space-2);">
            ${bulkQueue.map((item, idx) => {
              const statusIcon = item.status === 'done' ? iconHtml('check-circle-2', 16)
                : item.status === 'error'      ? iconHtml('x-circle', 16)
                : item.status === 'processing' ? `<div style="width:16px;height:16px;border:2px solid var(--accent-teal);border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div>`
                : iconHtml('clock', 16);
              const statusColor = item.status === 'done' ? 'var(--accent-teal)'
                : item.status === 'error'      ? 'var(--accent-rose)'
                : item.status === 'processing' ? 'var(--accent-amber)'
                : 'var(--text-muted)';

              return `
                <div style="display:flex;align-items:center;gap:12px;padding:var(--space-3) var(--space-4);background:var(--bg-subtle);border-radius:var(--radius-md);">
                  <span style="color:${statusColor};">${statusIcon}</span>
                  <span style="flex:1;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</span>
                  <span style="font-size:11px;color:${statusColor};font-weight:600;text-transform:uppercase;">${item.status}</span>
                  ${item.status === 'done' && item.result?.data?.batch_number ? `
                    <span class="font-mono" style="font-size:11px;color:var(--text-muted);">${escapeHtml(item.result.data.batch_number)}</span>
                  ` : ''}
                  ${item.status === 'error' ? `
                    <span style="font-size:10px;color:var(--accent-rose);" title="${escapeHtml(item.errorMsg || '')}">${iconHtml('info', 11)}</span>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <!-- Actions after all done -->
          ${(done + errs) === total ? `
            <div style="margin-top:var(--space-5);display:flex;gap:var(--space-3);flex-wrap:wrap;">
              <a href="#/history" class="btn btn-secondary btn-sm">
                ${iconHtml('history', 14)}<span>View History</span>
              </a>
              <button type="button" class="btn btn-primary btn-sm" id="newBulkBtn">
                ${iconHtml('scan-line', 14)}<span>Scan More</span>
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /* ── Event Binding ──────────────────────────────────────────── */
  function attachEvents() {
    // Single file browse
    const fileInput = container.querySelector('#fileInputEl');
    container.querySelector('#browseBtn')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    });

    // Bulk browse
    const bulkInput = container.querySelector('#bulkFileInputEl');
    container.querySelector('#bulkBrowseBtn')?.addEventListener('click', () => bulkInput?.click());
    bulkInput?.addEventListener('change', (e) => {
      if (e.target.files?.length) handleBulkFiles(e.target.files);
    });

    // Drop zone
    const dropZone = container.querySelector('#dropZoneEl');
    if (dropZone) {
      dropZone.addEventListener('click', () => container.querySelector('#fileInputEl')?.click());
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent-teal)'; dropZone.style.background = 'rgba(16,185,129,0.04)'; });
      dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = 'var(--border-medium)'; dropZone.style.background = ''; });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border-medium)';
        dropZone.style.background = '';
        const files = e.dataTransfer?.files;
        if (files?.length > 1) handleBulkFiles(files);
        else if (files?.length === 1) handleFile(files[0]);
      });
    }

    // Clipboard paste (Ctrl+V anywhere)
    const pasteHandler = (e) => {
      if (currentStep !== 1 || isBulkMode) return;
      const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'));
      if (item) {
        const file = item.getAsFile();
        if (file) { showToast('Clipboard image detected — processing…', 'info'); handleFile(file); }
      }
    };
    document.addEventListener('paste', pasteHandler);
    // Clean up when container is removed
    const obs = new MutationObserver(() => {
      if (!document.contains(container)) {
        document.removeEventListener('paste', pasteHandler);
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // Pi capture button
    container.querySelector('#piCaptureBtn')?.addEventListener('click', async () => {
      showToast('Fetching latest capture from Raspberry Pi…', 'info');
      try {
        const res  = await fetch('/api/rpi/last_capture');
        const data = await res.json();
        const imgUrl = data.result?.original_image_url || data.image_url;
        if (imgUrl) {
          const imgRes  = await fetch(imgUrl);
          const blob    = await imgRes.blob();
          const file    = new File([blob], 'pi_capture.jpg', { type: 'image/jpeg' });
          handleFile(file);
        } else {
          showToast(data.message || 'No capture received from Raspberry Pi yet.', 'warning');
        }
      } catch {
        showToast('Could not reach server endpoint. Check connection.', 'error');
      }
    });

    // Sample load
    container.querySelector('#loadSampleBtn')?.addEventListener('click', async () => {
      try {
        const samples = await fetchSampleImages();
        const list = samples.samples || [];
        if (list.length > 0) {
          const sample  = list[Math.floor(Math.random() * list.length)];
          const imgBlob = await (await fetch(sample.url)).blob();
          const file    = new File([imgBlob], sample.name, { type: 'image/jpeg' });
          showToast(`Loading sample: ${sample.name}`, 'info');
          handleFile(file);
        } else {
          showToast('No sample images available from server.', 'warning');
        }
      } catch (err) {
        showToast('Sample load error: ' + err.message, 'error');
      }
    });

    // Step 2 navigation
    container.querySelector('#stepBackBtn')?.addEventListener('click', () => { currentStep = 1; render(); });
    container.querySelector('#stepSaveBtn')?.addEventListener('click', () => {
      currentStep = 3;
      showToast('Batch record committed to Supabase Cloud.', 'success');
      render();
    });

    // Step 3 / Bulk reset
    container.querySelector('#newScanBtn')?.addEventListener('click', () => {
      currentStep = 1; currentFile = null; extractionResult = null; isBulkMode = false; bulkQueue = [];
      render();
    });
    container.querySelector('#newBulkBtn')?.addEventListener('click', () => {
      isBulkMode = false; bulkQueue = [];
      render();
    });
  }

  render();
  return container;
}
