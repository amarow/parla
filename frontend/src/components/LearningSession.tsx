import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import Flashcard from './Flashcard';
import VerbDrill from './VerbDrill';
import SentenceDrill from './SentenceDrill';
import { API_BASE } from '../api';
import { RotateCcw, List, BookOpen, X, Volume2, Play, Square } from 'lucide-react';
import { useVoice } from '../contexts/VoiceContext';

export default function LearningSession({ user, categoryId, direction, onFinish, onCancel }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showOverview, setShowOverview] = useState(false);
  const [flipCount, setFlipCount] = useState(0);
  const { transcript, clearTranscript } = useVoice();
  const resetChildRef = useRef<(() => void) | null>(null);

  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const isPlayingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const pauseTime = user?.pause_time || 800;

  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handleRestart = () => {
    setCurrentIndex(0);
    if (resetChildRef.current) {
        resetChildRef.current();
    }
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['sessionItems', categoryId],
    queryFn: async () => {
      if (categoryId === 'sentences') {
        return { items: [], type: 'sentences' };
      }
      let res = await axios.get(`${API_BASE}/words?category_id=${categoryId}`);
      if (res.data && res.data.length > 0) {
        return { items: res.data, type: 'words' };
      }
      res = await axios.get(`${API_BASE}/verbs?category_id=${categoryId}`);
      return { items: res.data || [], type: 'verbs' };
    },
    staleTime: 0 
  });

  const items = data?.items || [];
  const itemType = data?.type || 'words';

  const togglePlayAll = async () => {
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      setIsPlayingAll(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    isPlayingRef.current = true;
    setIsPlayingAll(true);

    for (const item of items) {
      if (!isPlayingRef.current) break;
      
      const langCode = 'it';
      const playPart = async (text: string) => {
        if (!isPlayingRef.current || !text) return;
        await new Promise<void>((resolve) => {
          const encodedText = encodeURIComponent(text);
          const url = `${API_BASE}/tts?text=${encodedText}&lang=${langCode}`;
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(error => {
            console.error("Fehler beim Abspielen:", error);
            resolve();
          });
        });
        if (isPlayingRef.current) {
          await new Promise(r => setTimeout(r, pauseTime));
        }
      };

      if (itemType === 'words') {
        await playPart(item.foreign_word);
      } else if (itemType === 'verbs') {
        const conj = item.conjugations?.[0];
        await playPart(item.foreign_infinitive);
        if (conj) {
          await playPart(`io ${conj.form_1s}`);
          await playPart(`tu ${conj.form_2s}`);
          await playPart(`lui lei ${conj.form_3s}`);
          await playPart(`noi ${conj.form_1p}`);
          await playPart(`voi ${conj.form_2p}`);
          await playPart(`loro ${conj.form_3p}`);
        }
      }
    }
    
    isPlayingRef.current = false;
    setIsPlayingAll(false);
  };

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
    const langCode = 'it'; 
    const encodedText = encodeURIComponent(text);
    const url = `${API_BASE}/tts?text=${encodedText}&lang=${langCode}`;

    const audio = new Audio(url);
    audio.play().catch(error => {
      console.error("Fehler beim Abspielen des Audios:", error);
    });
  };

  if (isLoading || isFetching) return <div className="loading">Lade Inhalte...</div>;
  if (itemType !== 'sentences' && items.length === 0) return <div className="loading">Keine Inhalte gefunden.</div>;


  return (
    <div className="learning-session">
      {itemType !== 'sentences' && (
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
      )}

        {showOverview ? (
        <div className="overview-container card-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Übersicht</h3>
            <button 
              className="btn-secondary" 
              onClick={togglePlayAll}
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
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Fremdsprache</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                      {itemType === 'words' ? item.native_word : item.native_infinitive}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: itemType === 'verbs' ? 'bold' : 'normal' }}>
                            {itemType === 'words' ? item.foreign_word : item.foreign_infinitive}
                          </span>
                          {itemType === 'verbs' && item.conjugations && item.conjugations[0] && (
                            <div style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-color)', opacity: 0.9 }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                                <div>io {item.conjugations[0].form_1s}</div>
                                <div>noi {item.conjugations[0].form_1p}</div>
                                <div>tu {item.conjugations[0].form_2s}</div>
                                <div>voi {item.conjugations[0].form_2p}</div>
                                <div>lui/lei {item.conjugations[0].form_3s}</div>
                                <div>loro {item.conjugations[0].form_3p}</div>
                              </div>
                            </div>
                          )}
                        </div>
                        <button 
                          type="button" 
                          onClick={(e) => playAudio(e, itemType === 'words' ? item.foreign_word : (item.conjugations && item.conjugations[0] ? `${item.foreign_infinitive}, io ${item.conjugations[0].form_1s}, tu ${item.conjugations[0].form_2s}, lui lei ${item.conjugations[0].form_3s}, noi ${item.conjugations[0].form_1p}, voi ${item.conjugations[0].form_2p}, loro ${item.conjugations[0].form_3p}` : item.foreign_infinitive))}
                          title="Vorlesen"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: 0.8, marginLeft: '8px' }}
                        >
                            <Volume2 size={16} color="#3498db" />
                        </button>
                      </div>
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
        ) : itemType === 'verbs' ? (
          <VerbDrill
            verb={items[currentIndex]}
            direction={direction}
            onFinish={handleVerbFinish}
            onFlip={handleFlip}
            onReset={(fn) => { resetChildRef.current = fn; }}
          />
        ) : (
          <SentenceDrill
            user={user}
            pronounKey={direction}
            onFinish={() => onFinish(flipCount)}
            onCancel={onCancel}
          />
        )
        )}    </div>  );
}
