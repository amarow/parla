import { useState, useEffect } from 'react';
import { useSession } from '../contexts/SessionContext';
import { localAuth } from '../api';
import { SpeedLevel, SPEED_PROFILES, getSpeedProfile } from '../utils/speedConfig';

export default function Settings({ onCancel }) {
  const { user, setUser } = useSession();
  const [nativeLang, setNativeLang] = useState(user.native_language || 'de');
  const [targetLang, setTargetLang] = useState(user.target_language || 'it');
  const [preferredDirection, setPreferredDirection] = useState(user.preferred_direction || 'nativeToForeign');
  const [globalSpeed, setGlobalSpeed] = useState<SpeedLevel>(user.global_speed || getSpeedProfile(user).level);
  const [voiceIt, setVoiceIt] = useState(user.voice_it || '');
  const [voiceDe, setVoiceDe] = useState(user.voice_de || '');
  const [showAnalyseBar, setShowAnalyseBar] = useState(user.show_analyse_bar !== false);
  const [message, setMessage] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => {
      setAvailableVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const profile = SPEED_PROFILES[globalSpeed] || SPEED_PROFILES.medium;
      const updatedUser = await localAuth.updateSettings(user.id, {
        native_language: nativeLang,
        target_language: targetLang,
        preferred_direction: preferredDirection,
        global_speed: globalSpeed,
        pause_time: profile.pauseTime,
        speech_rate: profile.speechRate,
        voice_it: voiceIt,
        voice_de: voiceDe,
        show_analyse_bar: showAnalyseBar
      });
      // User-Objekt aktualisieren
      setUser(updatedUser);
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
          <label>Generelle Lern-Geschwindigkeit:</label>
          <select 
            value={globalSpeed} 
            onChange={(e) => setGlobalSpeed(e.target.value as SpeedLevel)}
          >
            <option value="very_slow">Sehr langsam (ausführliche Pausen & langes Antworten)</option>
            <option value="slow">Langsam (entspanntes Tempo)</option>
            <option value="medium">Mittel (Normal - Standard)</option>
            <option value="fast">Schnell (flottes Tempo)</option>
            <option value="very_fast">Sehr schnell (flüssig)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Vorlesestimme (Italienisch):</label>
          <select 
            value={voiceIt} 
            onChange={(e) => setVoiceIt(e.target.value)}
          >
            <option value="">Standard-Stimme des Browsers</option>
            {availableVoices.filter(v => v.lang.startsWith('it')).map(v => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Vorlesestimme (Deutsch):</label>
          <select 
            value={voiceDe} 
            onChange={(e) => setVoiceDe(e.target.value)}
          >
            <option value="">Standard-Stimme des Browsers</option>
            {availableVoices.filter(v => v.lang.startsWith('de')).map(v => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '15px 0' }}>
          <input 
            type="checkbox" 
            id="showAnalyseBar"
            checked={showAnalyseBar} 
            onChange={(e) => setShowAnalyseBar(e.target.checked)} 
            style={{ width: 'auto', margin: 0 }}
          />
          <label htmlFor="showAnalyseBar" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>Analyse-Leiste während der Übungen anzeigen</label>
        </div>

        {message && <div className="success-message" style={{ textAlign: 'center', color: 'var(--right-color)', fontWeight: 'bold', margin: '10px 0' }}>{message}</div>}

        <button type="submit" className="btn-primary" style={{ marginTop: '20px' }}>
          Speichern
        </button>
      </form>
    </div>
  );
}
