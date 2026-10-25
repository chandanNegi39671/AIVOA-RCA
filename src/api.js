const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, options);
  } catch {
    throw new Error('AIVOA backend is unreachable. Start the FastAPI server and check VITE_API_BASE_URL.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail || data.message || `Request failed (${response.status})`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return data;
}

export async function checkBackendHealth() {
  try {
    const data = await request('/health', { signal: AbortSignal.timeout(3000) });
    return { ok: data.status === 'ok', ...data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function extractIncidentWithAI(payload) {
  const formData = new FormData();
  if (payload.text) formData.append('text', payload.text);
  if (payload.file) formData.append('file', payload.file);
  return request('/api/rca/extract', { method: 'POST', body: formData, signal: AbortSignal.timeout(60000) });
}

export async function analyzeIncident(payload) {
  return request('/api/rca/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });
}

export async function saveInvestigation(investigation) {
  const existingId = investigation.backend_id;
  const payload = { ...investigation };
  delete payload.backend_id;
  return request(existingId ? `/api/investigations/${encodeURIComponent(existingId)}` : '/api/investigations', {
    method: existingId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
}

export async function fetchInvestigations({ limit = 50, offset = 0 } = {}) {
  return request(`/api/investigations?limit=${limit}&offset=${offset}`, { signal: AbortSignal.timeout(15000) });
}

export async function fetchInvestigation(id) {
  return request(`/api/investigations/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(15000) });
}

// Kept only for explicit offline intake; this never claims to be AI-generated.
export function offlineKeywordExtract(text) {
  if (!text?.trim()) return null;
  return {
    title: null, product: null, batch: null, severity: null,
    narrative: text.trim(), whys: ['', '', '', '', ''],
    fishbone: { People: [], Process: [], Equipment: [], Materials: [], Measurement: [], Environment: [] },
    factors: [], capas: [], evidence_gaps: [], source: 'manual-entry',
  };
}
