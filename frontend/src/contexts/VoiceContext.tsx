import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

type VoiceContextType = {
  isListening: boolean;
  isProcessing: boolean; // Not really used for browser API but kept for compatibility
  toggleListening: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  transcript: string;
  clearTranscript: () => void;
  setGeminiApiKey: (key: string) => void;
};

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState('it-IT');
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);

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
      const text = combinedTranscript.trim().toLowerCase();
      if (text) {
        setTranscript(text);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech Recognition Error:", event.error);
      if (event.error === 'no-speech') return; // Ignore and let it continue
      if (event.error === 'not-allowed') {
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
      try { recognition.stop(); } catch (e) {}
    };
  }, []);

  // Sync language changes to the recognition instance
  useEffect(() => {
    if (recognitionRef.current) {
      const wasListening = isListening;
      if (wasListening) {
        // Stop briefly to change language
        recognitionRef.current.stop();
      }
      recognitionRef.current.lang = language;
      if (wasListening) {
        // Restart will be handled by onend -> shouldListenRef
      }
    }
  }, [language]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
    } else {
      shouldListenRef.current = true;
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Failed to start recognition:", e);
      }
    }
  }, [isListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // Dummy to keep compatibility with components that might still call it
  const setGeminiApiKey = () => {};

  return (
    <VoiceContext.Provider value={{ 
      isListening, 
      isProcessing: false,
      toggleListening, 
      language, 
      setLanguage, 
      transcript, 
      clearTranscript,
      setGeminiApiKey
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
