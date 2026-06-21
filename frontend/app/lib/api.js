export const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const DEFAULT_TIMEOUT_MS = 10000;
const AUTH_TIMEOUT_MS = 20000;

export class ApiError extends Error {
  constructor(message, { status = 0, kind = 'unknown' } = {}) {
    super(message);
    this.status = status;
    this.kind = kind; // 'http' | 'network' | 'timeout' | 'unknown'
  }
}

async function requestApi(path, options = {}, authToken = '', timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  let response;
  try {
    response = await fetch(`${BACKEND_BASE_URL}${path}`, {
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options.headers || {}),
      },
      signal: controller.signal,
      ...options,
    });
  } catch (e) {
    console.log('[requestApi] gerçek hata:', e?.name, e?.message, e);
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
  requestApi('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }, '', AUTH_TIMEOUT_MS);

export const login = (payload) =>
  requestApi('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }, '', AUTH_TIMEOUT_MS);

export const addPet = (payload, token) =>
  requestApi('/api/pets/add', { method: 'POST', body: JSON.stringify(payload) }, token);

export const getMyPets = (ownerId, token) =>
  requestApi(`/api/pets/my-pets/${ownerId}`, {}, token);

export const updatePet = (petId, payload, token) =>
  requestApi(`/api/pets/${petId}`, { method: 'PUT', body: JSON.stringify(payload) }, token);

export const deletePet = (petId, token) =>
  requestApi(`/api/pets/${petId}`, { method: 'DELETE' }, token);

export const uploadPetAvatar = (petId, imageUri, token) => {
  const ext = (imageUri.split('.').pop() || 'jpg').split('?')[0];
  const formData = new FormData();
  formData.append('file', { uri: imageUri, name: `avatar.${ext}`, type: `image/${ext}` });
  return requestApi(`/api/pets/${petId}/avatar`, { method: 'POST', body: formData }, token);
};

export const analyzeMeow = (petId, token, audioUri = null) => {
  if (!audioUri) {
    return requestApi(`/api/analyze/meow?pet_id=${petId}`, { method: 'POST' }, token, 25000);
  }
  const formData = new FormData();
  formData.append('audio', {
    uri: audioUri,
    name: 'meow.wav',
    type: 'audio/wav',
  });
  return requestApi(
    `/api/analyze/meow?pet_id=${petId}`,
    { method: 'POST', body: formData },
    token,
    25000
  );
};

// --- Reminders ------------------------------------------------------------------
export const addReminder = (payload, token) =>
  requestApi('/api/reminders/add', { method: 'POST', body: JSON.stringify(payload) }, token);

export const updateReminder = (reminderId, payload, token) =>
  requestApi(`/api/reminders/${reminderId}`, { method: 'PUT', body: JSON.stringify(payload) }, token);

export const getPetReminders = (petId, token) =>
  requestApi(`/api/reminders/pet/${petId}`, {}, token);

export const getPetReminderHistory = (petId, token) =>
  requestApi(`/api/reminders/history/pet/${petId}`, {}, token);

export const deleteReminder = (reminderId, token) =>
  requestApi(`/api/reminders/${reminderId}`, { method: 'DELETE' }, token);

// --- Chatbot ------------------------------------------------------------------
export const askChatbot = (payload, token) =>
  requestApi('/api/chatbot/ask', { method: 'POST', body: JSON.stringify(payload) }, token);

// --- Auth extended ------------------------------------------------------------
export const verifyEmail = (payload) =>
  requestApi('/api/auth/verify-email', { method: 'POST', body: JSON.stringify(payload) }, '', AUTH_TIMEOUT_MS);

export const resendVerification = (payload) =>
  requestApi('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify(payload) }, '', AUTH_TIMEOUT_MS);

export const forgotPassword = (payload) =>
  requestApi('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) }, '', AUTH_TIMEOUT_MS);

export const resetPassword = (payload) =>
  requestApi('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }, '', AUTH_TIMEOUT_MS);