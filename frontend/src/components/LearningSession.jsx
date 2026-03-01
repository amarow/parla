import { useState, useEffect } from 'react';
import axios from 'axios';
import Flashcard from './Flashcard';
import { API_BASE } from '../api';

export default function LearningSession({ categoryId, direction, onFinish, onCancel }) {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

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
    if (isCorrect) {
      if (currentIndex + 1 < words.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onFinish();
      }
    } else {
      // Hardcore Mode: Back to start!
      setCurrentIndex(0);
    }
  };

  if (loading) return <div className="loading">Lade Vokabeln...</div>;
  if (words.length === 0) return <div className="loading">Keine Vokabeln gefunden.</div>;

  return (
    <div className="learning-session">
      <div className="session-header">
        <span>Karte {currentIndex + 1} von {words.length}</span>
        <button onClick={onCancel} className="btn-cancel">Abbrechen</button>
      </div>
      
      <Flashcard 
        key={currentIndex} 
        word={words[currentIndex]} 
        direction={direction} 
        onAnswer={handleAnswer} 
      />
    </div>
  );
}
