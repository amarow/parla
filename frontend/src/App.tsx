import { useState, useEffect } from 'react';
import { Moon, Sun, Settings as SettingsIcon, LogOut, MessageCircle, Mic, MicOff } from 'lucide-react';
import Login from './components/Login';
import Settings from './components/Settings';
import Setup from './components/Setup';
import LearningSession from './components/LearningSession';
import Reward from './components/Reward';
import { useVoice } from './contexts/VoiceContext';
import './App.css';
import pkg from '../package.json';

function App() {
  const [user, setUser] = useState(null);
  const [appState, setAppState] = useState('login'); // 'login', 'setup', 'settings', 'learning', 'reward'
  const [sessionConfig, setSessionConfig] = useState(null);
  const [sessionStats, setSessionStats] = useState({ flips: 0 });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { isListening, toggleListening } = useVoice();

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
    setUser(null);
    setAppState('login');
  };

  const startSession = (categoryId, direction, categories = null) => {
    setSessionConfig(prev => ({ 
      categoryId, 
      direction, 
      categories: categories || (prev ? prev.categories : []) 
    }));
    setAppState('learning');
  };

  const finishSession = (flips = 0) => {
    setSessionStats({ flips });
    setAppState('reward');
  };

  const startNextSession = () => {
    if (sessionConfig && sessionConfig.categories && sessionConfig.categories.length > 0) {
      const currentIndex = sessionConfig.categories.findIndex(c => c.id === sessionConfig.categoryId);
      if (currentIndex !== -1 && currentIndex + 1 < sessionConfig.categories.length) {
        const nextCategoryId = sessionConfig.categories[currentIndex + 1].id;
        startSession(nextCategoryId, sessionConfig.direction, sessionConfig.categories);
        return;
      }
    }
    // Fallback falls es keine nächste gibt
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
    setAppState('setup');
    setSessionConfig(null);
  };

  return (
    <div className="app">
      <div className="header-actions">
        {user && (
          <>
            <button 
              className={`icon-btn ${isListening ? 'listening-global' : ''}`} 
              onClick={toggleListening} 
              title="Sprachsteuerung"
              style={{ color: isListening ? '#3498db' : 'inherit' }}
            >
              {isListening ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button className="icon-btn" onClick={() => setAppState('settings')} title="Einstellungen">
              <SettingsIcon size={20} />
            </button>
            <button className="icon-btn" onClick={handleLogout} title="Logout">
              <LogOut size={20} />
            </button>
          </>
        )}
        <button className="icon-btn" onClick={toggleTheme} title="Theme wechseln">
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
      
      <header className="app-header">
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <MessageCircle size={36} /> Parladino
        </h1>
      </header>
      
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
        {user && appState === 'learning' && (
          <LearningSession 
            user={user}
            categoryId={sessionConfig.categoryId} 
            direction={sessionConfig.direction} 
            onFinish={finishSession}
            onCancel={cancelSession}
          />
        )}
        {user && appState === 'reward' && (
          <Reward onCancel={cancelSession} onNext={startNextSession} onRepeat={restartSession} flips={sessionStats.flips} />
        )}
      </main>
      
      <footer className="app-footer">
        <p>v{pkg.version}</p>
      </footer>
    </div>
  );
}

export default App;
