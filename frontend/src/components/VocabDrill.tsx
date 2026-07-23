import { useState, useEffect, useRef } from 'react';
import { Volume2, Eye, EyeOff, ArrowLeftRight, List, BookOpen, XCircle } from 'lucide-react';
import { speakText } from '../api';
import { useRecorder } from '../contexts/Recorder';
import { useSession } from '../contexts/SessionContext';
import { TransportBar } from './TransportBar';
import { DrillEvaluator, normalizeText } from '../utils/speechMatch';
import { statsService } from '../utils/statsService';
import { AnalyseBar } from './AnalyseBar';

export default function VocabDrill({ 
  word, 
  direction, 
  onAnswer, 
  onBack, 
  onFlip, 
  progress,
  onToggleDirection,
  onToggleOverview,
  showOverview,
  onCancel,
  onShowStats,
  categoryName
}: any) {
  const [showSolution, setShowSolution] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  const { transcript, setLanguage, getLatestWords, isListening, toggleListening, stopListening, language } = useRecorder();
  const { user, alwaysShowTranslation, setAlwaysShowTranslation, speedProfile } = useSession();
  
  const lastPlayedRef = useRef<string | null>(null);
  const isSessionActiveRef = useRef(false);

  const pauseTime = speedProfile.pauseTime;
  const noInputTimeout = speedProfile.noInputTimeout;
  const speechRate = speedProfile.speechRate;

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

  const frontText = direction === 'nativeToForeign' ? word.native_word : word.foreign_word;
  const backText = direction === 'nativeToForeign' ? word.foreign_word : word.native_word;
  const backLang = direction === 'nativeToForeign' ? 'it-IT' : 'de-DE';

  // Reset states when the word changes
  useEffect(() => {
    setShowSolution(false);
    setIsProcessing(false);
    setIsAudioPlaying(false);
    setSpeechFeedback(null);
    setAttemptCount(0);
    lastPlayedRef.current = null;
  }, [word]);

  // Read word aloud only when active (isListening)
  useEffect(() => {
    if (!word || !isListening) return;

    let isCurrent = true;
    const frontLangCode = direction === 'nativeToForeign' ? 'de' : 'it';
    const textToPlay = direction === 'nativeToForeign' ? word.native_word : word.foreign_word;
    
    if (textToPlay && lastPlayedRef.current !== textToPlay) {
      lastPlayedRef.current = textToPlay;
      setIsAudioPlaying(true);
      speakText(textToPlay, frontLangCode, speechRate, frontLangCode === 'it' ? user?.voice_it : user?.voice_de).then(() => {
        if (!isCurrent || !isSessionActiveRef.current) return;
        setTimeout(() => {
          if (isCurrent && isSessionActiveRef.current) setIsAudioPlaying(false);
        }, 150);
      });
    }

    return () => {
      isCurrent = false;
    };
  }, [word, isListening, direction, speechRate, user]);

  useEffect(() => {
    setLanguage(backLang);
  }, [backLang, setLanguage]);

  // Configurable no-input timeout logic (only runs when active)
  useEffect(() => {
    if (!isListening || isAudioPlaying || isProcessing || !word) return;

    const noInputTimer = setTimeout(() => {
      if (!isSessionActiveRef.current) return;

      if (attemptCount === 0) {
        // Step 1: Timeout without input -> Show solution, mark incorrect
        setSpeechFeedback('incorrect');
        setShowSolution(true);
        setAttemptCount(1);
        statsService.recordAttempt(false, true);
        
        setTimeout(() => {
          if (isSessionActiveRef.current) setSpeechFeedback(null);
        }, pauseTime);
      } else {
        // Step 2: Still no correct answer after another timeout -> Read solution aloud & advance
        setIsProcessing(true);
        setSpeechFeedback('incorrect');
        const langCode = backLang.split('-')[0];
        
        speakText(backText, langCode, speechRate, langCode === 'it' ? user?.voice_it : user?.voice_de).then(() => {
          if (!isSessionActiveRef.current) return;
          setTimeout(() => {
            if (!isSessionActiveRef.current) return;
            setSpeechFeedback(null);
            setIsProcessing(false);
            onAnswer(false);
          }, pauseTime);
        });
      }
    }, noInputTimeout);

    return () => clearTimeout(noInputTimer);
  }, [isListening, isAudioPlaying, isProcessing, word, attemptCount, backText, backLang, onAnswer, user, noInputTimeout, pauseTime, speechRate]);

  useEffect(() => {
    if (!transcript || isProcessing || isAudioPlaying || !isListening) return;

    const targetWords = backText.trim().split(/\s+/).filter(Boolean);
    const latestSpoken = getLatestWords(targetWords.length + 1);
    if (!latestSpoken) return;

    const isMatch = DrillEvaluator.checkVocabMatch(latestSpoken, backText, backLang);

    if (isMatch) {
        setSpeechFeedback('correct');
        setIsProcessing(true);
        setShowSolution(true);
        statsService.recordAttempt(true, showSolution || alwaysShowTranslation);
        
        setTimeout(() => {
            if (!isSessionActiveRef.current) return;
            setSpeechFeedback(null);
            setIsProcessing(false);
            onAnswer(true);
        }, pauseTime);
    } else {
        // wrong answer or skipping
        if (DrillEvaluator.checkSkipCommand(latestSpoken) || DrillEvaluator.checkSkipCommand(transcript)) {
            setSpeechFeedback('incorrect');
            if (!showSolution && onFlip) onFlip();
            setShowSolution(true);
            setAttemptCount(1);
            statsService.recordAttempt(false, true);
        }
    }
  }, [transcript, getLatestWords, backText, backLang, isProcessing, isAudioPlaying, onAnswer, showSolution, alwaysShowTranslation, isListening, onFlip, pauseTime]);

  const playAudio = (e: any) => {
    e.stopPropagation();
    const langCode = backLang.split('-')[0];
    setIsAudioPlaying(true);
    speakText(backText, langCode, speechRate, langCode === 'it' ? user?.voice_it : user?.voice_de).then(() => {
      if (!isSessionActiveRef.current) return;
      setTimeout(() => {
        if (isSessionActiveRef.current) setIsAudioPlaying(false);
      }, 150);
    });
  };

  const displaySolution = showSolution || alwaysShowTranslation;
  const expectedWords = backText.trim().split(/\s+/).filter(Boolean);
  const evaluatedSequence = DrillEvaluator.getEvaluatedSequence(transcript, backText);

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
              {categoryName || 'Vokabeln'}
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
               <span style={{ margin: 0, fontSize: '1.15rem', fontWeight: 400, color: 'var(--text-meta)', opacity: 0.85 }}>
                 {backText}
               </span>
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
          window.speechSynthesis.cancel();
          if (onBack) onBack();
        }}
        onForward={() => {
          onAnswer(false);
        }}
        onMainAction={toggleListening}
        mainActionType="mic"
        mainActionActive={isListening}
        onShowStats={onShowStats}
      />

      {isListening && user.show_analyse_bar !== false && (
        <AnalyseBar
          language={language}
          transcript={transcript}
          expectedWordCount={expectedWords.length}
          evaluatedSequence={evaluatedSequence}
        />
      )}
    </>
  );
}
