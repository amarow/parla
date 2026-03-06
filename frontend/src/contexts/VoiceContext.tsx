import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

type VoiceContextType = {
  isListening: boolean;
  toggleListening: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  transcript: string; // The latest cleaned/normalized transcript chunk
  clearTranscript: () => void;
};

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState('it-IT'); // Default
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try { recognition.start(); } catch (e) {}
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech' && e.error !== 'audio-capture' && e.error !== 'aborted') {
        shouldListenRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onresult = (event: any) => {
      let combinedTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        combinedTranscript += event.results[i][0].transcript;
      }
      setTranscript(combinedTranscript.trim().toLowerCase());
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (recognitionRef.current && recognitionRef.current.lang !== language) {
      recognitionRef.current.lang = language;
      // Restart ONLY if language changes while listening
      if (isListening) {
        shouldListenRef.current = false;
        try { recognitionRef.current.stop(); } catch(e) {}
        setTimeout(() => {
            shouldListenRef.current = true;
            try { recognitionRef.current.start(); } catch(e) {}
        }, 100);
      }
    }
  }, [language]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      shouldListenRef.current = false;
      try { recognitionRef.current?.stop(); } catch (e) {}
    } else {
      shouldListenRef.current = true;
      try { recognitionRef.current?.start(); } catch (e) {}
    }
  }, [isListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
  }, []);

  return (
    <VoiceContext.Provider value={{ isListening, toggleListening, language, setLanguage, transcript, clearTranscript }}>
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};
