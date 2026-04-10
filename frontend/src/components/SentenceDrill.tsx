import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Volume2, RotateCcw, List, BookOpen, Play, Square, SkipForward } from 'lucide-react';
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

export default function SentenceDrill({ user, pronounKey, onFinish, onCancel }) {
  const [logicData, setLogicData] = useState<any>(null);
  const [currentSentence, setCurrentSentence] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOverview, setShowOverview] = useState(false);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [concentratedMode, setConcentratedMode] = useState(false);
  const [lockedVerb, setLockedVerb] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);

  const pauseTime = user?.pause_time || 800;
  
  const { isListening, toggleListening, transcript, setLanguage, clearTranscript } = useVoice();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!concentratedMode) {
      setLockedVerb(null);
    }
  }, [concentratedMode]);

  useEffect(() => {
    setLanguage('it-IT');
    fetchLogic();
    return () => {
      playingRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
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

  const generateSentence = (data = logicData, forceNewVerb = false) => {
    if (!data || !data.logic || data.logic.length === 0) return;
    
    let logicEntry;
    if (concentratedMode && lockedVerb && !forceNewVerb) {
      // Find the entry for the locked verb
      logicEntry = data.logic.find(entry => entry.verb === lockedVerb);
      if (!logicEntry) {
          // If for some reason the verb is not found, fallback to random
          logicEntry = data.logic[Math.floor(Math.random() * data.logic.length)];
      }
    } else {
      // Pick a random verb logic entry
      logicEntry = data.logic[Math.floor(Math.random() * data.logic.length)];
    }
    
    // Update the locked verb for the next call if in concentrated mode
    setLockedVerb(logicEntry.verb);
    
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
    if (!transcript || feedback === 'correct' || showOverview) return;

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
  }, [transcript, currentSentence, feedback, clearTranscript, showOverview]);

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
    if (isPlayingAll) {
      handleStopPlayingAll();
    }
    if (audioRef.current) {
        audioRef.current.pause();
    }
    const url = `${API_BASE}/tts?text=${encodeURIComponent(text)}&lang=it`;
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch(e => console.error(e));
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAll(false);
  };

  const startPlayingAll = async () => {
    const sentences = getAllPossibleSentences();
    setIsPlayingAll(true);
    playingRef.current = true;

    for (const s of sentences) {
      if (!playingRef.current) break;
      
      await new Promise((resolve) => {
        const url = `${API_BASE}/tts?text=${encodeURIComponent(s.foreign)}&lang=it`;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => resolve(null);
        audio.onerror = () => resolve(null);
        audio.play().catch(e => {
          console.error(e);
          resolve(null);
        });
      });
      // Small pause between sentences
      if (playingRef.current) {
        await new Promise(r => setTimeout(r, pauseTime));
      }
    }
    
    setIsPlayingAll(false);
    playingRef.current = false;
    audioRef.current = null;
  };

  const handleStopPlayingAll = () => {
    playingRef.current = false;
    stopAudio();
  };

  if (loading) return <div className="card-panel">Lade Satz-Logik...</div>;
  if (!currentSentence) return <div className="card-panel">Keine Sätze verfügbar.</div>;

  const getAllPossibleSentences = () => {
    const sentences: any[] = [];
    if (!logicData) return sentences;

    logicData.logic.forEach(logicEntry => {
      const verbData = logicData.verbs.find(v => v.foreign_infinitive === logicEntry.verb);
      if (!verbData || !verbData.conjugations[0]) return;

      const conjugation = verbData.conjugations[0][pronounKey];
      const nativeVerb = logicEntry.native_forms[pronounKey];
      const pronounIt = pronounsMap[pronounKey].it.split('/')[0];
      const pronounDe = pronounsMap[pronounKey].de.split('/')[0];

      logicEntry.objects.forEach(obj => {
        sentences.push({
          native: `${pronounDe} ${nativeVerb} ${obj.native}.`,
          foreign: `${pronounIt} ${conjugation} ${obj.foreign}`
        });
      });
    });
    return sentences;
  };

  return (
    <div className="sentence-drill-container card-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Sätze üben</h2>
          <p className="text-muted">Fokus auf Pronomen: <strong>{pronounsMap[pronounKey].it} ({pronounsMap[pronounKey].de})</strong></p>
        </div>
        <div className="header-buttons" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!showOverview && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginRight: '10px', fontSize: '0.9rem' }}>
              <input 
                type="checkbox" 
                checked={concentratedMode} 
                onChange={(e) => setConcentratedMode(e.target.checked)} 
              />
              <span>Konzentriert (1 Verb)</span>
            </label>
          )}
          <button 
            onClick={() => {
              if (showOverview && isPlayingAll) handleStopPlayingAll();
              setShowOverview(!showOverview);
            }} 
            className="btn-cancel icon-text-btn" 
            title={showOverview ? "Lernen" : "Übersicht"}
          >
            {showOverview ? <BookOpen size={16} className="mobile-icon" /> : <List size={16} className="mobile-icon" />}
            <span className="desktop-text">{showOverview ? 'Lernen' : 'Übersicht'}</span>
          </button>
          <button onClick={onCancel} className="btn-cancel icon-text-btn" title="Beenden">
            <XCircle size={16} className="mobile-icon" />
            <span className="desktop-text">Beenden</span>
          </button>
        </div>
      </div>

      {showOverview ? (
        <div className="overview-container">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <button 
              className="btn-secondary" 
              onClick={isPlayingAll ? handleStopPlayingAll : startPlayingAll}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isPlayingAll ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              {isPlayingAll ? 'Stop' : 'Alle vorlesen'}
            </button>
          </div>
          <div className="words-list" style={{ maxHeight: '60vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Deutsch</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Italienisch</th>
                </tr>
              </thead>
              <tbody>
                {getAllPossibleSentences().map((s, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>{s.native}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{s.foreign}</span>
                      <button 
                        className="btn-secondary" 
                        onClick={() => playAudio(s.foreign)}
                        style={{ padding: '4px', minWidth: 'auto' }}
                      >
                        <Volume2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
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

              {concentratedMode && (
                <button 
                  className="btn-secondary" 
                  onClick={() => generateSentence(logicData, true)}
                  title="Nächstes Verb"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <SkipForward size={20} />
                  <span style={{ fontSize: '0.9rem' }}>Nächstes Verb</span>
                </button>
              )}
            </div>
          </div>

          {feedback === 'correct' && (
            <div style={{ textAlign: 'center', marginTop: '20px', color: 'var(--right-color)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <CheckCircle size={24} /> Richtig!
            </div>
          )}
        </>
      )}
    </div>
  );
}
