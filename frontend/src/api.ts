import { dataService } from './dataService';

const isProd = import.meta.env.PROD;
export const API_BASE = isProd ? '/api' : 'http://localhost:3001/api';
export const BASE_URL = isProd ? '' : 'http://localhost:3001';

// --- Local Storage Auth Mock ---
export const localAuth = {
  register: async (userData: any) => {
    const users = JSON.parse(localStorage.getItem('parladino_users') || '[]');
    if (users.find((u: any) => u.username === userData.username)) {
      throw new Error('Username existiert bereits');
    }
    const newUser = { 
      native_language: 'de',
      target_language: 'it',
      preferred_direction: 'nativeToForeign',
      pause_time: 800,
      ...userData, 
      id: Date.now() 
    };
    users.push(newUser);
    localStorage.setItem('parladino_users', JSON.stringify(users));
    return newUser;
  },
  login: async (credentials: any) => {
    const users = JSON.parse(localStorage.getItem('parladino_users') || '[]');
    const user = users.find((u: any) => u.username === credentials.username && u.password === credentials.password);
    if (!user) throw new Error('Ungültige Zugangsdaten');
    return user;
  },
  updateSettings: async (userId: any, settings: any) => {
    const users = JSON.parse(localStorage.getItem('parladino_users') || '[]');
    const index = users.findIndex((u: any) => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...settings };
      localStorage.setItem('parladino_users', JSON.stringify(users));
      return users[index];
    }
    throw new Error('User nicht gefunden');
  }
};

// --- Clean Browser-only TTS Service ---
export const speakText = async (text: string, langCode: string): Promise<void> => {
  return new Promise((resolve) => {
    // 1. Cancel any ongoing speech immediately
    window.speechSynthesis.cancel();

    // 2. Create the utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode === 'it' ? 'it-IT' : 'de-DE';
    
    // Optional: Select a better voice if available
    const voices = window.speechSynthesis.getVoices();
    // Prefer Google voices as they often sound more natural even in the browser
    const preferredVoice = voices.find(v => v.lang.startsWith(langCode) && v.name.includes('Google'));
    if (preferredVoice) utterance.voice = preferredVoice;

    // 3. Resolve when finished
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    // 4. Start speaking
    window.speechSynthesis.speak(utterance);
  });
};
