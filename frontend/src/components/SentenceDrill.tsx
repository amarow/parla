import { useState, useEffect, useRef } from 'react';
import { Volume2, Play, Square, List, X, Eye, EyeOff } from 'lucide-react';
import { useRecorder } from '../contexts/Recorder';
import { useSession } from '../contexts/SessionContext';
import { speakText } from '../api';
import { dataService } from '../dataService';
import { TransportBar } from './TransportBar';
import { DrillEvaluator } from '../utils/speechMatch';
import { statsService } from '../utils/statsService';
import { AnalyseBar } from './AnalyseBar';
import { playSuccessSound, playFailureSound } from '../utils/audioFeedback';

const pronounsMap: Record<string, any> = {
  form_1s: { it: 'io', de: 'ich' },
  form_2s: { it: 'tu', de: 'du' },
  form_3s: { it: 'lui/lei', de: 'er/sie/es' },
  form_1p: { it: 'noi', de: 'wir' },
  form_2p: { it: 'voi', de: 'ihr' },
  form_3p: { it: 'loro', de: 'sie' }
};

const TOTAL_SENTENCES = 10;

export default function SentenceDrill({ 
  pronounKey, 
  onFinish, 
  onCancel, 
  onFlip
}: any) {
  const [logicData, setLogicData] = useState<any>(null);
  const [currentSentence, setCurrentSentence] = useState<any>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOverview, setShowOverview] = useState(false);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [concentratedMode, setConcentratedMode] = useState(false);
  const [lockedVerb, setLockedVerb] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const playingRef = useRef(false);
  const lastPlayedRef = useRef<string | null>(null);
  const isSessionActiveRef = useRef(false);

  const { user, alwaysShowTranslation, setAlwaysShowTranslation, speedProfile } = useSession();
  const { isListening, toggleListening, stopListening, transcript, setLanguage, language, getLatestWords, resetTranscript } = useRecorder();

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
      stopListening();
      window.speechSynthesis.cancel();
    };
  }, [stopListening]);

  // Load language database once
  useEffect(() => {
    let active = true;
    dataService.getSentenceLogic().then(data => {
      if (!active) return;
      setLogicData(data);
      statsService.startSession('sentences', TOTAL_SENTENCES);
      generateSentence(data, false);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  // Sync language with target text
  useEffect(() => {
    setLanguage(user.target_language === 'it' ? 'it-IT' : 'de-DE');
  }, [user.target_language, setLanguage]);

  // Generate next random sentence
  const generateSentence = (data = logicData, forceNewVerb = false) => {
    if (!data || !data.logic || data.logic.length === 0) return;
    
    // Check history
    if (historyIndex < history.length - 1 && data === logicData && !forceNewVerb) {
       const nextIndex = historyIndex + 1;
       setHistoryIndex(nextIndex);
       setCurrentSentence(history[nextIndex]);
       setFeedback(null);
       setShowSolution(false);
       setAttemptCount(0);
       setIsProcessing(false);
       setIsAudioPlaying(false);
       lastPlayedRef.current = null;
       return;
     }

    // Reset states
    setShowSolution(false);
    setFeedback(null);
    setAttemptCount(0);
    setIsProcessing(false);
    setIsAudioPlaying(false);
    lastPlayedRef.current = null;
    
    let logicEntry;
    if (concentratedMode && lockedVerb && !forceNewVerb) {
      logicEntry = data.logic.find((entry: any) => entry.verb === lockedVerb);
      if (!logicEntry) logicEntry = data.logic[Math.floor(Math.random() * data.logic.length)];
    } else {
      logicEntry = data.logic[Math.floor(Math.random() * data.logic.length)];
    }
    
    setLockedVerb(logicEntry.verb);
    const objectEntry = logicEntry.objects[Math.floor(Math.random() * logicEntry.objects.length)];
    const verbData = data.verbs.find((v: any) => v.foreign_infinitive === logicEntry.verb);
    if (!verbData || !verbData.conjugations[0]) {
        generateSentence(data);
        return;
    }
    
    const conjugation = verbData.conjugations[0][pronounKey];
    const nativeVerb = logicEntry.native_forms[pronounKey];
    const pronounIt = pronounsMap[pronounKey].it.split('/')[0];
    const pronounDe = pronounsMap[pronounKey].de.split('/')[0];

    const nativeSentence = `${pronounDe} ${nativeVerb} ${objectEntry.native}.`;
    const foreignSentence = `${pronounIt} ${conjugation} ${objectEntry.foreign}`;

    const newSentence = {
      native: nativeSentence,
      foreign: foreignSentence,
      verb: logicEntry.verb
    };

    setCurrentSentence(newSentence);
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newSentence);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleNext = (isCorrect = false) => {
    if (historyIndex + 1 >= TOTAL_SENTENCES) {
      onFinish(isCorrect);
    } else {
      generateSentence(logicData, false);
    }
  };

  const goBack = () => {
    if (historyIndex > 0) {
      window.speechSynthesis.cancel();
      const prev = history[historyIndex - 1];
      setCurrentSentence(prev);
      setHistoryIndex(historyIndex - 1);
      setShowSolution(false);
      setFeedback(null);
      setAttemptCount(0);
      setIsProcessing(false);
      setIsAudioPlaying(false);
      lastPlayedRef.current = null;
    }
  };

  // Play target sentence text aloud
  useEffect(() => {
    if (!currentSentence || !isListening) return;

    let isCurrent = true;
    const textToPlay = currentSentence.native;
    
    if (textToPlay && lastPlayedRef.current !== textToPlay) {
      lastPlayedRef.current = textToPlay;
      setIsAudioPlaying(true);
      speakText(textToPlay, 'de', speechRate, user?.voice_de).then(() => {
        if (!isCurrent || !isSessionActiveRef.current) return;
        setTimeout(() => {
          if (isCurrent && isSessionActiveRef.current) {
            setIsAudioPlaying(false);
            resetTranscript();
          }
        }, 150);
      });
    }

    return () => {
      isCurrent = false;
    };
  }, [currentSentence, isListening, speechRate, user]);

  // Clean up ongoing speech synthesis when sentence changes or component unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      setIsAudioPlaying(false);
    };
  }, [currentSentence]);

  // Auto play all sentences logic (Overview tab)
  const togglePlayAllOverview = async () => {
    if (isPlayingAll) {
      handleStopPlayingAll();
      return;
    }
    if (!logicData || !logicData.logic) return;
    setIsPlayingAll(true);
    playingRef.current = true;
    
    for (const item of logicData.logic) {
      if (!playingRef.current) break;
      const verbData = logicData.verbs.find((v: any) => v.foreign_infinitive === item.verb);
      if (verbData && verbData.conjugations[0]) {
        const conjugation = verbData.conjugations[0][pronounKey];
        const pronounIt = pronounsMap[pronounKey].it.split('/')[0];
        for (const obj of item.objects) {
          if (!playingRef.current) break;
          const sentenceText = `${pronounIt} ${conjugation} ${obj.foreign}`;
          await speakText(sentenceText, 'it', speechRate, user?.voice_it);
          if (playingRef.current) {
            await new Promise(r => setTimeout(r, pauseTime));
          }
        }
      }
    }
    setIsPlayingAll(false);
    playingRef.current = false;
  };

  const handleStopPlayingAll = () => {
    playingRef.current = false;
    setIsPlayingAll(false);
    window.speechSynthesis.cancel();
  };

  // No-input timeout logic (only active when listening)
  useEffect(() => {
    if (!isListening || isAudioPlaying || isProcessing || !currentSentence) return;

    const noInputTimer = setTimeout(() => {
      if (!isSessionActiveRef.current) return;

      if (attemptCount === 0) {
        // Step 1: Timeout -> Show solution, mark incorrect
        setFeedback('incorrect');
        playFailureSound();
        setShowSolution(true);
        setAttemptCount(1);
        statsService.recordAttempt(false, true);
        
        setTimeout(() => {
          if (isSessionActiveRef.current) setFeedback(null);
        }, pauseTime);
      } else {
        // Step 2: Second Timeout -> Read solution aloud & advance
        setIsProcessing(true);
        setFeedback('incorrect');
        // Note: playFailureSound() is omitted here as it already played in Step 1.
        
        speakText(currentSentence.foreign, 'it', speechRate, user?.voice_it).then(() => {
          if (!isSessionActiveRef.current) return;
          setTimeout(() => {
            if (!isSessionActiveRef.current) return;
            setFeedback(null);
            setIsProcessing(false);
            handleNext(false);
          }, pauseTime);
        });
      }
    }, noInputTimeout);

    return () => clearTimeout(noInputTimer);
  }, [isListening, isAudioPlaying, isProcessing, currentSentence, attemptCount, user, noInputTimeout, pauseTime, speechRate]);

  // Speech evaluation
  useEffect(() => {
    if (!transcript || isProcessing || isAudioPlaying || !isListening || !currentSentence) return;

    const targetWords = currentSentence.foreign.trim().split(/\s+/).filter(Boolean);
    const latestSpoken = getLatestWords(targetWords.length + 1);
    if (!latestSpoken) return;

    const isMatch = DrillEvaluator.checkSentenceMatch(latestSpoken, currentSentence.foreign);

    if (isMatch) {
      setFeedback('correct');
      playSuccessSound();
      setIsProcessing(true);
      setShowSolution(true);
      statsService.recordAttempt(true, showSolution || alwaysShowTranslation);

      setTimeout(() => {
          if (!isSessionActiveRef.current) return;
          setFeedback(null);
          setIsProcessing(false);
          handleNext(true);
      }, pauseTime);
    } else {
        const isSkip = DrillEvaluator.checkSkipCommand(latestSpoken) || DrillEvaluator.checkSkipCommand(transcript);
        if (isSkip) {
            if (attemptCount === 0) {
                setFeedback('incorrect');
                playFailureSound();
                if (!showSolution && onFlip) onFlip();
                setShowSolution(true);
                setAttemptCount(1);
                statsService.recordAttempt(false, true);
            }
        }
    }
  }, [transcript, getLatestWords, currentSentence, isProcessing, isAudioPlaying, isListening, showSolution, alwaysShowTranslation, onFlip, pauseTime, attemptCount]);

  const playAudio = (text: string) => {
    if (isPlayingAll) handleStopPlayingAll();
    setIsAudioPlaying(true);
    speakText(text, 'it', speechRate, user?.voice_it).then(() => {
      if (isSessionActiveRef.current) {
        setTimeout(() => {
          if (isSessionActiveRef.current) setIsAudioPlaying(false);
        }, 150);
      } else {
        setIsAudioPlaying(false);
      }
    });
  };

  if (loading) return <div className="card-panel">Lade Sätze...</div>;

  const displaySolution = showSolution || alwaysShowTranslation;
  const targetWords = currentSentence ? currentSentence.foreign.trim().split(/\s+/).filter(Boolean) : [];
  const latestSpoken = getLatestWords(targetWords.length + 1);
  const evaluatedSequence = DrillEvaluator.getEvaluatedSequence(latestSpoken || transcript, currentSentence?.foreign);

  return (
    <div className="sentence-drill-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%' }}>
      {showOverview ? (
        <div className="overview-container card-panel" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Satzübersicht ({pronounsMap[pronounKey].de})</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn-secondary" 
                onClick={togglePlayAllOverview}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isPlayingAll ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                {isPlayingAll ? 'Stop' : 'Alle vorlesen'}
              </button>
              <button 
                className="icon-btn" 
                onClick={() => setShowOverview(false)} 
                title="Schließen"
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
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          <div className="verbs-list" style={{ maxHeight: '60vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
            {logicData && logicData.logic.map((entry: any) => {
              const verbData = logicData.verbs.find((v: any) => v.foreign_infinitive === entry.verb);
              const conjugation = verbData?.conjugations[0]?.[pronounKey];
              const pronounIt = pronounsMap[pronounKey].it.split('/')[0];
              const pronounDe = pronounsMap[pronounKey].de.split('/')[0];
              const nativeVerb = entry.native_forms[pronounKey];

              return (
                <div key={entry.verb} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                  {entry.objects.map((obj: any, idx: number) => {
                    const deSent = `${pronounDe} ${nativeVerb} ${obj.native}.`;
                    const itSent = `${pronounIt} ${conjugation} ${obj.foreign}`;
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-meta)' }}>{deSent}</span>
                          <span style={{ fontWeight: 'bold' }}>{itSent}</span>
                        </div>
                        <button 
                          onClick={() => playAudio(itSent)} 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                          title="Vorlesen"
                        >
                          <Volume2 size={16} color="#3498db" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="drill-panel" style={{ backgroundColor: feedback === 'correct' ? 'rgba(46, 204, 113, 0.15)' : 'var(--card-bg)', transition: 'background-color 0.3s' }}>
            {/* Header Row inside Card Panel */}
            <div className="drill-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="progress-indicator" style={{ position: 'static', padding: '4px 10px', fontSize: '0.9rem', borderRadius: '12px' }}>
                  {historyIndex + 1}/{TOTAL_SENTENCES}
                </span>
                <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-meta)' }}>
                  Sätze & Pronomen
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
                <label style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-meta)', opacity: 0.9 }}>
                  <input 
                    type="checkbox" 
                    checked={concentratedMode} 
                    onChange={(e) => setConcentratedMode(e.target.checked)} 
                  />
                  Fokus-Modus
                </label>
                <button className="icon-btn" onClick={() => setShowOverview(true)} title="Übersicht aller Sätze" style={{ width: '32px', height: '32px' }}>
                  <List size={16} />
                </button>
                <button 
                  className="icon-btn" 
                  onClick={onCancel} 
                  title="Beenden" 
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
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            
            {/* Subjekt (Deutscher Satz) */}
            <div className="subjekt" style={{ marginTop: '8px', marginBottom: '6px' }}>
              <h2 style={{ margin: 0, textAlign: 'center', fontSize: '1.45rem', fontWeight: 700, color: 'var(--topic-color)' }}>
                {currentSentence?.native}
              </h2>
            </div>
            
            {/* Lösung (Italienischer Satz mit transparentem Vorlese-Button rechts daneben) */}
            <div className="loesung" style={{ minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px', marginBottom: '16px' }}>
              {displaySolution && (
                <div className="solution-content fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <span style={{ margin: 0, fontSize: '1.15rem', fontWeight: 400, color: 'var(--text-meta)', opacity: 0.85 }}>
                    {currentSentence?.foreign}
                  </span>
                  <button 
                    type="button"
                    onClick={() => playAudio(currentSentence?.foreign)} 
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
            onBack={goBack}
            backDisabled={historyIndex <= 0}
            onForward={() => handleNext(false)}
            onMainAction={toggleListening}
            mainActionType="mic"
            mainActionActive={isListening}
            onShowStats={onFinish}
            extraForwardContent={concentratedMode && (
              <button 
                className="btn-secondary" 
                onClick={() => generateSentence(logicData, true)} 
                title="Nächstes Verb" 
                style={{ fontSize: '0.7rem', padding: '4px' }}
              >
                Neues Verb
              </button>
            )}
          />

          {isListening && user.show_analyse_bar !== false && (
            <AnalyseBar
              language={language}
              transcript={transcript}
              expectedWordCount={targetWords.length}
              evaluatedSequence={evaluatedSequence}
            />
          )}
        </>
      )}
    </div>
  );
}
