import { useState, useEffect, useRef } from 'react';
import { Play, Square, SkipForward, SkipBack, MessageCircle, XCircle, Mic, CheckCircle } from 'lucide-react';
import { speakText } from '../api';
import { useVoice } from '../contexts/VoiceContext';
import textIslands from '../data/textIslands.json';

export default function IslandPlayer({ user, islandId, onCancel }) {
  const island = textIslands.find(i => i.id === islandId);
  const sentences = island?.sentences || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'speaking' | 'listening'>('idle');
  const [showTranslation, setShowTranslation] = useState(false);
  const [alwaysShowTranslation, setAlwaysShowTranslation] = useState(false);
  
  const [progress, setProgress] = useState(0); // 0 to 100 for pause timer
  const [feedback, setFeedback] = useState<'correct' | null>(null);
  const playingRef = useRef(false);
  const cancelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentCycleRef = useRef(0);
  const earlyResolveRef = useRef<(() => void) | null>(null);
  const feedbackRef = useRef<'correct' | null>(null);

  const { transcript, clearTranscript, setLanguage } = useVoice();

  useEffect(() => {
    setLanguage('it-IT');
    return () => {
      playingRef.current = false;
      window.speechSynthesis.cancel();
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
      if (earlyResolveRef.current) earlyResolveRef.current();
    };
  }, [setLanguage]);

  useEffect(() => {
    if (!transcript || phase !== 'listening' || feedback === 'correct') return;

    const currentSentence = sentences[currentIndex];
    if (!currentSentence) return;

    const cleanTranscript = transcript.replace(/[.,!?]/g, '').trim().toLowerCase();
    const cleanExpected = currentSentence.it.replace(/[.,!?]/g, '').trim().toLowerCase();

    const expectedWords = cleanExpected.split(/\s+/);
    const spokenWords = cleanTranscript.split(/\s+/);
    
    const allWordsPresent = expectedWords.every(word => spokenWords.includes(word));

    if (allWordsPresent) {
      setFeedback('correct');
      feedbackRef.current = 'correct';
      clearTranscript();
      
      // Wait 1 second to show the green checkmark, then advance
      setTimeout(() => {
        if (earlyResolveRef.current) {
          earlyResolveRef.current();
        }
      }, 1000);
    }
  }, [transcript, phase, currentIndex, sentences, clearTranscript, feedback]);

  const playCycle = async (index: number) => {
    currentCycleRef.current += 1;
    const myCycleId = currentCycleRef.current;

    if (!playingRef.current || !sentences[index]) return;
    
    setShowTranslation(alwaysShowTranslation);
    setFeedback(null);
    feedbackRef.current = null;
    clearTranscript();

    // Loop 2 times per sentence
    for (let repeat = 0; repeat < 2; repeat++) {
      if (!playingRef.current || currentCycleRef.current !== myCycleId) break;

      setFeedback(null);
      feedbackRef.current = null;
      clearTranscript();

      // 1. Speak (App is speaking)
      setPhase('speaking');
      const startSpeak = Date.now();
      await speakText(sentences[index].it, 'it', user?.speech_rate || 0.85, user?.voice_it);
      
      if (!playingRef.current || currentCycleRef.current !== myCycleId) break;

      const speakDuration = Date.now() - startSpeak;

      // 2. Listen (User is repeating)
      setPhase('listening');
      // Calculate pause duration: e.g. 1.5x the speak time, min 3 seconds
      const pauseDuration = Math.max(speakDuration * 1.5, 3000);
      
      // Animated Progress Bar during listening
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
      // Go to next sentence or loop back
      setCurrentIndex((prev) => (prev + 1) % sentences.length);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      playCycle(currentIndex);
    }
  }, [currentIndex, isPlaying]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      playingRef.current = false;
      window.speechSynthesis.cancel();
      setPhase('idle');
    } else {
      setIsPlaying(true);
      playingRef.current = true;
      // Start cycle immediately on the current index
      playCycle(currentIndex);
    }
  };

  const skipForward = () => {
    window.speechSynthesis.cancel();
    if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
    if (earlyResolveRef.current) earlyResolveRef.current();
    setProgress(0);
    setFeedback(null);
    feedbackRef.current = null;
    clearTranscript();
    setShowTranslation(alwaysShowTranslation);
    setCurrentIndex((prev) => (prev + 1) % sentences.length);
  };

  const skipBack = () => {
    window.speechSynthesis.cancel();
    if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
    if (earlyResolveRef.current) earlyResolveRef.current();
    setProgress(0);
    setFeedback(null);
    feedbackRef.current = null;
    clearTranscript();
    setShowTranslation(alwaysShowTranslation);
    setCurrentIndex((prev) => (prev - 1 + sentences.length) % sentences.length);
  };

  if (!island) return <div className="card-panel">Textinsel nicht gefunden.</div>;

  const currentSentence = sentences[currentIndex];

  return (
    <div className="island-player-container card-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '60vh' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0 }}>{island.title}</h2>
          <span className="text-muted" style={{ fontSize: '0.9rem' }}>
            Satz {currentIndex + 1} von {sentences.length}
          </span>
        </div>
        <button onClick={onCancel} className="btn-cancel icon-text-btn" title="Beenden">
          <XCircle size={20} />
          <span className="desktop-text">Beenden</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '30px' }}>
        
        {/* Sentence Display */}
        <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px', 
            backgroundColor: feedback === 'correct' ? 'rgba(46, 204, 113, 0.1)' : 'var(--bg-secondary)', 
            border: feedback === 'correct' ? '2px solid var(--right-color)' : '2px solid transparent',
            borderRadius: '16px',
            width: '100%',
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            transition: 'all 0.3s ease'
        }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '500', color: 'var(--text-main)', marginBottom: '15px' }}>
            {currentSentence.it}
          </div>
          
          <div style={{ minHeight: '30px' }}>
            {showTranslation ? (
              <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                {currentSentence.de}
              </div>
            ) : (
              <button 
                className="btn-secondary" 
                style={{ fontSize: '0.9rem', padding: '4px 12px', opacity: 0.7 }}
                onClick={() => {
                  setShowTranslation(true);
                  setAlwaysShowTranslation(true);
                }}
              >
                Übersetzung anzeigen
              </button>
            )}
          </div>
        </div>

        {/* Visual Feedback (Microphone) */}
        <div style={{ 
          height: '80px', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '10px',
          width: '100%'
        }}>
          {phase === 'listening' && feedback !== 'correct' && (
            <>
              <div className="listening-global" style={{ color: 'var(--primary-color)' }}>
                <Mic size={32} />
              </div>
              <div style={{ width: '60%', height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  backgroundColor: 'var(--primary-color)', 
                  width: `${100 - progress}%`,
                  transition: 'width 0.1s linear'
                }} />
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>Jetzt bist du dran!</span>
            </>
          )}
          {feedback === 'correct' && (
            <div style={{ color: 'var(--right-color)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}>
              <CheckCircle size={32} />
              Perfekt!
            </div>
          )}
          {phase === 'speaking' && (
            <div style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle size={24} />
              <span style={{ fontWeight: '500' }}>Hör genau zu...</span>
            </div>
          )}
        </div>

      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
        <button className="icon-btn" onClick={skipBack} style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <SkipBack size={24} />
        </button>
        
        <button 
          className="icon-btn" 
          onClick={togglePlay} 
          style={{ 
            backgroundColor: isPlaying ? 'var(--wrong-color)' : 'var(--primary-color)', 
            color: 'white',
            width: '64px',
            height: '64px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          {isPlaying ? <Square size={28} /> : <Play size={28} style={{ marginLeft: '4px' }} />}
        </button>

        <button className="icon-btn" onClick={skipForward} style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <SkipForward size={24} />
        </button>
      </div>

    </div>
  );
}
