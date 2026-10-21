export const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const DEFAULT_TIMEOUT_MS = 10000;
const AUTH_TIMEOUT_MS = 20000;
// Ses analizi model çıkarımı yüzünden uzun sürebiliyor
const ANALYZE_TIMEOUT_MS = 25000;

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
      // gövde JSON değilse varsayılan mesaj kalsın
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

const sendJson = (method, path, payload, token = '', timeoutMs = DEFAULT_TIMEOUT_MS) =>
  requestApi(path, { method, body: JSON.stringify(payload) }, token, timeoutMs);

const authPost = (path, payload) => sendJson('POST', path, payload, '', AUTH_TIMEOUT_MS);

// --- Auth -----------------------------------------------------------------
export const register = (payload) => authPost('/api/auth/register', payload);
export const login = (payload) => authPost('/api/auth/login', payload);
export const verifyEmail = (payload) => authPost('/api/auth/verify-email', payload);
export const resendVerification = (payload) => authPost('/api/auth/resend-verification', payload);
export const forgotPassword = (payload) => authPost('/api/auth/forgot-password', payload);
export const resetPassword = (payload) => authPost('/api/auth/reset-password', payload);

// --- Pets -----------------------------------------------------------------
export const addPet = (payload, token) => sendJson('POST', '/api/pets/add', payload, token);

export const getMyPets = (ownerId, token) =>
  requestApi(`/api/pets/my-pets/${ownerId}`, {}, token);

export const updatePet = (petId, payload, token) =>
  sendJson('PUT', `/api/pets/${petId}`, payload, token);

export const deletePet = (petId, token) =>
  requestApi(`/api/pets/${petId}`, { method: 'DELETE' }, token);

export const uploadPetAvatar = (petId, imageUri, token) => {
  const ext = (imageUri.split('.').pop() || 'jpg').split('?')[0];
  const formData = new FormData();
  formData.append('file', { uri: imageUri, name: `avatar.${ext}`, type: `image/${ext}` });
  return requestApi(`/api/pets/${petId}/avatar`, { method: 'POST', body: formData }, token);
};

export const analyzeMeow = async (petId, token, audioUri = null) => {
  const path = `/api/analyze/meow?pet_id=${petId}`;
  if (!audioUri) {
    return requestApi(path, { method: 'POST' }, token, ANALYZE_TIMEOUT_MS);
  }
  const formData = new FormData();
  if (audioUri instanceof Blob) {
    // Web: MediaRecorder'dan gelen Blob
    const ext = audioUri.type.includes('ogg') ? 'ogg' : 'webm';
    formData.append('audio', audioUri, `meow.${ext}`);
  } else {
    // Native: expo-av'dan gelen dosya URI'si
    formData.append('audio', { uri: audioUri, name: 'meow.wav', type: 'audio/wav' });
  }
  return requestApi(path, { method: 'POST', body: formData }, token, ANALYZE_TIMEOUT_MS);
};

// --- Reminders ------------------------------------------------------------
export const addReminder = (payload, token) =>
  sendJson('POST', '/api/reminders/add', payload, token);

export const updateReminder = (reminderId, payload, token) =>
  sendJson('PUT', `/api/reminders/${reminderId}`, payload, token);

export const getPetReminders = (petId, token) =>
  requestApi(`/api/reminders/pet/${petId}`, {}, token);

export const getPetReminderHistory = (petId, token) =>
  requestApi(`/api/reminders/history/pet/${petId}`, {}, token);

export const deleteReminder = (reminderId, token) =>
  requestApi(`/api/reminders/${reminderId}`, { method: 'DELETE' }, token);

// --- Chatbot --------------------------------------------------------------
export const askChatbot = (payload, token) =>
  sendJson('POST', '/api/chatbot/ask', payload, token);
