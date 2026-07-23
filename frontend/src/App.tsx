import { useState, useEffect } from 'react';
import { Moon, Sun, Settings as SettingsIcon, LogOut, MessageCircle, BookOpen, RotateCcw, Target, Map as MapIcon } from 'lucide-react';
import Login from './components/Login';
import Settings from './components/Settings';
import Setup from './components/Setup';
import Drill from './components/Drill';
import Reward from './components/Reward';
import ThemeDrill from './components/ThemeDrill';
import { useRecorder } from './contexts/Recorder';
import { statsService } from './utils/statsService';
import { getEvaluatedSequence } from './utils/speechMatch';
import textIslands from './data/textIslands.json';
import './App.css';
import pkg from '../package.json';

function App() {
  const [user, setUser] = useState(null);
  const [appState, setAppState] = useState('login'); // 'login', 'setup', 'settings', 'learning', 'reward'
  const [sessionConfig, setSessionConfig] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { isListening, toggleListening, stopListening, clearTranscript, transcript, evaluatedSequence, language, expectedWordCount } = useRecorder();

  useEffect(() => {
    // If the user has a gemini key, we might initialize something here
    // Currently purely browser based
  }, [user]);

  useEffect(() => {
    if (isDarkMode) {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.removeAttribute('data-theme');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setAppState('setup');
  };

  const handleLogout = () => {
    stopListening();
    clearTranscript();
    window.speechSynthesis.cancel();
    setUser(null);
    setAppState('login');
  };

  const startSession = (categoryId, direction, categories = null) => {
    stopListening();
    clearTranscript();
    window.speechSynthesis.cancel();
    const categoryList = [
      { id: 'all_words', name: 'Vokabeln', icon: BookOpen, type: 'words' },
      { id: 'verbs', name: 'Konjugationen', icon: RotateCcw, type: 'verbs' },
      { id: 'sentences', name: 'Sätze & Pronomen', icon: Target, type: 'sentences' },
      { id: 'text_islands', name: 'Themen', icon: MapIcon, type: 'text_islands' }
    ];
    setSessionConfig(prev => ({ 
      categoryId, 
      direction, 
      categories: categories || categoryList
    }));
    setAppState('learning');
  };

  const finishSession = () => {
    stopListening();
    clearTranscript();
    window.speechSynthesis.cancel();
    const statsResult = statsService.endSession();
    setSessionStats(statsResult);
    setAppState('reward');
  };

  const startNextSession = () => {
    if (!sessionConfig) {
      cancelSession();
      return;
    }

    // 1. Wenn aktuell in einer Textinsel (Thema)
    if (sessionConfig.categoryId === 'text_islands') {
      const currentIslandId = sessionConfig.direction;
      const currentIndex = textIslands.findIndex((i: any) => i.id === currentIslandId);
      if (currentIndex !== -1 && currentIndex + 1 < textIslands.length) {
        const nextIsland = textIslands[currentIndex + 1];
        startSession('text_islands', nextIsland.id);
        return;
      }
      // Keine weitere Textinsel -> zurück zur Übersicht
      cancelSession();
      return;
    }

    // 2. Normaler Vokabel- / Konjugations-Modus
    if (sessionConfig.categories && Array.isArray(sessionConfig.categories) && sessionConfig.categories.length > 0) {
      const currentIndex = sessionConfig.categories.findIndex((c: any) => c.id === sessionConfig.categoryId);
      if (currentIndex !== -1 && currentIndex + 1 < sessionConfig.categories.length) {
        const nextCategory = sessionConfig.categories[currentIndex + 1];
        if (nextCategory.id !== 'text_islands') {
          startSession(nextCategory.id, sessionConfig.direction, sessionConfig.categories);
          return;
        }
      }
    }

    // Fallback: Zurück zur Setup-Übersicht
    cancelSession();
  };

  const restartSession = () => {
    if (sessionConfig) {
      startSession(sessionConfig.categoryId, sessionConfig.direction, sessionConfig.categories);
    } else {
      cancelSession();
    }
  };

  const cancelSession = () => {
    stopListening();
    clearTranscript();
    window.speechSynthesis.cancel();
    setAppState('setup');
    setSessionConfig(null);
  };

  return (
    <div className={`app state-${appState}`}>
      <div className="config-line">
        <div className="brand-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 className="application-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <MessageCircle size={18} color="var(--topic-color)" />
            <span>Parladino</span>
          </h1>
          <span className="version-info" style={{ fontSize: '0.8rem', opacity: 0.6, color: 'var(--text-meta)' }}>
            v{pkg.version}
          </span>
        </div>

        <div className="header-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {user && (
            <button className="icon-btn" onClick={() => setAppState('settings')} title="Einstellungen">
              <SettingsIcon size={20} />
            </button>
          )}
          <button className="icon-btn" onClick={toggleTheme} title="Theme wechseln">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {user && (
            <button className="icon-btn" onClick={handleLogout} title="Logout">
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>
      
      <main className="app-main">
        {!user && appState === 'login' && (
          <Login onLogin={handleLogin} />
        )}
        {user && appState === 'settings' && (
          <Settings user={user} onUpdateUser={setUser} onCancel={() => setAppState('setup')} />
        )}
        {user && appState === 'setup' && (
          <Setup user={user} onStart={startSession} />
        )}
        {user && appState === 'learning' && sessionConfig.categoryId === 'text_islands' && (
          <ThemeDrill
            user={user}
            onUpdateUser={setUser}
            islandId={sessionConfig.direction}
            onCancel={cancelSession}
          />
        )}
        {user && appState === 'learning' && sessionConfig.categoryId !== 'text_islands' && (
          <Drill 
            user={user}
            onUpdateUser={setUser}
            categoryId={sessionConfig.categoryId} 
            direction={sessionConfig.direction} 
            onFinish={finishSession}
            onCancel={cancelSession}
          />
        )}
        {user && appState === 'reward' && (
          <Reward 
            onCancel={cancelSession} 
            onNext={startNextSession} 
            onRepeat={restartSession} 
            stats={sessionStats} 
          />
        )}
      </main>
      
      {appState === 'learning' && (
        <div className="analyse-bar" style={{
          position: 'fixed',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '680px',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '10px 18px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-meta)', fontWeight: 600 }}>
              <span style={{ fontWeight: 700, color: 'var(--topic-color)' }}>AnalyseBar</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span>
                {language?.startsWith('it') ? '🇮🇹 Italienisch (it-IT)' : '🇩🇪 Deutsch (de-DE)'}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-meta)' }}>
              <span>Erwartet: <strong style={{ color: 'var(--topic-color)' }}>{expectedWordCount > 0 ? `${expectedWordCount} ${expectedWordCount === 1 ? 'Wort' : 'Wörter'}` : '—'}</strong></span>
            </div>
          </div>

          <div style={{ 
            width: '100%', 
            fontSize: '0.88rem', 
            color: 'var(--text-meta)', 
            padding: '4px 0',
            textAlign: 'left',
            lineHeight: '1.4'
          }}>
            <span style={{ fontWeight: 600, marginRight: '6px' }}>Erkannt:</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 600, fontStyle: transcript ? 'normal' : 'italic', wordBreak: 'break-word' }}>
              {transcript ? `"${transcript}"` : '(Warte auf Sprache...)'}
            </span>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-start', 
            gap: '8px', 
            width: '100%', 
            paddingTop: '6px',
            borderTop: '1px solid var(--border-color)',
            fontSize: '0.85rem',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontWeight: 600, color: 'var(--text-meta)' }}>Geprüft (von hinten):</span>
            <span style={{ 
              color: evaluatedSequence ? 'var(--right-color)' : 'var(--text-meta)', 
              backgroundColor: evaluatedSequence ? 'rgba(46, 204, 113, 0.15)' : 'rgba(0, 0, 0, 0.04)', 
              border: `1px solid ${evaluatedSequence ? 'var(--right-color)' : 'var(--border-color)'}`,
              padding: '3px 10px', 
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              wordBreak: 'break-word',
              maxWidth: '100%'
            }}>
              {evaluatedSequence ? `"${evaluatedSequence}"` : '(keine Sequenz)'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
