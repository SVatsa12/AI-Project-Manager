// src/lib/api.js
export function getToken() {
  return localStorage.getItem('gpa_token') || sessionStorage.getItem('gpa_token') || null;
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Support both Vite and CRA env variables
  const baseUrl = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_API_BASE || 'http://localhost:4003';
  const fullUrl = `${baseUrl}${path}`;

  console.log('[api.js] Fetching:', options.method || 'GET', fullUrl);
  console.log('[api.js] Has token:', !!token);

  const res = await fetch(fullUrl, {
    credentials: 'omit',  // Changed from 'same-origin' for CORS
    ...options,
    headers,
  });

  // Try to parse JSON safely
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error(data?.message || res.statusText || 'Request failed');
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}
