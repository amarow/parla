import { useState } from 'react';
import { localAuth } from '../api';

export default function Settings({ user, onUpdateUser, onCancel }) {
  const [nativeLang, setNativeLang] = useState(user.native_language);
  const [targetLang, setTargetLang] = useState(user.target_language);
  const [preferredDirection, setPreferredDirection] = useState(user.preferred_direction || 'nativeToForeign');
  const [pauseTime, setPauseTime] = useState(user.pause_time || 800);
  const [geminiApiKey, setGeminiApiKey] = useState(user.gemini_api_key || '');
  const [message, setMessage] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const updatedUser = await localAuth.updateSettings(user.id, {
        native_language: nativeLang,
        target_language: targetLang,
        preferred_direction: preferredDirection,
        pause_time: Number(pauseTime),
        gemini_api_key: geminiApiKey
      });
      // User-Objekt aktualisieren
      onUpdateUser(updatedUser);
      setMessage('Einstellungen gespeichert!');
      setTimeout(() => onCancel(), 1500); // Zurück zur Hauptansicht
    } catch (err) {
      setMessage('Fehler beim Speichern.');
    }
  };

  const getLangName = (code) => {
    const map = { de: 'Deutsch', en: 'Englisch', it: 'Italienisch', es: 'Spanisch', fr: 'Französisch' };
    return map[code] || code;
  };

  return (
    <div className="card-panel">
      <div className="session-header">
        <h2>Einstellungen</h2>
        <button onClick={onCancel} className="btn-cancel">Zurück</button>
      </div>
      
      <p style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1.1rem', color: 'var(--text-muted)' }}>
        Willkommen, <strong>{user.username}</strong>!
      </p>

      <form onSubmit={handleSave}>
        <div className="form-group">
          <label>Meine Muttersprache:</label>
          <select value={nativeLang} onChange={(e) => setNativeLang(e.target.value)}>
            <option value="de">Deutsch</option>
            <option value="en">Englisch</option>
            <option value="es">Spanisch</option>
            <option value="fr">Französisch</option>
            <option value="it">Italienisch</option>
          </select>
        </div>

        <div className="form-group">
          <label>Ich möchte lernen:</label>
          <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
            <option value="it">Italienisch</option>
            <option value="es">Spanisch</option>
            <option value="fr">Französisch</option>
            <option value="en">Englisch</option>
            <option value="de">Deutsch</option>
          </select>
        </div>

        <div className="form-group">
          <label>Standard-Lernrichtung:</label>
          <select 
            value={preferredDirection} 
            onChange={(e) => setPreferredDirection(e.target.value)}
          >
            <option value="nativeToForeign">
              {getLangName(nativeLang)} ➔ {getLangName(targetLang)}
            </option>
            <option value="foreignToNative">
              {getLangName(targetLang)} ➔ {getLangName(nativeLang)}
            </option>
          </select>
        </div>

        <div className="form-group">
          <label>Pausenzeit beim Vorlesen:</label>
          <select 
            value={pauseTime} 
            onChange={(e) => setPauseTime(Number(e.target.value))}
          >
            <option value={400}>Kurz (0,4s)</option>
            <option value={800}>Mittel (0,8s)</option>
            <option value={1500}>Lang (1,5s)</option>
            <option value={2200}>Extra Lang (2,2s)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Gemini API Key (für bessere Spracherkennung):</label>
          <input 
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="Dein Google Gemini API Key"
            className="input-field"
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Erforderlich für hochwertiges Speech-to-Text. Der Key wird nur lokal in deinem Browser gespeichert.
          </p>
        </div>

        {message && <div className="success-message" style={{ textAlign: 'center', color: 'var(--right-color)', fontWeight: 'bold', margin: '10px 0' }}>{message}</div>}

        <button type="submit" className="btn-primary" style={{ marginTop: '20px' }}>
          Speichern
        </button>
      </form>
    </div>
  );
}
