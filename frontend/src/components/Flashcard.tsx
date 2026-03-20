import { useState, useEffect, useRef } from 'react';
import { Volume2, Mic, MicOff } from 'lucide-react';
import { API_BASE } from '../api';
import writtenNumber from 'written-number';
import { useVoice } from '../contexts/VoiceContext';

export default function Flashcard({ word, direction, onAnswer, onFlip }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  
  const { isListening, toggleListening, transcript, setLanguage, clearTranscript } = useVoice();
  const lastPlayedRef = useRef<string | null>(null);

  // Reset states when the word changes
  useEffect(() => {
    setIsFlipped(false);
    setIsProcessing(false);
    setSpeechFeedback(null);
    clearTranscript();

    if (word) {
      // Spiele immer den deutschen Text ab, wenn eine neue Karte gezeigt wird
      const textToPlay = word.native_word;
      const langCode = 'de';
      
      if (textToPlay && lastPlayedRef.current !== textToPlay) {
        lastPlayedRef.current = textToPlay;
        const url = `${API_BASE}/tts?text=${encodeURIComponent(textToPlay)}&lang=${langCode}`;
        const audio = new Audio(url);
        
        setIsAudioPlaying(true);
        audio.onended = () => {
          clearTranscript();
          setTimeout(() => setIsAudioPlaying(false), 150);
        };
        audio.onerror = () => {
          clearTranscript();
          setIsAudioPlaying(false);
        };
        
        audio.play().catch(error => {
          console.warn("Autoplay blockiert:", error);
          setIsAudioPlaying(false);
        });
      }
    }
  }, [word, clearTranscript, direction]);

  const handleFlip = () => {
    if (!isFlipped) {
      if (onFlip) onFlip();
      setIsFlipped(true);
    } else {
      setIsFlipped(false);
    }
  };

  const frontText = direction === 'nativeToForeign' ? word.native_word : word.foreign_word;
  const backText = direction === 'nativeToForeign' ? word.foreign_word : word.native_word;
  const backLang = direction === 'nativeToForeign' ? 'it-IT' : 'de-DE';

  useEffect(() => {
    setLanguage(backLang);
  }, [backLang, setLanguage]);

  useEffect(() => {
    if (!transcript || isProcessing || isAudioPlaying) return;

    console.log("🗣️ [Flashcard] Transcript gehört:", transcript);
    const transcriptLower = transcript.toLowerCase();

    if (isFlipped) return; // Only process answer if not flipped

    const target = backText.toLowerCase().trim();

    const normalize = (str: string) => {
      const langCode = backLang.split('-')[0];
      const words = str.split(' ').map(w => {
        if (/^\d+$/.test(w)) {
          try { return writtenNumber(parseInt(w), { lang: langCode === 'it' ? 'it' : 'de' }); } catch (e) { return w; }
        }
        return w;
      });
      
      return words.join(' ')
        .replace(/[.,!?]/g, '')
        .replace(/['’´`"]/g, '')
        .replace(/\s+/g, '')
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const cleanTranscript = normalize(transcript);
    const cleanTarget = normalize(target);

    const levenshtein = (a: string, b: string) => {
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;
      const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
      for (let i = 0; i <= a.length; i += 1) matrix[0][i] = i;
      for (let j = 0; j <= b.length; j += 1) matrix[j][0] = j;
      for (let j = 1; j <= b.length; j += 1) {
        for (let i = 1; i <= a.length; i += 1) {
          const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[j][i] = Math.min(
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1,
            matrix[j - 1][i - 1] + indicator
          );
        }
      }
      return matrix[b.length][a.length];
    };

    const distance = levenshtein(cleanTranscript, cleanTarget);
    const maxDistance = cleanTarget.length > 5 ? 2 : (cleanTarget.length > 3 ? 1 : 0);
    const isFuzzyMatch = distance <= maxDistance;

    if (cleanTranscript && (cleanTranscript === cleanTarget || cleanTranscript.includes(cleanTarget) || cleanTarget.includes(cleanTranscript) || isFuzzyMatch)) {
        setSpeechFeedback('correct');
        setIsProcessing(true);
        
        setTimeout(() => {
            setSpeechFeedback(null);
            setIsProcessing(false);
            clearTranscript();
            onAnswer(true);
        }, 300);
    }
  }, [transcript, backText, backLang, isFlipped, isProcessing, isAudioPlaying, onAnswer, clearTranscript]);

  // Second effect for commands WHEN the card is flipped
  useEffect(() => {
      if (!transcript || !isFlipped || isProcessing || isAudioPlaying) return;

      const transcriptLower = transcript.toLowerCase();
      
      if (transcriptLower.includes('zurück') || transcriptLower.includes('back')) {
          handleFlip();
          clearTranscript();
          return;
      }

      if (transcriptLower.includes('weiter') || transcriptLower.includes('richtig') || transcriptLower.includes('next')) {
          clearTranscript();
          onAnswer(true);
          return;
      }

      if (transcriptLower.includes('falsch') || transcriptLower.includes('wrong') || transcriptLower.includes('nochmal')) {
          clearTranscript();
          onAnswer(false);
          return;
      }
  }, [transcript, isFlipped, isProcessing, isAudioPlaying, onAnswer, clearTranscript]);

  const toggleListeningLocal = (e: any) => {
    if (e) e.stopPropagation();
    toggleListening();
  };

  const playAudio = (e: any) => {
    e.stopPropagation();
    const langCode = backLang.split('-')[0];
    const text = encodeURIComponent(backText);
    const url = `${API_BASE}/tts?text=${text}&lang=${langCode}`;
    
    const audio = new Audio(url);
    
    setIsAudioPlaying(true);
    audio.onended = () => {
      clearTranscript();
      setTimeout(() => setIsAudioPlaying(false), 150);
    };
    audio.onerror = () => {
      clearTranscript();
      setIsAudioPlaying(false);
    };
    
    audio.play().catch(error => {
      console.error("Fehler beim Abspielen des Audios:", error);
      setIsAudioPlaying(false);
      alert("Audio konnte nicht abgespielt werden. Bitte prüfe, ob dein Lautsprecher an ist.");
    });
  };

  return (
    <div className="flashcard-container">
      <div 
        className={`flashcard ${isFlipped ? 'flipped' : ''} ${speechFeedback === 'incorrect' ? 'shake' : ''}`}
        onClick={handleFlip}
      >
        <div className="flashcard-inner">
          <div className="flashcard-front">
            <h2>{frontText}</h2>
            <div className={`speech-result error-text ${speechFeedback === 'incorrect' && !isFlipped ? 'show-feedback' : ''}`} style={{ marginTop: '30px' }}>
              Versuch es noch einmal.
            </div>
          </div>
          <div className="flashcard-back">
            <h2>{backText}</h2>
            <div className="media-controls">
              <button className="audio-btn" onClick={playAudio} title="Vorlesen">
                <Volume2 size={32} />
              </button>
            </div>
            <div className={`speech-result ${speechFeedback === 'correct' ? 'success-text show-feedback' : speechFeedback === 'incorrect' ? 'error-text show-feedback' : ''}`}>
              {speechFeedback === 'correct' ? 'Super! Richtig ausgesprochen.' : 'Versuch es noch einmal.'}
            </div>
          </div>
        </div>
      </div>
      
      <div className="action-buttons" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button
          className="btn-secondary"
          onClick={() => { clearTranscript(); onAnswer(true); }}
        >
          Weiter
        </button>
      </div>
    </div>
  );
}
