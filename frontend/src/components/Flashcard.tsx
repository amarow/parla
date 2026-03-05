import { useState, useEffect, useRef } from 'react';
import { Volume2, Mic } from 'lucide-react';
import { API_BASE } from '../api';
import writtenNumber from 'written-number';

export default function Flashcard({ word, direction, onAnswer, onFlip }) {
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

    // Wir wollen beim initialen Laden der neuen Karte direkt reinhören, 
    // damit der User Zeit hat, das neue Wort kurz zu lesen.
    const autoStartTimer = setTimeout(() => {
      startListening();
    }, 800);

    return () => clearTimeout(autoStartTimer);
  }, [word]);

  const handleFlip = () => {
    if (!isFlipped) {
      if (onFlip) onFlip();
      setIsFlipped(true);
    } else {
      setIsFlipped(false);
    }
  };

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

  const startListening = (e?: any) => {
    if (e) e.stopPropagation();
    
    // Helper für Timestamps in der Console
    const logTime = (msg, ...args) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
      console.log(`[${timeStr}] ${msg}`, ...args);
    };
    
    const errorTime = (msg, ...args) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
      console.error(`[${timeStr}] ${msg}`, ...args);
    };

    // Wenn wir bereits zuhören oder verarbeiten, bricht ein Klick alles ab (Sicherheit)
    if (isListening || isProcessing) {
      logTime("Already listening or processing. Stopping.");
      stopRecognition();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Dein Browser unterstützt die integrierte Spracherkennung leider nicht. Bitte benutze Chrome oder Edge.");
      return;
    }

    logTime("Stopping previous recognition (if any) before starting new one.");
    stopRecognition(); // Sicherstellen, dass nichts Altes läuft

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    logTime("Speech recognition initialized for lang: " + backLang);
    
    recognition.lang = backLang; // 'it-IT' oder 'de-DE'
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = true; // <--- Hält das Mikrofon offen, auch wenn Pausen entstehen

    recognition.onstart = () => {
      logTime("Speech recognition onstart event fired. Microphone is OPEN.");
      setIsListening(true);
      setSpeechFeedback(null);
      
      // Sicherheits-Timeout: Auf 20 Sekunden erhöht, da continuous mode genutzt wird
      recognitionTimeoutRef.current = setTimeout(() => {
        errorTime("Speech recognition timed out (20s limit)");
        stopRecognition();
      }, 20000);
    };

    // Wir stoppen *nicht* manuell bei onspeechend.
    recognition.onspeechend = () => {
      logTime("Speech recognition onspeechend event fired. Continuous mode is ON, so it should keep listening.");
    };

    recognition.onresult = (event) => {
      logTime("Speech recognition onresult event fired.");
      
      // Da wir in continuous=true sind, nehmen wir das *letzte* Ergebnis aus der Liste
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript.toLowerCase().trim();
      const target = backText.toLowerCase().trim();
      
      // Bereinigung für robusten Vergleich (besonders für Italienisch l'...)
      const normalize = (str) => {
        // Konvertiere Ziffern in Wörter (z.B. "5" -> "cinque" / "fünf")
        const langCode = backLang.split('-')[0]; // 'it' oder 'de'
        const words = str.split(' ').map(word => {
          if (/^\d+$/.test(word)) {
            try {
              return writtenNumber(parseInt(word), { lang: langCode === 'it' ? 'it' : 'de' });
            } catch (e) {
              return word;
            }
          }
          return word;
        });
        
        return words.join(' ')
          .replace(/[.,!?]/g, '')           // Satzzeichen weg
          .replace(/['’´`"]/g, '')          // Alle Arten von Apostrophen UND Anführungszeichen weg
          .replace(/\s+/g, '')              // Alle Leerzeichen weg
          .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Akzente ignorieren
      };

      const cleanTranscript = normalize(transcript);
      const cleanTarget = normalize(target);

      logTime(`Original: "${transcript}", Bereinigt: "${cleanTranscript}"`);
      logTime(`Ziel: "${target}", Bereinigt Ziel: "${cleanTarget}"`);

      // Fuzzy Logic (Levenshtein Distanz)
      const levenshtein = (a, b) => {
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
      // Toleranz basierend auf der Länge des Zielwortes
      const maxDistance = cleanTarget.length > 5 ? 2 : (cleanTarget.length > 3 ? 1 : 0);
      const isFuzzyMatch = distance <= maxDistance;

      logTime(`📊 Vergleichs-Ergebnis:`);
      logTime(`🗣️ Gesprochen: "${transcript}" (bereinigt: "${cleanTranscript}")`);
      logTime(`🎯 Erwartet:   "${target}" (bereinigt: "${cleanTarget}")`);
      logTime(`📏 Distanz (Levenshtein): ${distance} (Maximal erlaubt: ${maxDistance}) -> Akzeptiert: ${isFuzzyMatch ? 'Ja' : 'Nein'}`);

      if (cleanTranscript && (cleanTranscript === cleanTarget || cleanTranscript.includes(cleanTarget) || cleanTarget.includes(cleanTranscript) || isFuzzyMatch)) {
          // RICHTIG
          if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
          setSpeechFeedback('correct');
          setIsProcessing(true);
          stopRecognition(); // Sofort aufhören zuzuhören, da richtig
          
          setTimeout(() => {
              setSpeechFeedback(null);
              setIsProcessing(false);
              onAnswer(true);
          }, 500);
      } else {
          // FALSCH - im Continuous-Mode lassen wir das Mikro einfach weiter offen!
          setSpeechFeedback('incorrect');
          logTime(`Verstanden: "${cleanTranscript}", Erwartet: "${cleanTarget}" - Versuche es weiter...`);
          
          // Wir setzen den Timer für das visuelle Feedback kurz zurück
          setTimeout(() => {
              setSpeechFeedback(null);
          }, 2500);
      }
    };

    recognition.onerror = (event) => {
      errorTime("Speech recognition onerror fired:", event.error);
      if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
      setIsListening(false);
      setIsProcessing(false);
      
      // Bei 'no-speech' stoppen wir das automatische Neustarten, 
      // da dies sonst in einen endlosen Loop läuft, wenn man einfach ruhig ist.
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
         logTime("Recognition stopped due to:", event.error, "- User must click Mic again to retry.");
         // startListening(); // <--- Auskommentiert, um den Loop zu stoppen
      } else if (event.error !== 'aborted') {
        logTime("Setting speech feedback to incorrect due to error:", event.error);
        setSpeechFeedback('incorrect');
        setTimeout(() => {
          setSpeechFeedback(null);
          startListening();
        }, 2000);
      } else {
         logTime("Recognition aborted.");
      }
    };

    try {
      logTime("Attempting to start recognition...");
      recognition.start();
      logTime("Recognition start called successfully.");
    } catch (err) {
      errorTime("Fehler beim Starten der Spracherkennung:", err);
      setIsListening(false);
    }
  };

  const playAudio = (e) => {
    e.stopPropagation(); // Prevents card from flipping when clicking the audio button
    
    // Wir holen uns das Audio nun sicher über unser eigenes Backend
    const langCode = backLang.split('-')[0]; // 'it-IT' wird zu 'it'
    const text = encodeURIComponent(backText);
    const url = `${API_BASE}/tts?text=${text}&lang=${langCode}`;
    
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
        onClick={handleFlip}
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
          onClick={() => isFlipped ? onAnswer(true) : handleFlip()}
        >
          {isFlipped ? 'Richtig' : 'Aufdecken'}
        </button>      </div>
    </div>
  );
}
