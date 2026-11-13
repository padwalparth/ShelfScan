/**
 * BatchScan Central API Service
 * Preserves all backend contracts (RPi, Gemini/NVIDIA vision OCR, Supabase Cloud)
 */

export const API_BASE = window.location.origin;

export async function fetchConfig() {
  const res = await fetch(`${API_BASE}/api/config`);
  return res.json();
}

export async function fetchSupabaseStatus() {
  const res = await fetch(`${API_BASE}/api/supabase/status`);
  return res.json();
}

export async function fetchScans(options = {}) {
  const { limit = 100, search = '', status = 'ALL' } = options;
  let url = `${API_BASE}/api/supabase/scans?limit=${limit}`;
  if (search && search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
  if (status && status !== 'ALL') url += `&status=${encodeURIComponent(status)}`;
  
  const res = await fetch(url);
  return res.json();
}

export async function fetchInventory() {
  const res = await fetch(`${API_BASE}/api/supabase/inventory`);
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/api/supabase/stats`);
  return res.json();
}

export async function fetchIntelligence() {
  const res = await fetch(`${API_BASE}/api/supabase/intelligence`);
  return res.json();
}

export async function deleteScan(scanId) {
  const res = await fetch(`${API_BASE}/api/supabase/scans/${scanId}`, {
    method: 'DELETE'
  });
  return res.json();
}

export async function clearAllScans() {
  const res = await fetch(`${API_BASE}/api/supabase/scans`, {
    method: 'DELETE'
  });
  return res.json();
}

export async function extractLabel(formData) {
  const res = await fetch(`${API_BASE}/api/extract`, {
    method: 'POST',
    body: formData
  });
  return res.json();
}

export async function fetchRpiStatus() {
  const res = await fetch(`${API_BASE}/api/rpi/status`);
  return res.json();
}

export async function fetchSampleImages() {
  const res = await fetch(`${API_BASE}/api/samples`);
  return res.json();
}

