import { useState, useEffect, useRef } from 'react';
import { Volume2, Eye, EyeOff, ArrowLeftRight, List, BookOpen, XCircle } from 'lucide-react';
import { speakText } from '../api';
import { useVoice } from '../contexts/VoiceContext';
import { TransportBar } from './TransportBar';
import { normalizeText, checkFuzzyMatch, checkSkipOrWrong } from '../utils/speechMatch';
import { statsService } from '../utils/statsService';

export default function VocabDrill({ 
  user, 
  word, 
  direction, 
  onAnswer, 
  onBack, 
  onFlip, 
  progress,
  alwaysShowTranslation = false,
  setAlwaysShowTranslation,
  onToggleDirection,
  onToggleOverview,
  showOverview,
  onCancel
}: any) {
  const [showSolution, setShowSolution] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  const { transcript, setLanguage, clearTranscript, isListening, toggleListening } = useVoice();
  const lastPlayedRef = useRef<string | null>(null);
  const isSessionActiveRef = useRef(false);

  // Sync ref and handle session pause / stop
  useEffect(() => {
    isSessionActiveRef.current = isListening;
    if (!isListening) {
      window.speechSynthesis.cancel();
      setIsProcessing(false);
      setIsAudioPlaying(false);
    }
  }, [isListening]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      isSessionActiveRef.current = false;
      window.speechSynthesis.cancel();
    };
  }, []);

  // Reset states when the word changes
  useEffect(() => {
    setShowSolution(false);
    setIsProcessing(false);
    setSpeechFeedback(null);
    setAttemptCount(0);
    clearTranscript();
    lastPlayedRef.current = null;
  }, [word, clearTranscript]);

  // Read word aloud only when active (isListening)
  useEffect(() => {
    if (!word || !isListening) return;

    let isCurrent = true;
    const frontLangCode = direction === 'nativeToForeign' ? 'de' : 'it';
    const textToPlay = direction === 'nativeToForeign' ? word.native_word : word.foreign_word;
    
    if (textToPlay && lastPlayedRef.current !== textToPlay) {
      lastPlayedRef.current = textToPlay;
      setIsAudioPlaying(true);
      speakText(textToPlay, frontLangCode, user?.speech_rate || 1.0, frontLangCode === 'it' ? user?.voice_it : user?.voice_de).then(() => {
        if (!isCurrent || !isSessionActiveRef.current) return;
        clearTranscript();
        setTimeout(() => {
          if (isCurrent && isSessionActiveRef.current) setIsAudioPlaying(false);
        }, 150);
      });
    }

    return () => {
      isCurrent = false;
    };
  }, [word, isListening, direction]);

  const frontText = direction === 'nativeToForeign' ? word.native_word : word.foreign_word;
  const backText = direction === 'nativeToForeign' ? word.foreign_word : word.native_word;
  const backLang = direction === 'nativeToForeign' ? 'it-IT' : 'de-DE';

  useEffect(() => {
    setLanguage(backLang);
  }, [backLang, setLanguage]);

  // 3-second no-input timeout logic (only runs when active)
  useEffect(() => {
    if (!isListening || isAudioPlaying || isProcessing || !word) return;

    const noInputTimer = setTimeout(() => {
      if (!isSessionActiveRef.current) return;

      if (attemptCount === 0) {
        // Step 1: 3s without input -> Show solution, mark incorrect
        setSpeechFeedback('incorrect');
        setShowSolution(true);
        setAttemptCount(1);
        statsService.recordAttempt(false, true);
        clearTranscript();
        
        setTimeout(() => {
          if (isSessionActiveRef.current) setSpeechFeedback(null);
        }, 1000);
      } else {
        // Step 2: Still no correct answer after another 3s -> Read solution aloud & advance
        setIsProcessing(true);
        setSpeechFeedback('incorrect');
        const langCode = backLang.split('-')[0];
        
        speakText(backText, langCode, user?.speech_rate || 1.0, langCode === 'it' ? user?.voice_it : user?.voice_de).then(() => {
          if (!isSessionActiveRef.current) return;
          setTimeout(() => {
            if (!isSessionActiveRef.current) return;
            setSpeechFeedback(null);
            setIsProcessing(false);
            clearTranscript();
            onAnswer(false);
          }, 1500);
        });
      }
    }, 3000);

    return () => clearTimeout(noInputTimer);
  }, [isListening, isAudioPlaying, isProcessing, word, attemptCount, backText, backLang, clearTranscript, onAnswer, user]);

  useEffect(() => {
    if (!transcript || isProcessing || isAudioPlaying || !isListening) return;

    const target = backText.toLowerCase().trim();
    const cleanTranscript = normalizeText(transcript, backLang, true);
    const cleanTarget = normalizeText(target, backLang, true);

    const isFuzzy = checkFuzzyMatch(cleanTranscript, cleanTarget);

    if (cleanTranscript && (cleanTranscript === cleanTarget || cleanTranscript.includes(cleanTarget) || cleanTarget.includes(cleanTranscript) || isFuzzy)) {
        setSpeechFeedback('correct');
        setIsProcessing(true);
        setShowSolution(true);
        statsService.recordAttempt(true, showSolution || alwaysShowTranslation);
        
        setTimeout(() => {
            if (!isSessionActiveRef.current) return;
            setSpeechFeedback(null);
            setIsProcessing(false);
            clearTranscript();
            onAnswer(true);
        }, 1500);
    } else {
        // wrong answer or skipping
        if (checkSkipOrWrong(transcript, 3, true)) {
            setSpeechFeedback('incorrect');
            if (!showSolution && onFlip) onFlip();
            setShowSolution(true);
            setAttemptCount(1);
            statsService.recordAttempt(false, true);
            setTimeout(() => {
                if (!isSessionActiveRef.current) return;
                clearTranscript();
            }, 1000);
        }
    }
  }, [transcript, backText, backLang, isProcessing, isAudioPlaying, onAnswer, clearTranscript, showSolution, alwaysShowTranslation, isListening, onFlip]);

  const playAudio = (e: any) => {
    e.stopPropagation();
    const langCode = backLang.split('-')[0];
    setIsAudioPlaying(true);
    speakText(backText, langCode, user?.speech_rate || 1.0, langCode === 'it' ? user?.voice_it : user?.voice_de).then(() => {
      if (!isSessionActiveRef.current) return;
      clearTranscript();
      setTimeout(() => {
        if (isSessionActiveRef.current) setIsAudioPlaying(false);
      }, 150);
    });
  };

  const displaySolution = showSolution || alwaysShowTranslation;

  return (
    <>
      <div className="drill-panel" style={{ backgroundColor: speechFeedback === 'correct' ? 'rgba(46, 204, 113, 0.15)' : 'var(--card-bg)', transition: 'background-color 0.3s' }}>
        {/* Header Row inside Card Panel */}
        <div className="drill-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="progress-indicator" style={{ position: 'static', padding: '4px 10px', fontSize: '0.9rem', borderRadius: '12px' }}>
              {progress}
            </span>
            <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-meta)' }}>
              Vokabeln
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {setAlwaysShowTranslation && (
              <button 
                type="button" 
                className="icon-btn" 
                onClick={() => setAlwaysShowTranslation(!alwaysShowTranslation)} 
                style={{ width: '32px', height: '32px' }} 
                title={alwaysShowTranslation ? "Übersetzung ausblenden" : "Übersetzung anzeigen"}
              >
                {alwaysShowTranslation ? <EyeOff size={16} color="var(--topic-color)" /> : <Eye size={16} />}
              </button>
            )}
            {onToggleDirection && (
              <button onClick={onToggleDirection} className="icon-btn" style={{ width: '32px', height: '32px' }} title="Lernrichtung umkehren">
                <ArrowLeftRight size={16} />
              </button>
            )}
            {onToggleOverview && (
              <button onClick={onToggleOverview} className="icon-btn" style={{ width: '32px', height: '32px' }} title={showOverview ? "Lernen" : "Übersicht"}>
                {showOverview ? <BookOpen size={16} /> : <List size={16} />}
              </button>
            )}
            {onCancel && (
              <button onClick={onCancel} className="icon-btn" style={{ width: '32px', height: '32px' }} title="Beenden">
                <XCircle size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Subjekt (Frage / Aufforderung) */}
        <div className="subjekt" style={{ marginTop: '8px', marginBottom: '6px' }}>
          <h2 style={{ margin: 0, textAlign: 'center', fontSize: '1.45rem', fontWeight: 700, color: 'var(--topic-color)' }}>{frontText}</h2>
        </div>
        
        {/* Lösung (Übersetzung unter dem Subjekt mit Vorlese-Button rechts daneben) */}
        <div className="loesung" style={{ minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px', marginBottom: '16px' }}>
          {displaySolution && (
            <div className="solution-content fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
               <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 600, color: 'var(--right-color)' }}>
                 {backText}
               </h2>
               <button 
                 type="button"
                 onClick={playAudio} 
                 title="Vorlesen" 
                 style={{ background: 'transparent', border: 'none', boxShadow: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85 }}
               >
                 <Volume2 size={20} color="var(--topic-color)" />
               </button>
            </div>
          )}
        </div>
      </div>

      <TransportBar
        onBack={() => {
          isSessionActiveRef.current = false;
          window.speechSynthesis.cancel();
          clearTranscript();
          if (onBack) onBack();
        }}
        onForward={() => {
          clearTranscript();
          onAnswer(false);
        }}
        onMainAction={toggleListening}
        mainActionType="mic"
        mainActionActive={isListening}
      />
    </>
  );
}
