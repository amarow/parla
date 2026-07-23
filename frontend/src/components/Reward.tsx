import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useRecorder } from '../contexts/Recorder';
import { API_BASE } from '../api';

export default function Reward({ onNext, onRepeat, onCancel, stats, flips }: any) {
  const { transcript, setLanguage } = useRecorder();
  const hasPlayedAudio = useRef(false);

  const session = stats?.session;
  const lifetime = stats?.lifetime;

  const hintsUsed = session ? session.hintsUsed : (flips || 0);
  const completedItems = session ? session.completedItems : 0;
  const correctFirstTry = session ? session.correctFirstTry : 0;

  const accuracy = completedItems > 0 ? Math.round((correctFirstTry / completedItems) * 100) : 100;

  // Stelle sicher, dass die Befehlserkennung hier auf Deutsch läuft
  useEffect(() => {
    setLanguage('de-DE');
  }, [setLanguage]);

  useEffect(() => {
    if (hasPlayedAudio.current) return;
    hasPlayedAudio.current = true;

    let textToPlay = 'Fertig! ';
    if (hintsUsed === 0) {
      textToPlay += 'Perfekt, keinmal nachgeschaut!';
    } else {
      textToPlay += `Du hast ${hintsUsed} mal nachgeschaut.`;
    }

    const url = `${API_BASE}/tts?text=${encodeURIComponent(textToPlay)}&lang=de`;
    const audio = new Audio(url);
    audio.play().catch(err => console.warn('Audio konnte nicht abgespielt werden:', err));
  }, [hintsUsed]);

  useEffect(() => {
    if (!transcript) return;

    const lower = transcript.toLowerCase();
    if (lower.includes('weiter') || lower.includes('nächste') || lower.includes('runde') || lower.includes('starten') || lower.includes('ok')) {
      onNext();
    } else if (lower.includes('wiederholen') || lower.includes('nochmal')) {
      if (onRepeat) onRepeat();
    } else if (lower.includes('zurück') || lower.includes('abbrechen') || lower.includes('ende')) {
      onCancel();
    }
  }, [transcript, onNext, onRepeat, onCancel]);

  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div className="confetti-emoji" style={{ fontSize: '4rem', marginBottom: '20px' }}>🎉🎉🎉</div>
        <h2>Fantastisch!</h2>
        <p>Du hast die Lektion erfolgreich abgeschlossen!</p>
        
        <div className="stats-card" style={{ 
          marginTop: '20px', 
          padding: '16px 24px', 
          backgroundColor: 'var(--bg-color)', 
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          maxWidth: '360px',
          width: '100%'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: 'var(--topic-color)' }}>Session-Statistik</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Erfolgsquote:</span>
            <strong>{accuracy}%</strong>
          </div>
          
          {completedItems > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Auf Hieb richtig:</span>
              <strong>{correctFirstTry} / {completedItems}</strong>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Nachgeschaut (Hilfen):</span>
            <strong style={{ color: hintsUsed === 0 ? 'var(--right-color)' : 'inherit' }}>{hintsUsed}</strong>
          </div>

          {lifetime && lifetime.totalSessions > 0 && (
            <>
              <hr style={{ margin: '12px 0', borderColor: 'var(--border-color)', opacity: 0.4 }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-meta)' }}>
                Gesamt geübt: <strong>{lifetime.totalItemsPracticed}</strong> Aufgaben in <strong>{lifetime.totalSessions}</strong> Sessions
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px', width: '100%' }}>
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
