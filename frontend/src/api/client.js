import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const TOKEN_KEY = 'reclaim.token';

export const tokenStore = {
  get: () => AsyncStorage.getItem(TOKEN_KEY),
  set: (token) => AsyncStorage.setItem(TOKEN_KEY, token),
  clear: () => AsyncStorage.removeItem(TOKEN_KEY),
};

async function request(path, { method = 'GET', body } = {}) {
  const token = await tokenStore.get();
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Can't reach the server at ${API_BASE_URL}. Is the backend running?`);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error;
    const detail = Array.isArray(err?.details) ? err.details.join('\n') : '';
    const e = new Error(detail || err?.message || `Request failed (${res.status})`);
    e.status = res.status;
    throw e;
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: () => request('/auth/me'),
  updateOnboarding: (payload) => request('/onboarding', { method: 'PUT', body: payload }),
  completeOnboarding: () => request('/onboarding/complete', { method: 'POST' }),
};
