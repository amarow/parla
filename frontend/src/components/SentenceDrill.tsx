import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Volume2, RotateCcw, List, BookOpen, Play, Square, SkipForward, SkipBack, Mic } from 'lucide-react';
import { useVoice } from '../contexts/VoiceContext';
import { speakText } from '../api';
import { dataService } from '../dataService';

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
  const [sentenceCount, setSentenceCount] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOverview, setShowOverview] = useState(false);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [concentratedMode, setConcentratedMode] = useState(false);
  const [lockedVerb, setLockedVerb] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
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
    };
  }, [setLanguage]);

  const fetchLogic = async () => {
    try {
      const data = await dataService.getSentenceLogic();
      setLogicData(data);
      generateSentence(data);
      setLoading(false);
    } catch (e) {
      console.error("Error fetching sentence logic", e);
    }
  };

  const generateSentence = (data = logicData, forceNewVerb = false) => {
    if (!data || !data.logic || data.logic.length === 0) return;
    
    // Wenn wir in der Historie zurückgegangen sind und einfach "Weiter" klicken, zeigen wir den nächsten Satz der Historie
    if (historyIndex < history.length - 1 && data === logicData && !forceNewVerb) {
       const nextIndex = historyIndex + 1;
       setHistoryIndex(nextIndex);
       setCurrentSentence(history[nextIndex]);
       setSentenceCount(prev => prev + 1);
       setAnswer('');
       setFeedback(null);
       setShowSolution(false);
       clearTranscript();
       setTimeout(() => inputRef.current?.focus(), 100);
       return;
    }
    
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

    const newSentence = {
      native: nativeSentence,
      foreign: foreignSentence,
      verb: logicEntry.verb,
      object: objectEntry.foreign
    };

    const newHistory = [...history.slice(0, historyIndex + 1), newSentence];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setCurrentSentence(newSentence);
    
    setSentenceCount(prev => prev + 1);
    setAnswer('');
    setFeedback(null);
    setShowSolution(false);
    clearTranscript();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setCurrentSentence(history[prevIndex]);
      setSentenceCount(prev => prev - 1);
      setAnswer('');
      setFeedback(null);
      setShowSolution(false);
      clearTranscript();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  useEffect(() => {
    if (!transcript || !currentSentence || feedback === 'correct' || showOverview) return;

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
      setTimeout(() => generateSentence(), 1500);
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
    speakText(text, 'it', user?.speech_rate || 1.0, user?.voice_it);
  };

  const stopAudio = () => {
    setIsPlayingAll(false);
    playingRef.current = false;
  };

  const startPlayingAll = async () => {
    const sentences = getAllPossibleSentences();
    setIsPlayingAll(true);
    playingRef.current = true;

    for (const s of sentences) {
      if (!playingRef.current) break;
      await speakText(s.foreign, 'it', user?.speech_rate || 1.0, user?.voice_it);
      // Small pause between sentences
      if (playingRef.current) {
        await new Promise(r => setTimeout(r, pauseTime));
      }
    }
    
    setIsPlayingAll(false);
    playingRef.current = false;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Sätze üben: {pronounsMap[pronounKey].it}</h2>
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
            {showOverview ? <BookOpen size={20} /> : <List size={20} />}
            <span className="desktop-text">{showOverview ? 'Lernen' : 'Übersicht'}</span>
          </button>
          <button onClick={onCancel} className="btn-cancel icon-text-btn" title="Beenden">
            <XCircle size={20} />
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
          <div className="flashcard-container" style={{ marginBottom: '25px', minHeight: '200px' }}>
            <div 
              className={`flashcard ${showSolution ? 'flipped' : ''}`}
              onClick={() => setShowSolution(!showSolution)}
            >
              <div className="flashcard-inner">
                <div className="flashcard-front" style={{ 
                  backgroundColor: feedback === 'correct' ? 'rgba(46, 204, 113, 0.1)' : 'var(--card-bg)',
                  border: `1px solid ${feedback === 'correct' ? 'var(--right-color)' : 'var(--border-color)'}`,
                  boxShadow: feedback === 'correct' ? '0 0 15px rgba(46, 204, 113, 0.3)' : undefined,
                  transition: 'all 0.3s ease'
                }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '500', margin: 0 }}>{currentSentence.native}</h2>
                </div>
                <div className="flashcard-back" style={{ 
                  backgroundColor: feedback === 'correct' ? 'rgba(46, 204, 113, 0.1)' : 'var(--card-bg)', 
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                  border: `1px solid ${feedback === 'correct' ? 'var(--right-color)' : 'var(--border-color)'}`,
                  boxShadow: feedback === 'correct' ? '0 0 15px rgba(46, 204, 113, 0.3)' : undefined,
                  transition: 'all 0.3s ease'
                }}>
                  <h2 style={{ fontSize: '1.4rem', margin: 0, color: feedback === 'correct' ? 'var(--right-color)' : 'var(--text-color)' }}>{currentSentence.foreign}</h2>
                  <div className="media-controls" style={{ marginTop: '20px' }}>
                    <button 
                      className="audio-btn" 
                      onClick={(e) => { e.stopPropagation(); playAudio(currentSentence.foreign); }} 
                      title="Vorlesen"
                    >
                      <Volume2 size={32} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="input-section" style={{ position: 'relative' }}>
            {!isListening ? (
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
                  boxSizing: 'border-box',
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
            ) : (
              <div style={{ 
                width: '100%', 
                boxSizing: 'border-box', 
                padding: '20px 15px', 
                borderRadius: '8px', 
                backgroundColor: 'rgba(52, 152, 219, 0.05)', 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '80px'
              }}>
                <div className="listening-global" style={{ color: 'var(--primary-color)' }}>
                  <Mic size={32} />
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginTop: 'auto', paddingTop: '20px' }}>
              <div className="text-muted" style={{ fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'left' }}>
                {sentenceCount}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
                <button 
                  className="icon-btn" 
                  onClick={goBack} 
                  disabled={historyIndex <= 0}
                  style={{ backgroundColor: 'var(--bg-secondary)', width: '48px', height: '48px', opacity: historyIndex <= 0 ? 0.5 : 1 }}
                  title="Vorheriger Satz"
                >
                  <SkipBack size={24} />
                </button>
                
                <button 
                  className="icon-btn" 
                  onClick={() => generateSentence()} 
                  style={{ backgroundColor: 'var(--bg-secondary)', width: '48px', height: '48px' }}
                  title="Nächster Satz"
                >
                  <SkipForward size={24} />
                </button>

                {concentratedMode && (
                  <button 
                    className="btn-secondary" 
                    onClick={() => generateSentence(logicData, true)}
                    title="Nächstes Verb"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '48px' }}
                  >
                    <SkipForward size={20} />
                    <span style={{ fontSize: '0.9rem' }}>Nächstes Verb</span>
                  </button>
                )}
              </div>
              <div></div>
            </div>
          </div>

          <div style={{ height: '44px', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {feedback === 'correct' && (
              <div style={{ textAlign: 'center', color: 'var(--right-color)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={24} /> Richtig!
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
