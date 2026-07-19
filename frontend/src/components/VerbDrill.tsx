import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Volume2, SkipForward, SkipBack } from 'lucide-react';
import { useVoice } from '../contexts/VoiceContext';
import { speakText } from '../api';

const pronouns = {
  form_1s: 'io (ich)',
  form_2s: 'tu (du)',
  form_3s: 'lui/lei (er/sie/es)',
  form_1p: 'noi (wir)',
  form_2p: 'voi (ihr)',
  form_3p: 'loro (sie)'
};

const expectedPronouns: Record<string, string> = {
  form_1s: 'io',
  form_2s: 'tu',
  form_3s: 'lui lei',
  form_1p: 'noi',
  form_2p: 'voi',
  form_3p: 'loro'
};

const formKeys = Object.keys(pronouns);

export default function VerbDrill({ user, verb, onFinish, onBack, direction, onFlip, onReset, progress }) {
  const [answers, setAnswers] = useState({
    form_1s: '', form_2s: '', form_3s: '', form_1p: '', form_2p: '', form_3p: ''
  });
  const [feedback, setFeedback] = useState<Record<string, string | null>>({});
  const [showSolution, setShowSolution] = useState(false);
  const [revealedRows, setRevealedRows] = useState<Record<string, boolean>>({});
  const [activeFieldIndex, setActiveFieldIndex] = useState(0);
  
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const { isListening, toggleListening, transcript, setLanguage, clearTranscript } = useVoice();

  const conjugation = verb.conjugations?.[0];

  const resetDrill = () => {
    setAnswers({ form_1s: '', form_2s: '', form_3s: '', form_1p: '', form_2p: '', form_3p: '' });
    setFeedback({});
    setShowSolution(false);
    setRevealedRows({});
    setActiveFieldIndex(0);
    clearTranscript();
    setTimeout(() => {
        if (inputRefs.current[0]) inputRefs.current[0].focus();
    }, 100);
  };

  useEffect(() => {
    setLanguage('it-IT');
  }, [setLanguage]);

  useEffect(() => {
    resetDrill();
  }, [verb]);

  useEffect(() => {
    if (onReset) {
      onReset(resetDrill);
    }
  }, [onReset]);

  useEffect(() => {
    if (!transcript) return;

    console.log("🗣️ [VerbDrill] Transcript gehört:", transcript);
    const cleanTranscript = transcript.replace(/[.,!?]/g, '').trim().toLowerCase();

    if (!conjugation || activeFieldIndex >= 6) return;

    const formKey = formKeys[activeFieldIndex];
    if (feedback[formKey] === 'correct') return; // already got this one

    const expectedVerb = conjugation[formKey].trim().toLowerCase();
    const expectedPronounStr = expectedPronouns[formKey].toLowerCase();
    const possiblePronouns = expectedPronounStr.split(' ');

    const actualCleanTranscript = transcript.replace(/[.,!?]/g, '').trim().toLowerCase();
    const spokenWords = actualCleanTranscript.split(/\s+/);
    
    const expectedVerbParts = expectedVerb.split(/\s+/);
    const hasVerb = expectedVerbParts.every(part => spokenWords.includes(part));
    const hasPronoun = possiblePronouns.some(p => spokenWords.includes(p));

    if (hasVerb && hasPronoun) {
       const finalAnswer = `${possiblePronouns[0]} ${conjugation[formKey]}`;
       setAnswers(prev => ({ ...prev, [formKey]: finalAnswer }));
       setFeedback(prev => ({ ...prev, [formKey]: 'correct' }));
       clearTranscript();
       
       if (activeFieldIndex < 5) {
         const nextIndex = activeFieldIndex + 1;
         setActiveFieldIndex(nextIndex);
         if (inputRefs.current[nextIndex]) {
             inputRefs.current[nextIndex].focus();
         }
       } else {
         setTimeout(() => {
             checkAnswers();
         }, 100);
       }
    }
  }, [transcript, activeFieldIndex, conjugation, feedback, clearTranscript]);

  const handleChange = (form: string, value: string) => {
    setAnswers(prev => ({ ...prev, [form]: value }));
  };

  const checkSingleField = (formKey: string, actualValue: string) => {
      if (!conjugation || !actualValue.trim()) return false;
      const expectedVerb = conjugation[formKey].trim().toLowerCase();
      const expectedPronounStr = expectedPronouns[formKey].toLowerCase();
      const possiblePronouns = expectedPronounStr.split(' ');
      
      const actualClean = actualValue.trim().toLowerCase().replace(/[.,!?]/g, '');
      const actualWords = actualClean.split(/\s+/);
      
      const expectedVerbParts = expectedVerb.split(/\s+/);
      const hasVerb = expectedVerbParts.every(part => actualWords.includes(part));
      const hasPronoun = possiblePronouns.some(p => actualWords.includes(p));

      return hasVerb && hasPronoun;
  };

  const handleBlur = (formKey: string) => {
      if (!answers[formKey].trim() || !conjugation) return;
      const isCorrect = checkSingleField(formKey, answers[formKey]);
      setFeedback(prev => ({ ...prev, [formKey]: isCorrect ? 'correct' : 'incorrect' }));
  };

  const handleKeyDown = (e: any, formKey: string, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      const isCorrect = checkSingleField(formKey, answers[formKey]);
      setFeedback(prev => ({ ...prev, [formKey]: isCorrect ? 'correct' : 'incorrect' }));
      
      if (isCorrect) {
          if (index < 5) {
              const nextIndex = index + 1;
              setActiveFieldIndex(nextIndex);
              inputRefs.current[nextIndex]?.focus();
          } else {
              checkAnswers();
          }
      }
    }
  };

  const checkAnswers = () => {
    if (!conjugation) return;
    const newFeedback: Record<string, string> = {};
    let allCorrect = true;

    Object.keys(answers).forEach(key => {
      const isCorrect = checkSingleField(key, answers[key]);
      newFeedback[key] = isCorrect ? 'correct' : 'incorrect';
      if (!isCorrect) allCorrect = false;
    });

    setFeedback(newFeedback);

    if (allCorrect) {
      setTimeout(() => onFinish(true), 500);
    }
  };

  const playAudio = (e: any, text: string) => {
    e.preventDefault();
    e.stopPropagation();
    const langCode = 'it'; // Conjugations are in Italian
    speakText(text, langCode, user?.speech_rate || 1.0, user?.voice_it);
  };

  const toggleSolution = () => {
      if (!showSolution && onFlip) {
          onFlip();
      }
      setShowSolution(!showSolution);
  };

  if (!conjugation) return <div>Keine Konjugationsdaten für dieses Verb gefunden.</div>;

  return (
    <div className="verb-drill-container">
      <div style={{ marginBottom: '15px' }}>
        <p className="text-muted" style={{ margin: 0 }}>
          Übersetze und konjugiere das Verb ({conjugation.tense}) mit Pronomen
        </p>
      </div>

      <div className="verb-forms-grid" style={{ display: 'grid', gap: '12px', marginTop: '20px' }}>
        {formKeys.map((formKey, index) => {
            const expectedPronounStr = expectedPronouns[formKey].split(' ')[0];
            const displaySolution = `${expectedPronounStr} ${conjugation[formKey]}`;

            return (
            <div key={formKey} className="verb-input-group" style={{ 
              display: 'flex', 
              flexDirection: isListening ? 'row' : 'column', 
              alignItems: isListening ? 'center' : 'stretch',
              gap: isListening ? '12px' : '4px' 
            }}>
                <label style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 'bold',
                  width: isListening ? '150px' : 'auto',
                  flexShrink: 0
                }}>
                  {pronouns[formKey]}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                {!isListening ? (
                  <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                  <input 
                      ref={el => { if (el) inputRefs.current[index] = el; }}
                      type="text"
                      value={showSolution ? displaySolution : answers[formKey]}
                      onChange={(e) => handleChange(formKey, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, formKey, index)}
                      onBlur={() => handleBlur(formKey)}
                      onFocus={() => setActiveFieldIndex(index)}
                      disabled={showSolution || feedback[formKey] === 'correct'}
                      className={`verb-input ${feedback[formKey] || ''}`}
                      style={{ 
                      width: '100%', 
                      padding: '10px', 
                      paddingRight: '36px',
                      borderRadius: '6px', 
                      border: `1px solid ${
                          feedback[formKey] === 'correct' ? 'var(--right-color)' : 
                          feedback[formKey] === 'incorrect' ? 'var(--wrong-color)' : 
                          (activeFieldIndex === index && isListening ? '#3498db' : 'var(--border-color)')
                      }`,
                      backgroundColor: feedback[formKey] === 'correct' ? 'rgba(46, 204, 113, 0.1)' : 'var(--bg-color)',
                      color: showSolution ? 'var(--right-color)' : 'inherit',
                      boxShadow: activeFieldIndex === index && isListening ? '0 0 5px rgba(52, 152, 219, 0.5)' : 'none',
                      transition: 'all 0.2s ease-in-out'
                      }}
                  />
                  <button 
                      type="button" 
                      onClick={(e) => playAudio(e, displaySolution)}
                      title="Vorlesen"
                      style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: 0.8 }}
                  >
                      <Volume2 size={18} color="#3498db" />
                  </button>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', minHeight: '42px', paddingLeft: '8px' }}>
                    {feedback[formKey] === 'correct' || showSolution || revealedRows[formKey] ? (
                      <div style={{ fontSize: '1.2rem', color: feedback[formKey] === 'correct' || showSolution ? 'var(--right-color)' : 'var(--text-color)', fontWeight: 'bold' }}>
                        {displaySolution}
                      </div>
                    ) : (
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.9rem', opacity: 0.8 }} 
                        onClick={() => setRevealedRows(prev => ({ ...prev, [formKey]: true }))}
                      >
                        Lösung anzeigen
                      </button>
                    )}
                    <button 
                        type="button" 
                        onClick={(e) => playAudio(e, displaySolution)}
                        title="Vorlesen"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: 0.8 }}
                    >
                        <Volume2 size={18} color="#3498db" />
                    </button>
                  </div>
                )}
                {feedback[formKey] === 'correct' && <CheckCircle size={20} color="var(--right-color)" />}
                {feedback[formKey] === 'incorrect' && <XCircle size={20} color="var(--wrong-color)" />}
                </div>
            </div>
            );
        })}
      </div>

      <div className="verb-actions" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginTop: '20px' }}>
        <div className="text-muted" style={{ fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'left' }}>
          {progress}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <button 
            className="icon-btn" 
            onClick={() => { clearTranscript(); if (onBack) onBack(); }}
            style={{ backgroundColor: 'var(--bg-secondary)', width: '48px', height: '48px' }}
            title="Vorheriges Verb"
          >
            <SkipBack size={24} />
          </button>
          
          <button 
            className="icon-btn" 
            onClick={() => onFinish(true)}
            style={{ backgroundColor: 'var(--bg-secondary)', width: '48px', height: '48px' }}
            title="Nächstes Verb"
          >
            <SkipForward size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={toggleSolution} style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
            {showSolution ? 'Alle verbergen' : 'Alle Lösungen'}
          </button>
        </div>
      </div>
    </div>
  );
}
