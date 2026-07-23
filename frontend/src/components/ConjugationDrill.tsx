import { useState, useEffect, useRef } from 'react';
import { Volume2, Eye, EyeOff, ArrowLeftRight, List, BookOpen, XCircle } from 'lucide-react';
import { useRecorder } from '../contexts/Recorder';
import { useSession } from '../contexts/SessionContext';
import { speakText } from '../api';
import { TransportBar } from './TransportBar';
import { DrillEvaluator } from '../utils/speechMatch';
import { statsService } from '../utils/statsService';
import { AnalyseBar } from './AnalyseBar';

interface FormDef {
  id: string;
  pronounLabel: string;
  expectedPronoun: string;
  formKey: string;
}

const formDefinitions: FormDef[] = [
  { id: 'form_1s', pronounLabel: 'io (ich)', expectedPronoun: 'io', formKey: 'form_1s' },
  { id: 'form_2s', pronounLabel: 'tu (du)', expectedPronoun: 'tu', formKey: 'form_2s' },
  { id: 'form_3s_m', pronounLabel: 'lui (er)', expectedPronoun: 'lui', formKey: 'form_3s' },
  { id: 'form_3s_f', pronounLabel: 'lei (sie/es)', expectedPronoun: 'lei', formKey: 'form_3s' },
  { id: 'form_1p', pronounLabel: 'noi (wir)', expectedPronoun: 'noi', formKey: 'form_1p' },
  { id: 'form_2p', pronounLabel: 'voi (ihr)', expectedPronoun: 'voi', formKey: 'form_2p' },
  { id: 'form_3p', pronounLabel: 'loro (sie)', expectedPronoun: 'loro', formKey: 'form_3p' }
];

