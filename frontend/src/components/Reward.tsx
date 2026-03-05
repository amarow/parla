import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useVoice } from '../contexts/VoiceContext';

export default function Reward({ onRestart, flips }) {
  const { transcript, clearTranscript, setLanguage } = useVoice();

  // Stelle sicher, dass die Befehlserkennung hier auf Deutsch läuft
  useEffect(() => {
    setLanguage('de-DE');
  }, [setLanguage]);

  useEffect(() => {
    if (!transcript) return;

    const lower = transcript.toLowerCase();
    if (lower.includes('weiter') || lower.includes('nächste') || lower.includes('runde') || lower.includes('starten') || lower.includes('ok')) {
      clearTranscript();
      onRestart();
    }
  }, [transcript, onRestart, clearTranscript]);

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
    <div className="reward-container card-panel text-center">
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
      <button onClick={onRestart} className="btn-primary" style={{marginTop: '20px'}}>
        Nächste Runde starten
      </button>
    </div>
  );
}
