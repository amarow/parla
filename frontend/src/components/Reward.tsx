import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useVoice } from '../contexts/VoiceContext';
import { API_BASE } from '../api';

export default function Reward({ onNext, onRepeat, onCancel, flips }) {
  const { transcript, clearTranscript, setLanguage } = useVoice();
  const hasPlayedAudio = useRef(false);

  // Stelle sicher, dass die Befehlserkennung hier auf Deutsch läuft
  useEffect(() => {
    setLanguage('de-DE');
  }, [setLanguage]);

  useEffect(() => {
    if (hasPlayedAudio.current) return;
    hasPlayedAudio.current = true;

    let textToPlay = 'Fertig! ';
    if (flips === 0) {
      textToPlay += 'Perfekt, keinmal nachgeschaut!';
    } else {
      textToPlay += `Du hast ${flips} mal nachgeschaut.`;
    }

    const url = `${API_BASE}/tts?text=${encodeURIComponent(textToPlay)}&lang=de`;
    const audio = new Audio(url);
    audio.play().catch(err => console.warn('Audio konnte nicht abgespielt werden:', err));
  }, [flips]);

  useEffect(() => {
    if (!transcript) return;

    const lower = transcript.toLowerCase();
    if (lower.includes('weiter') || lower.includes('nächste') || lower.includes('runde') || lower.includes('starten') || lower.includes('ok')) {
      clearTranscript();
      onNext();
    } else if (lower.includes('wiederholen') || lower.includes('nochmal')) {
      clearTranscript();
      if (onRepeat) onRepeat();
    } else if (lower.includes('zurück') || lower.includes('abbrechen') || lower.includes('ende')) {
      clearTranscript();
      onCancel();
    }
  }, [transcript, onNext, onRepeat, onCancel, clearTranscript]);

  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="reward-container card-panel text-center" style={{ display: 'flex', flexDirection: 'column', minHeight: '50vh' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="confetti-emoji" style={{ fontSize: '4rem', marginBottom: '20px' }}>🎉🎉🎉</div>
        <h2>Fantastisch!</h2>
        <p>Du hast die Lektion erfolgreich abgeschlossen!</p>
        {flips > 0 ? (
          <p style={{ marginTop: '10px', fontSize: '1.1rem' }}>
            Du hast <strong>{flips}</strong> {flips === 1 ? 'Mal' : 'Mal'} nachgeschaut.
          </p>
        ) : (
          <p style={{ marginTop: '10px', fontSize: '1.1rem', color: 'var(--right-color)' }}>
            Unglaublich! Du hast kein einziges Mal nachgeschaut!
          </p>
        )}
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', width: '100%' }}>
        <button onClick={onCancel} className="btn-secondary" style={{ flex: 1, padding: '12px 5px', fontSize: '0.9rem' }}>
          Zurück
        </button>
        <button onClick={onRepeat} className="btn-secondary" style={{ flex: 1, padding: '12px 5px', fontSize: '0.9rem' }}>
          Wiederholen
        </button>
        <button onClick={onNext} className="btn-secondary" style={{ flex: 1, padding: '12px 5px', fontSize: '0.9rem' }}>
          Nächste Runde
        </button>
      </div>
    </div>
  );
}
