import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

type RecorderContextType = {
  isListening: boolean;
  toggleListening: () => void;
  startListening: () => void;
  stopListening: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  transcript: string;
  getLatestWords: (count: number) => string;
};

const RecorderContext = createContext<RecorderContextType | undefined>(undefined);

export const RecorderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState('it-IT');
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const bufferRef = useRef('');

  const getLatestWords = useCallback((count: number): string => {
    const clean = transcript ? transcript.trim() : bufferRef.current.trim();
    if (!clean) return '';
    const words = clean.split(/\s+/).filter(Boolean);
    return words.slice(-Math.max(1, count)).join(' ');
  }, [transcript]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Browser Speech Recognition not supported.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      console.log("🎤 Browser-Erkennung gestartet");
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let combinedTranscript = "";
      for (let i = 0; i < event.results.length; ++i) {
        combinedTranscript += event.results[i][0].transcript;
      }
      
      const text = combinedTranscript.trim().toLowerCase();
      const words = text.split(/\s+/).filter(Boolean);
      
      // Strict 50-word buffer cap: discard oldest words from the front
      const cappedWords = words.slice(-50);
      const trimmedText = cappedWords.join(' ');
      bufferRef.current = trimmedText;
      setTranscript(trimmedText);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech Recognition Error:", event.error);
      if (event.error === 'no-speech') return;
      if (['not-allowed', 'service-not-allowed'].includes(event.error)) {
        shouldListenRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      console.log("🎤 Browser-Erkennung beendet");
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch (e) {
          setTimeout(() => {
            if (shouldListenRef.current) recognition.start();
          }, 300);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      setIsListening(false);
      try { recognition.stop(); } catch (e) {}
    };
  }, []);

  // 100ms Ticker effect to update visual transcript smoothly
  useEffect(() => {
    if (!isListening) return;

    const ticker = setInterval(() => {
      setTranscript(bufferRef.current);
    }, 100);

    return () => clearInterval(ticker);
  }, [isListening]);

  // Sync language changes
  useEffect(() => {
    if (recognitionRef.current) {
      console.log(`🌐 Erkennungssprache geändert auf: ${language}`);
      recognitionRef.current.lang = language;
      if (shouldListenRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
        setTimeout(() => {
          if (shouldListenRef.current) {
            try { recognitionRef.current.start(); } catch (e) {}
          }
        }, 150);
      }
    }
  }, [language]);

  const startListening = useCallback(() => {
    shouldListenRef.current = true;
    setIsListening(true);
    try { recognitionRef.current?.start(); } catch (e: any) {
      if (e.name !== 'InvalidStateError') console.error("Failed to start recognition:", e);
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    setIsListening(false);
    window.speechSynthesis.cancel();
    try { recognitionRef.current?.stop(); } catch(e) {}
  }, []);

  const toggleListening = useCallback(() => {
    if (shouldListenRef.current || isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return (
    <RecorderContext.Provider value={{ 
      isListening, 
      toggleListening,
      startListening,
      stopListening,
      language, 
      setLanguage, 
      transcript, 
      getLatestWords
    }}>
      {children}
    </RecorderContext.Provider>
  );
};

export const useRecorder = () => {
  const context = useContext(RecorderContext);
  if (context === undefined) throw new Error('useRecorder must be used within a RecorderProvider');
  return context;
};
