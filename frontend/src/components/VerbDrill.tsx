import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, CheckCircle, XCircle } from 'lucide-react';
import { useVoice } from '../contexts/VoiceContext';

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

export default function VerbDrill({ verb, onFinish, direction, onFlip }) {
  const [answers, setAnswers] = useState({
    form_1s: '', form_2s: '', form_3s: '', form_1p: '', form_2p: '', form_3p: ''
  });
  const [feedback, setFeedback] = useState<Record<string, string | null>>({});
  const [showSolution, setShowSolution] = useState(false);
  const [activeFieldIndex, setActiveFieldIndex] = useState(0);
  
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const { isListening, toggleListening, transcript, setLanguage, clearTranscript } = useVoice();

  const conjugation = verb.conjugations?.[0];

  useEffect(() => {
    setLanguage('it-IT');
  }, [setLanguage]);

  useEffect(() => {
    setAnswers({ form_1s: '', form_2s: '', form_3s: '', form_1p: '', form_2p: '', form_3p: '' });
    setFeedback({});
    setShowSolution(false);
    setActiveFieldIndex(0);
    clearTranscript();
    
    const timer = setTimeout(() => {
        if (inputRefs.current[0]) inputRefs.current[0].focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [verb, clearTranscript]);

  useEffect(() => {
    if (!transcript || !conjugation || activeFieldIndex >= 6) return;

    // Command listener
    const cleanTranscript = transcript.replace(/[.,!?]/g, '').trim().toLowerCase();
    
    if (cleanTranscript.includes('zeig') || cleanTranscript.includes('show')) {
        if (!showSolution) toggleSolution();
        clearTranscript();
        return;
    }

    if (cleanTranscript.includes('zurück') || cleanTranscript.includes('back')) {
        if (showSolution) toggleSolution();
        clearTranscript();
        return;
    }
    
    if (cleanTranscript.includes('überprüf') || cleanTranscript.includes('weiter') || cleanTranscript.includes('check')) {
        checkAnswers();
        clearTranscript();
        return;
    }

    const formKey = formKeys[activeFieldIndex];
    if (feedback[formKey] === 'correct') return; // already got this one

    const expectedVerb = conjugation[formKey].trim().toLowerCase();
    const expectedPronounStr = expectedPronouns[formKey].toLowerCase();
    const possiblePronouns = expectedPronounStr.split(' ');

    const actualCleanTranscript = transcript.replace(/[.,!?]/g, '').trim().toLowerCase();
    const spokenWords = actualCleanTranscript.split(/\s+/);
    
    const hasVerb = spokenWords.includes(expectedVerb);
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
             document.getElementById('check-verb-btn')?.click();
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
      
      const hasVerb = actualWords.includes(expectedVerb);
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

  const toggleSolution = () => {
      if (!showSolution && onFlip) {
          onFlip();
      }
      setShowSolution(!showSolution);
  };

  if (!conjugation) return <div>Keine Konjugationsdaten für dieses Verb gefunden.</div>;

  return (
    <div className="verb-drill-container card-panel">
      <div className="verb-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
            <h2 style={{ marginBottom: '5px' }}>
            {direction === 'nativeToForeign' ? verb.native_infinitive : verb.foreign_infinitive}
            </h2>
            <p className="text-muted">
            Übersetze und konjugiere das Verb ({conjugation.tense}) mit Pronomen
            </p>
        </div>
      </div>

      <div className="verb-forms-grid" style={{ display: 'grid', gap: '12px', marginTop: '20px' }}>
        {formKeys.map((formKey, index) => {
            const expectedPronounStr = expectedPronouns[formKey].split(' ')[0];
            const displaySolution = `${expectedPronounStr} ${conjugation[formKey]}`;

            return (
            <div key={formKey} className="verb-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{pronouns[formKey]}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    flex: 1, 
                    padding: '10px', 
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
                {feedback[formKey] === 'correct' && <CheckCircle size={20} color="var(--right-color)" />}
                {feedback[formKey] === 'incorrect' && <XCircle size={20} color="var(--wrong-color)" />}
                </div>
            </div>
            );
        })}
      </div>

      <div className="verb-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button className="btn-secondary" onClick={toggleSolution}>
          {showSolution ? 'Lösung verbergen' : 'Lösung anzeigen'}
        </button>
        <button id="check-verb-btn" className="btn-primary" onClick={checkAnswers} style={{ flex: 1 }}>
          Überprüfen
        </button>
      </div>
    </div>
  );
}
