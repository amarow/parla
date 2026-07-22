import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

type VoiceContextType = {
  isListening: boolean;
  isProcessing: boolean; // Not really used for browser API but kept for compatibility
  toggleListening: () => void;
  startListening: () => void;
  stopListening: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  transcript: string;
  clearTranscript: () => void;
};

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState('it-IT');
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const rawTranscriptRef = useRef('');
  const ignoredPrefixRef = useRef('');

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
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        combinedTranscript += event.results[i][0].transcript;
      }
      
      rawTranscriptRef.current = combinedTranscript;
      
      if (ttsPlayingRef.current) {
        ignoredPrefixRef.current = combinedTranscript;
        return;
      }
      
      let displayTranscript = combinedTranscript;
      if (ignoredPrefixRef.current && displayTranscript.startsWith(ignoredPrefixRef.current)) {
        displayTranscript = displayTranscript.slice(ignoredPrefixRef.current.length);
      }
      
      const text = displayTranscript.trim().toLowerCase();
      // Always set transcript so it can become empty if needed
      setTranscript(text);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech Recognition Error:", event.error);
      if (event.error === 'no-speech') return; // Ignore and let it continue
      if (['not-allowed', 'service-not-allowed'].includes(event.error)) {
        shouldListenRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      console.log("🎤 Browser-Erkennung beendet");
      // Auto-restart if it should still be listening
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Restart loop
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

  // Sync language changes to the recognition instance
  useEffect(() => {
    if (recognitionRef.current) {
      const wasListening = isListening;
      if (wasListening) {
        // Stop briefly to change language
        try { recognitionRef.current.stop(); } catch(e) {}
      }
      recognitionRef.current.lang = language;
    }
  }, [language]);

  // Handle TTS pause/resume
  const ttsPlayingRef = useRef(false);
  useEffect(() => {
    const handleTtsStart = () => {
      ttsPlayingRef.current = true;
    };
    const handleTtsEnd = () => {
      setTimeout(() => {
        ttsPlayingRef.current = false;
        if (rawTranscriptRef.current) {
          ignoredPrefixRef.current = rawTranscriptRef.current;
          setTranscript('');
        }
      }, 500);
    };
    window.addEventListener('tts-start', handleTtsStart);
    window.addEventListener('tts-end', handleTtsEnd);
    return () => {
      window.removeEventListener('tts-start', handleTtsStart);
      window.removeEventListener('tts-end', handleTtsEnd);
    };
  }, []);

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

  const clearTranscript = useCallback(() => {
    ignoredPrefixRef.current = rawTranscriptRef.current;
    setTranscript('');
  }, []);

  return (
    <VoiceContext.Provider value={{ 
      isListening, 
      isProcessing: false,
      toggleListening,
      startListening,
      stopListening,
      language, 
      setLanguage, 
      transcript, 
      clearTranscript
    }}>
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (context === undefined) throw new Error('useVoice must be used within a VoiceProvider');
  return context;
};
