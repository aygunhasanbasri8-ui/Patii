// lib/api.js
// Backend ile iletişimin tek noktası. Vize raporundaki tespit edilen
// eksiklik şuydu: "Frontend'de ağ bağlantısı kesilmesi veya zaman aşımı
// gibi senaryolar için özel bir hata yönetimi stratejisi bulunmamaktadır."
// Bu dosya, timeout + network-down ayrımını da ekleyerek o boşluğu kapatır.

export const BACKEND_BASE_URL = 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 10000;

export class ApiError extends Error {
  constructor(message, { status = 0, kind = 'unknown' } = {}) {
    super(message);
    this.status = status;
    this.kind = kind; // 'http' | 'network' | 'timeout' | 'unknown'
  }
}

async function requestApi(path, options = {}, authToken = '') {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${BACKEND_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options.headers || {}),
      },
      signal: controller.signal,
      ...options,
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new ApiError('İstek zaman aşımına uğradı. Bağlantını kontrol edip tekrar dene.', { kind: 'timeout' });
    }
    throw new ApiError('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.', { kind: 'network' });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let msg = `İstek başarısız (HTTP ${response.status}).`;
    try {
      const data = await response.json();
      if (data?.detail) {
        msg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch (_e) {
      // gövde JSON değilse durum koduna düşülür
    }
    throw new ApiError(msg, { status: response.status, kind: 'http' });
  }

  if (response.status === 204) return null;
  try {
    return await response.json();
  } catch (_e) {
    return null;
  }
}

// --- Auth -----------------------------------------------------------------
export const register = (payload) =>
  requestApi('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });

export const login = (payload) =>
  requestApi('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });

// --- Pets -------------------------------------------------------------------
// BOLA düzeltmesi sonrası: owner_id artık backend tarafından token'dan
// çözülen kullanıcıya göre otomatik atanıyor, frontend'in göndermesine
// gerek yok (ve göndermemeli — payload'da owner_id varsa backend onu
// yok sayar, çünkü PetCreate şemasından kaldırıldı).
export const addPet = (payload, token) =>
  requestApi('/api/pets/add', { method: 'POST', body: JSON.stringify(payload) }, token);

export const getMyPets = (ownerId, token) =>
  requestApi(`/api/pets/my-pets/${ownerId}`, {}, token);

export const updatePet = (petId, payload, token) =>
  requestApi(`/api/pets/${petId}`, { method: 'PUT', body: JSON.stringify(payload) }, token);

export const deletePet = (petId, token) =>
  requestApi(`/api/pets/${petId}`, { method: 'DELETE' }, token);

// --- Analyze ------------------------------------------------------------------
export const analyzeMeow = (petId, token) =>
  requestApi(`/api/analyze/meow?pet_id=${petId}`, { method: 'POST' }, token);

// --- Reminders ------------------------------------------------------------------
export const addReminder = (payload, token) =>
  requestApi('/api/reminders/add', { method: 'POST', body: JSON.stringify(payload) }, token);

export const getPetReminders = (petId, token) =>
  requestApi(`/api/reminders/pet/${petId}`, {}, token);

export const getPetReminderHistory = (petId, token) =>
  requestApi(`/api/reminders/history/pet/${petId}`, {}, token);

export const deleteReminder = (reminderId, token) =>
  requestApi(`/api/reminders/${reminderId}`, { method: 'DELETE' }, token);

// --- Chatbot ------------------------------------------------------------------
export const askChatbot = (payload, token) =>
  requestApi('/api/chatbot/ask', { method: 'POST', body: JSON.stringify(payload) }, token);