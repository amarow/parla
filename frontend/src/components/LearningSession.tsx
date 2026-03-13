import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import Flashcard from './Flashcard';
import VerbDrill from './VerbDrill';
import { API_BASE } from '../api';
import { RotateCcw, List, BookOpen, X, Volume2 } from 'lucide-react';
import { useVoice } from '../contexts/VoiceContext';

export default function LearningSession({ categoryId, direction, onFinish, onCancel }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showOverview, setShowOverview] = useState(false);
  const [flipCount, setFlipCount] = useState(0);
  const { transcript, clearTranscript } = useVoice();
  const resetChildRef = useRef<(() => void) | null>(null);

  const handleRestart = () => {
    setCurrentIndex(0);
    if (resetChildRef.current) {
        resetChildRef.current();
    }
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['sessionItems', categoryId],
    queryFn: async () => {
      let res = await axios.get(`${API_BASE}/words?category_id=${categoryId}`);
      if (res.data && res.data.length > 0) {
        return { items: res.data, type: 'words' };
      }
      res = await axios.get(`${API_BASE}/verbs?category_id=${categoryId}`);
      return { items: res.data || [], type: 'verbs' };
    },
    staleTime: 0 // Fetch fresh items every time a new session starts
  });

  const items = data?.items || [];
  const itemType = data?.type || 'words';

  const handleAnswer = (isCorrect) => {
    if (currentIndex + 1 < items.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onFinish(flipCount);
    }
  };

  const handleVerbFinish = (isCorrect) => {
    if (!isCorrect) {
      setFlipCount(prev => prev + 1);
    }
    
    if (currentIndex + 1 < items.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onFinish(flipCount + (isCorrect ? 0 : 1));
    }
  };

  const handleFlip = () => {
    setFlipCount(prev => prev + 1);
  };

  const playAudio = (e: any, text: string) => {
    e.preventDefault();
    e.stopPropagation();
    const langCode = 'it'; // Foreign language is Italian
    const encodedText = encodeURIComponent(text);
    const url = `${API_BASE}/tts?text=${encodedText}&lang=${langCode}`;

    const audio = new Audio(url);
    audio.play().catch(error => {
      console.error("Fehler beim Abspielen des Audios:", error);
    });
  };

  if (isLoading || isFetching) return <div className="loading">Lade Inhalte...</div>;
  if (items.length === 0) return <div className="loading">Keine Inhalte gefunden.</div>;

  return (
    <div className="learning-session">
      <div className="session-header">
        <div className="progress-text">
          <span className="desktop-text">Karte {currentIndex + 1} von {items.length}</span>
          <span className="mobile-text">{currentIndex + 1} / {items.length}</span>
        </div>
        <div className="header-buttons" style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleRestart} className="btn-cancel icon-text-btn" title="Von vorne">
            <RotateCcw size={16} className="mobile-icon" />
            <span className="desktop-text">Von vorne</span>
          </button>
          <button onClick={() => setShowOverview(!showOverview)} className="btn-cancel icon-text-btn" title={showOverview ? "Lernen" : "Übersicht"}>
            {showOverview ? <BookOpen size={16} className="mobile-icon" /> : <List size={16} className="mobile-icon" />}
            <span className="desktop-text">{showOverview ? 'Lernen' : 'Übersicht'}</span>
          </button>
          <button onClick={onCancel} className="btn-cancel icon-text-btn" title="Abbrechen">
            <X size={16} className="mobile-icon" />
            <span className="desktop-text">Abbrechen</span>
          </button>
        </div>
        </div>

        {showOverview ? (
        <div className="overview-container card-panel">
          <h3>Übersicht</h3>
          <div className="words-list" style={{ maxHeight: '60vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Deutsch</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Fremdsprache</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>
                      {itemType === 'words' ? item.native_word : item.native_infinitive}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{itemType === 'words' ? item.foreign_word : item.foreign_infinitive}</span>
                      <button 
                        type="button" 
                        onClick={(e) => playAudio(e, itemType === 'words' ? item.foreign_word : item.foreign_infinitive)}
                        title="Vorlesen"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: 0.8 }}
                      >
                          <Volume2 size={16} color="#3498db" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        ) : (
        itemType === 'words' ? (
          <Flashcard
            word={items[currentIndex]}
            direction={direction}
            onAnswer={handleAnswer}
            onFlip={handleFlip}
          />
        ) : (
          <VerbDrill
            verb={items[currentIndex]}
            direction={direction}
            onFinish={handleVerbFinish}
            onFlip={handleFlip}
            onReset={(fn) => { resetChildRef.current = fn; }}
          />
        )
        )}    </div>  );
}
