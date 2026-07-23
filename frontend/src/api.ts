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
      global_speed: 'medium',
      pause_time: 1200,
      speech_rate: 0.85,
      voice_it: '',
      voice_de: '',
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
export const speakText = async (text: string, langCode: string, rate: number = 1.0, voiceURI?: string): Promise<void> => {
  return new Promise((resolve) => {
    // 1. Cancel any ongoing speech immediately
    window.speechSynthesis.cancel();

    // 2. Create the utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode === 'it' ? 'it-IT' : 'de-DE';
    utterance.rate = rate;
    
    // Optional: Select a better voice if available
    const voices = window.speechSynthesis.getVoices();
    let preferredVoice;
    
    if (voiceURI) {
      preferredVoice = voices.find(v => v.voiceURI === voiceURI);
    }
    
    if (!preferredVoice) {
      // Prefer Google voices as they often sound more natural even in the browser
      preferredVoice = voices.find(v => v.lang.startsWith(langCode) && v.name.includes('Google'));
    }
    
    if (preferredVoice) utterance.voice = preferredVoice;

    // 3. Resolve when finished
    utterance.onend = () => {
      window.dispatchEvent(new Event('tts-end'));
      resolve();
    };
    utterance.onerror = () => {
      window.dispatchEvent(new Event('tts-end'));
      resolve();
    };

    // 4. Start speaking
    window.dispatchEvent(new Event('tts-start'));
    window.speechSynthesis.speak(utterance);
  });
};
