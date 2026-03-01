import { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';

export default function Flashcard({ word, direction, onAnswer }) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset flip state when the word changes
  useEffect(() => {
    setIsFlipped(false);
  }, [word]);

  const frontText = direction === 'nativeToForeign' ? word.native_word : word.foreign_word;
  const backText = direction === 'nativeToForeign' ? word.foreign_word : word.native_word;
  const backLang = direction === 'nativeToForeign' ? 'it-IT' : 'de-DE';

  const playAudio = (e) => {
    e.stopPropagation(); // Prevents card from flipping when clicking the audio button
    
    // Wir holen uns das Audio nun sicher über unser eigenes Backend
    const langCode = backLang.split('-')[0]; // 'it-IT' wird zu 'it'
    const text = encodeURIComponent(backText);
    const url = `http://localhost:3001/api/tts?text=${text}&lang=${langCode}`;
    
    const audio = new Audio(url);
    audio.play().catch(error => {
      console.error("Fehler beim Abspielen des Audios:", error);
      alert("Audio konnte nicht abgespielt werden. Bitte prüfe, ob dein Lautsprecher an ist.");
    });
  };

  return (
    <div className="flashcard-container">
      <div 
        className={`flashcard ${isFlipped ? 'flipped' : ''}`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className="flashcard-inner">
          <div className="flashcard-front">
            <h2>{frontText}</h2>
            <p className="hint">Klicken zum Umdrehen</p>
          </div>
          <div className="flashcard-back">
            <h2>{backText}</h2>
            <button className="audio-btn" onClick={playAudio} title="Vorlesen">
              <Volume2 size={32} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="action-buttons">
        <button 
          className={`btn-wrong ${!isFlipped ? 'btn-hidden' : ''}`} 
          onClick={() => onAnswer(false)} 
          disabled={!isFlipped}
        >
          Falsch (Neustart)
        </button>
        <button 
          className="btn-right" 
          onClick={() => isFlipped ? onAnswer(true) : setIsFlipped(true)}
        >
          {isFlipped ? 'Richtig (Weiter)' : 'Aufdecken (Weiter)'}
        </button>
      </div>
    </div>
  );
}
