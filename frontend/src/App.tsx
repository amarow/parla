import { useState, useEffect } from 'react';
import { Moon, Sun, Settings as SettingsIcon, LogOut, MessageCircle, BookOpen, RotateCcw, Target, Map as MapIcon } from 'lucide-react';
import Login from './components/Login';
import Settings from './components/Settings';
import Setup from './components/Setup';
import Drill from './components/Drill';
import Reward from './components/Reward';
import ThemeDrill from './components/ThemeDrill';
import { useRecorder } from './contexts/Recorder';
import { useSession } from './contexts/SessionContext';
import { statsService } from './utils/statsService';
import textIslands from './data/textIslands.json';
import './App.css';
import pkg from '../package.json';

function App() {
  const { user, setUser } = useSession();
  const [appState, setAppState] = useState('login'); // 'login', 'setup', 'settings', 'learning', 'reward'
  const [sessionConfig, setSessionConfig] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { isListening, toggleListening, stopListening, transcript, language } = useRecorder();

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
    window.speechSynthesis.cancel();
    setUser(null);
    setAppState('login');
  };

  const startSession = (categoryId, direction, categories = null) => {
    stopListening();
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
          <Settings onCancel={() => setAppState('setup')} />
        )}
        {user && appState === 'setup' && (
          <Setup onStart={startSession} />
        )}
        {user && appState === 'learning' && sessionConfig.categoryId === 'text_islands' && (
          <ThemeDrill
            islandId={sessionConfig.direction}
            onCancel={cancelSession}
          />
        )}
        {user && appState === 'learning' && sessionConfig.categoryId !== 'text_islands' && (
          <Drill 
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
    </div>
  );
}

export default App;
