import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Volume2, Eye, EyeOff } from 'lucide-react';
import { speakText } from '../api';
import { useSession } from '../contexts/SessionContext';
import textIslands from '../data/textIslands.json';
import { TransportBar } from './TransportBar';
import { statsService } from '../utils/statsService';

export default function ThemeDrill({ islandId, onCancel, onFinish, statsModalOpen }: any) {
  const island = textIslands.find(i => i.id === islandId);
  const sentences = island?.sentences || [];

  const { user, alwaysShowTranslation, setAlwaysShowTranslation, speedProfile } = useSession();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'speaking' | 'listening'>('idle');
  const [showTranslation, setShowTranslation] = useState(false);
  
  const [progress, setProgress] = useState(0); // 0 to 100 for pause timer
  const playingRef = useRef(false);
  const cancelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentCycleRef = useRef(0);
  const earlyResolveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    statsService.startSession('text_islands', 'text_islands', sentences.length);
    return () => {
      playingRef.current = false;
      window.speechSynthesis.cancel();
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
      if (earlyResolveRef.current) earlyResolveRef.current();
    };
  }, [sentences.length]);

  useEffect(() => {
    if (statsModalOpen && isPlaying) {
      setIsPlaying(false);
      playingRef.current = false;
      window.speechSynthesis.cancel();
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
      if (earlyResolveRef.current) earlyResolveRef.current();
    }
  }, [statsModalOpen, isPlaying]);

  const playCycle = async (index: number) => {
    currentCycleRef.current += 1;
    const myCycleId = currentCycleRef.current;

    if (!playingRef.current || !sentences[index]) return;
    
    setShowTranslation(alwaysShowTranslation);

    // Loop 2 times per sentence
    for (let repeat = 0; repeat < 2; repeat++) {
      if (!playingRef.current || currentCycleRef.current !== myCycleId) break;

      // 1. Speak (App is speaking)
      setPhase('speaking');
      const startSpeak = Date.now();
      await speakText(sentences[index].it, 'it', speedProfile.speechRate, user?.voice_it);
      
      if (!playingRef.current || currentCycleRef.current !== myCycleId) break;

      const speakDuration = Date.now() - startSpeak;

      // 2. Pause (User is shadowing/repeating)
      setPhase('listening');
      // Calculate pause duration: e.g. 1.5x the speak time, min 3 seconds
      const pauseDuration = Math.max(speakDuration * 1.5, 3000);
      
      // Animated Progress Bar during pause
      const startTime = Date.now();
      await new Promise<void>((resolve) => {
        earlyResolveRef.current = () => {
          if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
          resolve();
        };

        const tick = () => {
          if (!playingRef.current || currentCycleRef.current !== myCycleId) {
            resolve();
            return;
          }
          const elapsed = Date.now() - startTime;
          const pct = Math.min((elapsed / pauseDuration) * 100, 100);
          setProgress(pct);
          
          if (elapsed < pauseDuration) {
            cancelTimerRef.current = setTimeout(tick, 50);
          } else {
            resolve();
          }
        };
        tick();
      });
      earlyResolveRef.current = null;
      setProgress(0);
    }

    if (playingRef.current && currentCycleRef.current === myCycleId) {
      statsService.recordAttempt(true, false);

      if (index + 1 >= sentences.length) {
        setIsPlaying(false);
        playingRef.current = false;
        onFinish(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    }
  };

  useEffect(() => {
    if (isPlaying) {
      playCycle(currentIndex);
    }
  }, [currentIndex, isPlaying]);

  const togglePlay = () => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    playingRef.current = nextPlaying;
    if (!nextPlaying) {
      window.speechSynthesis.cancel();
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
      if (earlyResolveRef.current) earlyResolveRef.current();
      setPhase('idle');
      setProgress(0);
    }
  };

  const skipForward = () => {
    window.speechSynthesis.cancel();
    if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
    if (earlyResolveRef.current) earlyResolveRef.current();
    setProgress(0);
    setShowTranslation(alwaysShowTranslation);
    if (currentIndex + 1 >= sentences.length) {
      setIsPlaying(false);
      playingRef.current = false;
      onFinish(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const skipBack = () => {
    if (currentIndex > 0) {
      window.speechSynthesis.cancel();
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
      if (earlyResolveRef.current) earlyResolveRef.current();
      setProgress(0);
      setShowTranslation(alwaysShowTranslation);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const playAudio = (text: string) => {
    speakText(text, 'it', speedProfile.speechRate, user?.voice_it);
  };

  if (!island) return <div className="card-panel">Textinsel nicht gefunden.</div>;

  const currentSentence = sentences[currentIndex];
  const displaySolution = showTranslation || alwaysShowTranslation;

  return (
    <div className="island-player-container">
      <div className="drill-panel" style={{ backgroundColor: 'var(--card-bg)' }}>
        {/* Header Row inside Card Panel */}
        <div className="drill-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="progress-indicator" style={{ position: 'static', padding: '4px 10px', fontSize: '0.9rem', borderRadius: '12px' }}>
              {currentIndex + 1}/{sentences.length}
            </span>
            <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-meta)' }}>
              Thema: {island.title}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button 
              type="button" 
              className="icon-btn" 
              onClick={() => {
                const nextState = !alwaysShowTranslation;
                setAlwaysShowTranslation(nextState);
                setShowTranslation(nextState);
              }} 
              style={{ width: '32px', height: '32px' }} 
              title={alwaysShowTranslation ? "Übersetzung ausblenden" : "Übersetzung anzeigen"}
            >
              {alwaysShowTranslation ? <EyeOff size={16} color="var(--topic-color)" /> : <Eye size={16} />}
            </button>
            {onCancel && (
              <button 
                onClick={onCancel} 
                className="icon-btn" 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  border: '1px solid var(--border-color)',
                  borderRadius: '50%',
                  backgroundColor: 'transparent'
                }} 
                title="Beenden"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Subjekt (Italienischer Satz) */}
        <div className="subjekt" style={{ marginTop: '8px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, textAlign: 'center', fontSize: '1.45rem', fontWeight: 700, color: 'var(--topic-color)' }}>
              {currentSentence?.it}
            </h2>
            <button 
              type="button"
              onClick={() => playAudio(currentSentence?.it)} 
              title="Vorlesen" 
              style={{ background: 'transparent', border: 'none', boxShadow: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85 }}
            >
              <Volume2 size={20} color="var(--topic-color)" />
            </button>
          </div>
        </div>

        {/* Lösung / Übersetzung (Deutscher Satz in dünnem, dezentem Grau) */}
        <div className="loesung" style={{ minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px', marginBottom: '16px' }}>
          {displaySolution && (
            <div className="solution-content fade-in" style={{ textAlign: 'center' }}>
              <span style={{ margin: 0, fontSize: '1.05rem', fontWeight: 400, color: 'var(--text-meta)', opacity: 0.85 }}>
                {currentSentence?.de}
              </span>
            </div>
          )}
        </div>

        {/* Visual Feedback (Phase) */}
        <div style={{ 
          height: '40px', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          marginTop: '10px'
        }}>
          {phase === 'listening' && (
            <>
              <div style={{ width: '60%', height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  backgroundColor: 'var(--topic-color)', 
                  width: `${100 - progress}%`,
                  transition: 'width 0.1s linear'
                }} />
              </div>
              <span className="text-small" style={{ color: 'var(--topic-color)', fontWeight: 'bold' }}>Jetzt nachsprechen...</span>
            </>
          )}
          {phase === 'speaking' && (
            <div style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle size={20} color="var(--topic-color)" />
              <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>Hör genau zu...</span>
            </div>
          )}
        </div>
      </div>

      <TransportBar
        onBack={skipBack}
        backDisabled={currentIndex === 0}
        onForward={skipForward}
        onMainAction={togglePlay}
        mainActionType="playPause"
        mainActionActive={isPlaying}
        onShowStats={onFinish}
      />
    </div>
  );
}
