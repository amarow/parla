import { useState, useEffect } from 'react';
import axios from 'axios';
import Flashcard from './Flashcard';
import { API_BASE } from '../api';
import { RotateCcw, List, BookOpen, X } from 'lucide-react';

export default function LearningSession({ categoryId, direction, onFinish, onCancel }) {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showOverview, setShowOverview] = useState(false);
  const [flipCount, setFlipCount] = useState(0);

  useEffect(() => {
    axios.get(`${API_BASE}/words?category_id=${categoryId}`)
      .then(res => {
        setWords(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [categoryId]);

  const handleAnswer = (isCorrect) => {
    if (currentIndex + 1 < words.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onFinish(flipCount);
    }
  };

  const handleFlip = () => {
    setFlipCount(prev => prev + 1);
  };

  if (loading) return <div className="loading">Lade Vokabeln...</div>;
  if (words.length === 0) return <div className="loading">Keine Vokabeln gefunden.</div>;

  return (
    <div className="learning-session">
      <div className="session-header">
        <div className="progress-text">
          <span className="desktop-text">Karte {currentIndex + 1} von {words.length}</span>
          <span className="mobile-text">{currentIndex + 1} / {words.length}</span>
        </div>
        <div className="header-buttons" style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setCurrentIndex(0)} className="btn-cancel icon-text-btn" title="Von vorne">
            <RotateCcw size={16} className="mobile-icon" />
            <span className="desktop-text">Von vorne</span>
          </button>
          <button onClick={() => setShowOverview(!showOverview)} className="btn-cancel icon-text-btn" title={showOverview ? 'Lernen' : 'Übersicht'}>
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
          <h3>Vokabel-Übersicht</h3>
          <div className="words-list" style={{ maxHeight: '60vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Deutsch</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Fremdsprache</th>
                </tr>
              </thead>
              <tbody>
                {words.map(word => (
                  <tr key={word.id}>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>{word.native_word}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>{word.foreign_word}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <Flashcard
          key={currentIndex}
          word={words[currentIndex]}
          direction={direction}
          onAnswer={handleAnswer}
          onFlip={handleFlip}
        />
      )}    </div>
  );
}
