import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Volume2, RotateCcw } from 'lucide-react';
import { useVoice } from '../contexts/VoiceContext';
import { API_BASE } from '../api';
import axios from 'axios';

const pronounsMap = {
  form_1s: { it: 'io', de: 'ich' },
  form_2s: { it: 'tu', de: 'du' },
  form_3s: { it: 'lui/lei', de: 'er/sie/es' },
  form_1p: { it: 'noi', de: 'wir' },
  form_2p: { it: 'voi', de: 'ihr' },
  form_3p: { it: 'loro', de: 'sie' }
};

export default function SentenceDrill({ pronounKey, onFinish, onCancel }) {
  const [logicData, setLogicData] = useState<any>(null);
  const [currentSentence, setCurrentSentence] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { isListening, toggleListening, transcript, setLanguage, clearTranscript } = useVoice();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLanguage('it-IT');
    fetchLogic();
  }, [setLanguage]);

  const fetchLogic = async () => {
    try {
      const res = await axios.get(`${API_BASE}/sentence-logic`);
      setLogicData(res.data);
      generateSentence(res.data);
      setLoading(false);
    } catch (e) {
      console.error("Error fetching sentence logic", e);
    }
  };

  const generateSentence = (data = logicData) => {
    if (!data || !data.logic || data.logic.length === 0) return;
    
    // Pick a random verb logic entry
    const logicEntry = data.logic[Math.floor(Math.random() * data.logic.length)];
    
    // Pick a random object
    const objectEntry = logicEntry.objects[Math.floor(Math.random() * logicEntry.objects.length)];
    
    // Get the conjugation
    const verbData = data.verbs.find(v => v.foreign_infinitive === logicEntry.verb);
    if (!verbData || !verbData.conjugations[0]) {
        // Fallback or retry
        generateSentence(data);
        return;
    }
    
    const conjugation = verbData.conjugations[0][pronounKey];
    const nativeVerb = logicEntry.native_forms[pronounKey];
    const pronounIt = pronounsMap[pronounKey].it.split('/')[0]; // Use lui for lui/lei
    const pronounDe = pronounsMap[pronounKey].de.split('/')[0];

    const nativeSentence = `${pronounDe} ${nativeVerb} ${objectEntry.native}.`;
    const foreignSentence = `${pronounIt} ${conjugation} ${objectEntry.foreign}`;

    setCurrentSentence({
      native: nativeSentence,
      foreign: foreignSentence,
      verb: logicEntry.verb,
      object: objectEntry.foreign
    });
    
    setAnswer('');
    setFeedback(null);
    setShowSolution(false);
    clearTranscript();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => {
    if (!transcript || feedback === 'correct') return;

    const cleanTranscript = transcript.replace(/[.,!?]/g, '').trim().toLowerCase();
    const cleanExpected = currentSentence.foreign.replace(/[.,!?]/g, '').trim().toLowerCase();

    // Check if the transcript contains the key parts (pronoun, verb, object)
    const expectedWords = cleanExpected.split(/\s+/);
    const spokenWords = cleanTranscript.split(/\s+/);
    
    const allWordsPresent = expectedWords.every(word => spokenWords.includes(word));

    if (allWordsPresent) {
      setAnswer(currentSentence.foreign);
      setFeedback('correct');
      clearTranscript();
      setTimeout(() => {
          generateSentence();
      }, 1500);
    }
  }, [transcript, currentSentence, feedback, clearTranscript]);

  const checkAnswer = () => {
    const cleanActual = answer.trim().toLowerCase().replace(/[.,!?]/g, '');
    const cleanExpected = currentSentence.foreign.trim().toLowerCase().replace(/[.,!?]/g, '');
    
    if (cleanActual === cleanExpected) {
      setFeedback('correct');
      setTimeout(() => generateSentence(), 1000);
    } else {
      setFeedback('incorrect');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      checkAnswer();
    }
  };

  const playAudio = (text: string) => {
    const url = `${API_BASE}/tts?text=${encodeURIComponent(text)}&lang=it`;
    new Audio(url).play().catch(e => console.error(e));
  };

  if (loading) return <div className="card-panel">Lade Satz-Logik...</div>;
  if (!currentSentence) return <div className="card-panel">Keine Sätze verfügbar.</div>;

  return (
    <div className="sentence-drill-container card-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Sätze üben</h2>
          <p className="text-muted">Fokus auf Pronomen: <strong>{pronounsMap[pronounKey].it} ({pronounsMap[pronounKey].de})</strong></p>
        </div>
        <button className="btn-cancel" onClick={onCancel}>Beenden</button>
      </div>

      <div className="sentence-box" style={{ 
        padding: '30px', 
        textAlign: 'center', 
        backgroundColor: 'rgba(52, 152, 219, 0.05)', 
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        marginBottom: '25px'
      }}>
        <div style={{ fontSize: '1.4rem', fontWeight: '500', marginBottom: '10px' }}>
          {currentSentence.native}
        </div>
        {showSolution && (
          <div style={{ fontSize: '1.2rem', color: 'var(--right-color)', fontWeight: 'bold', marginTop: '10px' }}>
            {currentSentence.foreign}
          </div>
        )}
      </div>

      <div className="input-section" style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          className={`verb-input ${feedback || ''}`}
          placeholder="Übersetze den Satz..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={feedback === 'correct'}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '1.1rem',
            borderRadius: '8px',
            border: `2px solid ${
              feedback === 'correct' ? 'var(--right-color)' : 
              feedback === 'incorrect' ? 'var(--wrong-color)' : 
              'var(--border-color)'
            }`
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px' }}>
          <button className="btn-secondary" onClick={() => setShowSolution(!showSolution)}>
            {showSolution ? 'Verbergen' : 'Lösung'}
          </button>
          
          <button className="btn-secondary" onClick={() => playAudio(currentSentence.foreign)}>
            <Volume2 size={20} />
          </button>

          <button className="btn-secondary" onClick={() => generateSentence()}>
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      {feedback === 'correct' && (
        <div style={{ textAlign: 'center', marginTop: '20px', color: 'var(--right-color)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <CheckCircle size={24} /> Richtig!
        </div>
      )}
    </div>
  );
}
