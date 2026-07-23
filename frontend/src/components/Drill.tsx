import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import VocabDrill from './VocabDrill';
import ConjugationDrill from './ConjugationDrill';
import SentenceDrill from './SentenceDrill';
import { dataService } from '../dataService';
import { speakText } from '../api';
import { ArrowLeftRight, List, BookOpen, XCircle, Volume2, Play, Square } from 'lucide-react';
import { statsService } from '../utils/statsService';
import { useSession } from '../contexts/SessionContext';

export default function Drill({ categoryId, direction, onFinish, onCancel, onAutoAdvance }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showOverview, setShowOverview] = useState(false);
  const [flipCount, setFlipCount] = useState(0);
  const resetChildRef = useRef<(() => void) | null>(null);
  const [currentDirection, setCurrentDirection] = useState(direction);

  const [isPlayingAll, setIsPlayingAll] = useState(false);

  const { user, speedProfile } = useSession();
  const pauseTime = speedProfile.pauseTime;
  const speechRate = speedProfile.speechRate;

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleDirection = () => {
    setCurrentDirection(prev => prev === 'nativeToForeign' ? 'foreignToNative' : 'nativeToForeign');
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['sessionItems', categoryId],
    queryFn: async () => {
      if (categoryId === 'sentences') {
        return { items: [], type: 'sentences' };
      }
      
      const words = await dataService.getWords(categoryId);
      if (words && words.length > 0) {
        return { items: words, type: 'words' };
      }
      
      const verbs = await dataService.getVerbs(categoryId);
      return { items: verbs || [], type: 'verbs' };
    },
    staleTime: 0 
  });

  const items: any[] = data?.items || [];
  const itemType = data?.type || 'words';

  useEffect(() => {
    if (items && items.length > 0) {
      statsService.startSession(categoryId, items.length);
    }
  }, [categoryId, items]);

  // Reset currentIndex when category changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [categoryId]);

  // Autoplay loop effect
  useEffect(() => {
    if (!isPlayingAll || items.length === 0 || !showOverview) return;

    let isCurrent = true;

    const playCurrentItem = async () => {
      if (currentIndex >= items.length) {
        // Reached end of current category -> Auto advance
        const advanced = onAutoAdvance ? onAutoAdvance() : false;
        if (!advanced) {
          setIsPlayingAll(false);
        }
        return;
      }

      const item = items[currentIndex];
      if (!item) return;

      const langCode = 'it';
      if (itemType === 'words') {
        await speakText(item.foreign_word, langCode, speechRate, user?.voice_it);
      } else if (itemType === 'verbs') {
        const conj = item.conjugations?.[0];
        if (conj) {
          const text = `${item.foreign_infinitive}, io ${conj.form_1s}, tu ${conj.form_2s}, lui lei ${conj.form_3s}, noi ${conj.form_1p}, voi ${conj.form_2p}, loro ${conj.form_3p}`;
          await speakText(text, langCode, speechRate, user?.voice_it);
        } else {
          await speakText(item.foreign_infinitive, langCode, speechRate, user?.voice_it);
        }
      }

      if (isCurrent && isPlayingAll) {
        await new Promise(r => setTimeout(r, pauseTime));
        if (isCurrent && isPlayingAll) {
          setCurrentIndex(prev => prev + 1);
        }
      }
    };

    playCurrentItem();

    return () => {
      isCurrent = false;
      window.speechSynthesis.cancel();
    };
  }, [isPlayingAll, currentIndex, categoryId, items, itemType, pauseTime, speechRate, user, showOverview, onAutoAdvance]);

  const togglePlayAll = () => {
    if (isPlayingAll) {
      setIsPlayingAll(false);
      window.speechSynthesis.cancel();
    } else {
      setCurrentIndex(0);
      setIsPlayingAll(true);
    }
  };

  const handleAnswer = (isCorrect: boolean) => {
    if (currentIndex + 1 >= items.length) {
      const advanced = onAutoAdvance ? onAutoAdvance() : false;
      if (!advanced) {
        onFinish(isCorrect);
      }
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleVerbFinish = (isCorrect: boolean) => {
    if (currentIndex + 1 >= items.length) {
      const advanced = onAutoAdvance ? onAutoAdvance() : false;
      if (!advanced) {
        onFinish(isCorrect);
      }
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleFlip = () => {
    setFlipCount(prev => prev + 1);
  };

  const playAudio = (e: any, text: string) => {
    e.stopPropagation();
    const langCode = 'it';
    speakText(text, langCode, speechRate, user?.voice_it);
  };

  if (isLoading) {
    return <div className="card-panel">Lade Lerninhalte...</div>;
  }

  if (itemType === 'sentences') {
    return (
      <SentenceDrill
        pronounKey="form_1s"
        onFinish={onFinish}
        onCancel={onCancel}
        onFlip={handleFlip}
      />
    );
  }

  if (!items || items.length === 0) {
    return <div className="card-panel">Keine Übungen in dieser Kategorie gefunden.</div>;
  }

  return (
    <div className="learning-session" style={{ display: 'flex', flexDirection: 'column', minHeight: '60vh' }}>
      {showOverview ? (
        <div className="overview-container">
          <div className="headline" style={{ marginBottom: '16px' }}>
            <div className="meta-info">
              <h2 className="text-large" style={{ margin: 0 }}>
                {itemType === 'words' ? 'Vokabeln (Übersicht)' : 'Konjugationen (Übersicht)'}
              </h2>
            </div>
            <div className="headline-buttons">
              <button 
                className="btn-secondary" 
                onClick={togglePlayAll}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', fontSize: '0.85rem' }}
              >
                {isPlayingAll ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                {isPlayingAll ? 'Stop' : 'Alle vorlesen'}
              </button>
              <button onClick={() => setShowOverview(false)} className="icon-btn" title="Lernen">
                <BookOpen size={20} />
              </button>
              <button onClick={onCancel} className="icon-btn" title="Beenden">
                <XCircle size={20} />
              </button>
            </div>
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
          <VocabDrill
            word={items[currentIndex]}
            direction={currentDirection}
            onAnswer={handleAnswer}
            onBack={handleBack}
            onFlip={handleFlip}
            progress={`${currentIndex + 1}/${items.length}`}
            onToggleDirection={toggleDirection}
            onToggleOverview={() => setShowOverview(!showOverview)}
            showOverview={showOverview}
            onCancel={onCancel}
          />
        ) : itemType === 'verbs' ? (
          <ConjugationDrill
            verb={items[currentIndex]}
            direction={currentDirection}
            onFinish={handleVerbFinish}
            onBack={handleBack}
            onFlip={handleFlip}
            onReset={(fn) => { resetChildRef.current = fn; }}
            progress={`${currentIndex + 1}/${items.length}`}
            onToggleDirection={toggleDirection}
            onToggleOverview={() => setShowOverview(!showOverview)}
            showOverview={showOverview}
            onCancel={onCancel}
          />
        ) : null
      )}
    </div>
  );
}
