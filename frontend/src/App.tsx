import { useState, useEffect } from 'react';
import { Moon, Sun, Settings as SettingsIcon, LogOut, MessageCircle } from 'lucide-react';
import Login from './components/Login';
import Settings from './components/Settings';
import Setup from './components/Setup';
import LearningSession from './components/LearningSession';
import Reward from './components/Reward';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [appState, setAppState] = useState('login'); // 'login', 'setup', 'settings', 'learning', 'reward'
  const [sessionConfig, setSessionConfig] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.removeAttribute('data-theme');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleLogin = (userData) => {
    setUser(userData);
    setAppState('setup');
  };

  const handleLogout = () => {
    setUser(null);
    setAppState('login');
  };

  const startSession = (categoryId, direction) => {
    setSessionConfig({ categoryId, direction });
    setAppState('learning');
  };

  const finishSession = () => setAppState('reward');
  const cancelSession = () => {
    setAppState('setup');
    setSessionConfig(null);
  };

  return (
    <div className="app">
      <div className="header-actions">
        {user && (
          <>
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
          <MessageCircle size={36} /> Parla
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
            categoryId={sessionConfig.categoryId} 
            direction={sessionConfig.direction} 
            onFinish={finishSession}
            onCancel={cancelSession}
          />
        )}
        {user && appState === 'reward' && (
          <Reward onRestart={cancelSession} />
        )}
      </main>
    </div>
  );
}

export default App;
