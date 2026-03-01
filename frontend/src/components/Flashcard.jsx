import { useState, useEffect, useRef } from 'react';
import { Volume2, Mic } from 'lucide-react';
import { API_BASE } from '../api';

export default function Flashcard({ word, direction, onAnswer }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState(null); // 'correct', 'incorrect'
  const recognitionRef = useRef(null);

  const recognitionTimeoutRef = useRef(null);

  // Reset states when the word changes
  useEffect(() => {
    setIsFlipped(false);
    setIsListening(false);
    setIsProcessing(false);
    setSpeechFeedback(null);
    stopRecognition();

    // Automatischer Start der Aufnahme nach einer kurzen Verzögerung,
    // damit der User Zeit hat, das neue Wort kurz zu lesen.
    const autoStartTimer = setTimeout(() => {
      startListening();
    }, 800);

    return () => clearTimeout(autoStartTimer);
  }, [word]);

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      } catch (e) {
        console.warn("Error stopping recognition:", e);
      }
      recognitionRef.current = null;
    }
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }
    setIsListening(false);
    setIsProcessing(false);
  };

  const frontText = direction === 'nativeToForeign' ? word.native_word : word.foreign_word;
  const backText = direction === 'nativeToForeign' ? word.foreign_word : word.native_word;
  const backLang = direction === 'nativeToForeign' ? 'it-IT' : 'de-DE';

  const startListening = (e) => {
    if (e) e.stopPropagation();
    
    // Wenn wir bereits zuhören oder verarbeiten, bricht ein Klick alles ab (Sicherheit)
    if (isListening || isProcessing) {
      stopRecognition();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Dein Browser unterstützt die integrierte Spracherkennung leider nicht. Bitte benutze Chrome oder Edge.");
      return;
    }

    stopRecognition(); // Sicherstellen, dass nichts Altes läuft

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.lang = backLang; // 'it-IT' oder 'de-DE'
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechFeedback(null);
      
      // Sicherheits-Timeout: Wenn nach 8 Sekunden nichts passiert ist, brechen wir ab
      recognitionTimeoutRef.current = setTimeout(() => {
        console.warn("Speech recognition timed out");
        stopRecognition();
      }, 8000);
    };

    recognition.onspeechend = () => {
      recognition.stop();
    };

    recognition.onresult = (event) => {
      if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
      setIsListening(false);
      setIsProcessing(true);
      
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      const target = backText.toLowerCase().trim();
      
      // Bereinigung für robusten Vergleich (besonders für Italienisch l'...)
      const normalize = (str) => {
        return str
          .replace(/[.,!?]/g, '')           // Satzzeichen weg
          .replace(/['’´`"]/g, '')          // Alle Arten von Apostrophen UND Anführungszeichen weg
          .replace(/\s+/g, '')              // Alle Leerzeichen weg
          .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Akzente ignorieren
      };

      const cleanTranscript = normalize(transcript);
      const cleanTarget = normalize(target);

      console.log(`Original: "${transcript}", Bereinigt: "${cleanTranscript}"`);
      console.log(`Ziel: "${target}", Bereinigt Ziel: "${cleanTarget}"`);

      if (cleanTranscript && (cleanTranscript === cleanTarget || cleanTranscript.includes(cleanTarget) || cleanTarget.includes(cleanTranscript))) {
          setSpeechFeedback('correct');
          setTimeout(() => {
              setSpeechFeedback(null);
              setIsProcessing(false);
              onAnswer(true);
          }, 500);
      } else {
          setSpeechFeedback('incorrect');
          console.log(`Verstanden: "${cleanTranscript}", Erwartet: "${cleanTarget}"`);
          setTimeout(() => {
              setSpeechFeedback(null);
              setIsProcessing(false);
              // Automatischer Neustart nach falscher Aussprache
              startListening();
          }, 2500);
      }
    };

    recognition.onerror = (event) => {
      if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      setIsProcessing(false);
      
      // Bei 'no-speech' oder Abbruch starten wir einfach neu, 
      // bei echten Fehlern zeigen wir Feedback und starten dann neu.
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
         startListening();
      } else if (event.error !== 'aborted') {
        setSpeechFeedback('incorrect');
        setTimeout(() => {
          setSpeechFeedback(null);
          startListening();
        }, 2000);
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Fehler beim Starten der Spracherkennung:", err);
      setIsListening(false);
    }
  };

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
        className={`flashcard ${isFlipped ? 'flipped' : ''} ${speechFeedback === 'incorrect' ? 'shake' : ''}`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className="flashcard-inner">
          <div className="flashcard-front">
            <h2>{frontText}</h2>
            <div className="media-controls">
              <button 
                className={`mic-btn ${isListening && !isFlipped ? 'listening' : ''}`} 
                onClick={startListening} 
                title={isListening ? "Aufnahme stoppen" : "Aussprache üben (Sprechen)"}
                disabled={isProcessing}
              >
                <Mic size={32} />
              </button>
            </div>
            <div className={`speech-result error-text ${speechFeedback === 'incorrect' && !isFlipped ? 'show-feedback' : ''}`}>
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
      
      <div className="action-buttons">
        <button 
          className={`btn-wrong ${!isFlipped ? 'btn-hidden' : ''}`} 
          onClick={() => onAnswer(false)} 
          disabled={!isFlipped}
        >
          Falsch
        </button>
        <button 
          className="btn-right" 
          onClick={() => isFlipped ? onAnswer(true) : setIsFlipped(true)}
        >
          {isFlipped ? 'Richtig' : 'Aufdecken'}
        </button>
      </div>
    </div>
  );
}