export default function ConjugationDrill({ 
  verb, 
  onFinish, 
  onBack, 
  onFlip, 
  onReset, 
  progress,
  onToggleDirection,
  onToggleOverview,
  showOverview,
  onCancel
}: any) {
  const [feedback, setFeedback] = useState<Record<string, string | null>>({});
  const [showSolution, setShowSolution] = useState(false);
  const [revealedRows, setRevealedRows] = useState<Record<string, boolean>>({});
  const [activeFieldIndex, setActiveFieldIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const { isListening, toggleListening, stopListening, transcript, setLanguage, language, getLatestWords } = useRecorder();
  const { user, alwaysShowTranslation, setAlwaysShowTranslation, speedProfile } = useSession();
  
  const conjugation = verb.conjugations?.[0];
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

  const resetDrill = () => {
    setFeedback({});
    setShowSolution(false);
    setRevealedRows({});
    setActiveFieldIndex(0);
    setIsProcessing(false);
    setIsAudioPlaying(false);
  };

  useEffect(() => {
    setLanguage('it-IT');
  }, [setLanguage]);

  useEffect(() => {
    resetDrill();
  }, [verb]);

  useEffect(() => {
    if (onReset) onReset(resetDrill);
  }, [onReset]);

  const handleFailure = (currentForm: FormDef) => {
    setIsProcessing(true);
    setFeedback(prev => ({ ...prev, [currentForm.id]: 'incorrect' }));
    setRevealedRows(prev => ({ ...prev, [currentForm.id]: true }));
    statsService.recordAttempt(false, true);

    const expectedText = `${currentForm.expectedPronoun} ${conjugation[currentForm.formKey]}`;
    speakText(expectedText, 'it', speechRate, user?.voice_it).then(() => {
      if (!isSessionActiveRef.current) return;
      setTimeout(() => {
        if (!isSessionActiveRef.current) return;
        setIsProcessing(false);
        if (activeFieldIndex < formDefinitions.length - 1) {
          setActiveFieldIndex(prev => prev + 1);
        } else {
          onFinish(false);
        }
      }, pauseTime);
    });
  };

  // Configurable no-input timeout logic per active row
  useEffect(() => {
    if (!isListening || isAudioPlaying || isProcessing || !conjugation || activeFieldIndex >= formDefinitions.length) return;

    const currentForm = formDefinitions[activeFieldIndex];
    if (feedback[currentForm.id] === 'correct') return;

    const noInputTimer = setTimeout(() => {
      if (!isSessionActiveRef.current) return;
      handleFailure(currentForm);
    }, noInputTimeout);

    return () => clearTimeout(noInputTimer);
  }, [isListening, isAudioPlaying, isProcessing, activeFieldIndex, conjugation, feedback, noInputTimeout]);

  // Speech evaluation
  useEffect(() => {
    if (!transcript || isProcessing || isAudioPlaying || !isListening || !conjugation || activeFieldIndex >= formDefinitions.length) return;

    const currentForm = formDefinitions[activeFieldIndex];
    if (feedback[currentForm.id] === 'correct') return;

    const expectedVerb = conjugation[currentForm.formKey];
    const possiblePronouns = [currentForm.expectedPronoun];
    
    // Evaluate based on expected target length + 1 (pronoun + verb)
    const latestSpoken = getLatestWords(3);
    const hasMatch = DrillEvaluator.checkConjugationMatch(latestSpoken || transcript, expectedVerb, possiblePronouns);

    if (hasMatch) {
       setFeedback(prev => ({ ...prev, [currentForm.id]: 'correct' }));
       setRevealedRows(prev => ({ ...prev, [currentForm.id]: true }));
       statsService.recordAttempt(true, revealedRows[currentForm.id] || alwaysShowTranslation);
       
       if (activeFieldIndex < formDefinitions.length - 1) {
         setTimeout(() => {
           if (isSessionActiveRef.current) setActiveFieldIndex(prev => prev + 1);
         }, pauseTime);
       } else {
         setIsProcessing(true);
         setTimeout(() => {
           if (isSessionActiveRef.current) onFinish(true);
         }, pauseTime);
       }
    } else {
        const isSkip = DrillEvaluator.checkSkipCommand(latestSpoken || transcript);
        if (isSkip) {
            if (!showSolution && onFlip) onFlip();
            handleFailure(currentForm);
        }
    }
  }, [transcript, getLatestWords, activeFieldIndex, conjugation, feedback, isListening, showSolution, alwaysShowTranslation, isAudioPlaying, isProcessing, onFinish, onFlip, revealedRows, pauseTime]);

  const playAudio = (e: any, text: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAudioPlaying(true);
    speakText(text, 'it', speechRate, user?.voice_it).then(() => {
      if (!isSessionActiveRef.current) return;
      setTimeout(() => {
        if (isSessionActiveRef.current) setIsAudioPlaying(false);
      }, 150);
    });
  };

  if (!conjugation) return <div className="card-panel">Keine Konjugationsdaten für dieses Verb gefunden.</div>;

  const currentForm = formDefinitions[activeFieldIndex];
  const activeExpectedVerb = activeFieldIndex < formDefinitions.length ? conjugation[currentForm.formKey] : '';
  const activeExpectedPronoun = activeFieldIndex < formDefinitions.length ? currentForm.expectedPronoun : '';
  const expectedText = `${activeExpectedPronoun} ${activeExpectedVerb}`;
  
  const expectedWords = expectedText.trim().split(/\s+/).filter(Boolean);
  const evaluatedSequence = DrillEvaluator.getEvaluatedSequence(transcript, expectedText, false);

  return (
    <div className="verb-drill-container">
      <div className="drill-panel">
        {/* Header Row inside Card Panel */}
        <div className="drill-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="progress-indicator" style={{ position: 'static', padding: '4px 10px', fontSize: '0.9rem', borderRadius: '12px' }}>
              {progress}
            </span>
            <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-meta)' }}>
              Konjugationen
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
        
        <div className="subjekt" style={{ marginTop: '8px', marginBottom: '6px' }}>
          <h2 style={{ margin: 0, textAlign: 'center', fontSize: '1.45rem', fontWeight: 700, color: 'var(--topic-color)' }}>
            {verb.native_infinitive}
          </h2>
        </div>

        <div className="loesung verb-forms-list" style={{ marginTop: '4px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center', width: '100%' }}>
          {formDefinitions.map((formDef, index) => {
              const displaySolution = `${formDef.expectedPronoun} ${conjugation[formDef.formKey]}`;
              const isActive = activeFieldIndex === index && isListening;
              const isRevealed = revealedRows[formDef.id] || alwaysShowTranslation || showSolution;

              return (
                <div key={formDef.id} style={{
                  display: 'flex', alignItems: 'center', width: '100%', maxWidth: '400px',
                  padding: '4px 10px', borderRadius: '8px',
                  backgroundColor: feedback[formDef.id] === 'correct' ? 'rgba(46, 204, 113, 0.15)' : 
                                   feedback[formDef.id] === 'incorrect' ? 'rgba(231, 76, 60, 0.15)' :
                                   isActive ? 'var(--bg-color)' : 'transparent',
                  border: `1.5px solid ${isActive && !isRevealed ? 'var(--topic-color)' : 'var(--border-color)'}`,
                  opacity: (index > activeFieldIndex && !isRevealed) ? 0.4 : 1,
                  transition: 'all 0.3s'
                }}>
                  <div style={{ width: '105px', fontWeight: 'bold', fontSize: '0.88rem' }}>{formDef.pronounLabel}</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isRevealed ? (
                      <div style={{ fontWeight: 400, flex: 1, fontSize: '0.92rem', color: feedback[formDef.id] === 'incorrect' ? 'var(--wrong-color)' : 'var(--text-meta)', opacity: feedback[formDef.id] === 'incorrect' ? 1 : 0.85 }}>
                        {displaySolution}
                      </div>
                    ) : (
                      <div style={{ flex: 1, color: 'var(--text-meta)', fontSize: '0.85rem' }}>...</div>
                    )}
                    {isRevealed && (
                      <button 
                        type="button" 
                        onClick={(e) => playAudio(e, displaySolution)} 
                        title="Vorlesen"
                        style={{ background: 'transparent', border: 'none', boxShadow: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85 }}
                      >
                        <Volume2 size={16} color="var(--topic-color)" />
                      </button>
                    )}
                  </div>
                </div>
              );
          })}
        </div>
      </div>

      <TransportBar
        onBack={() => {
          window.speechSynthesis.cancel();
          if (onBack) onBack();
        }}
        onForward={() => {
          onFinish(true);
        }}
        onMainAction={toggleListening}
        mainActionType="mic"
        mainActionActive={isListening}
      />

      {isListening && activeFieldIndex < formDefinitions.length && user.show_analyse_bar !== false && (
        <AnalyseBar
          language={language}
          transcript={transcript}
          expectedWordCount={expectedWords.length}
          evaluatedSequence={evaluatedSequence}
        />
      )}
    </div>
  );
}
