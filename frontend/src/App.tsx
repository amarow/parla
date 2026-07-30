import { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Settings as SettingsIcon, LogOut, MessageCircle, BookOpen, RotateCcw, Target, Map as MapIcon, BarChart2 } from 'lucide-react';
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
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { isListening, toggleListening, stopListening, transcript, language } = useRecorder();
  const setupScrollPosRef = useRef(0);

  useEffect(() => {
    if (appState === 'setup' && setupScrollPosRef.current > 0) {
      const scrollPos = setupScrollPosRef.current;
      const timer = setTimeout(() => {
        window.scrollTo({
          top: scrollPos,
          behavior: 'instant' as any
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [appState]);

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
    setupScrollPosRef.current = window.scrollY;
    stopListening();
    window.speechSynthesis.cancel();
    setSessionStats(null); // Clear previous session stats
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

  const finishCategory = (isCorrect: boolean) => {
    if (sessionConfig && sessionConfig.categories) {
      const currentIndex = sessionConfig.categories.findIndex((c: any) => c.id === sessionConfig.categoryId);
      if (currentIndex !== -1 && currentIndex + 1 < sessionConfig.categories.length) {
        const nextCategory = sessionConfig.categories[currentIndex + 1];
        if (nextCategory.id !== 'text_islands') {
          statsService.endSession();
          setSessionConfig(prev => {
            if (!prev) return null;
            return { ...prev, categoryId: nextCategory.id };
          });
          return;
        }
      }
    }
    const statsResult = statsService.endSession();
    setSessionStats(statsResult);
    cancelSession();
  };

  const cancelSession = () => {
    stopListening();
    window.speechSynthesis.cancel();
    statsService.endSession();
    setAppState('setup');
    setSessionConfig(null);
  };

  const openStatsScreen = () => {
    stopListening();
    window.speechSynthesis.cancel();
    const lifetime = statsService.getLifetimeStats();
    if (appState === 'learning') {
      setSessionStats({
        session: undefined,
        lifetime
      });
    } else {
      setSessionStats(prev => ({
        session: prev?.session,
        lifetime
      }));
    }
    setShowStatsModal(true);
  };

  const handleResetStats = () => {
    const resetStats = statsService.resetLifetimeStats();
    setSessionStats(prev => ({
      session: prev?.session,
      lifetime: resetStats
    }));
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
            <>
              <button className="icon-btn" onClick={openStatsScreen} title="Statistik">
                <BarChart2 size={20} />
              </button>
              <button 
                className="icon-btn" 
                onClick={() => {
                  setupScrollPosRef.current = window.scrollY;
                  setAppState('settings');
                }} 
                title="Einstellungen"
              >
                <SettingsIcon size={20} />
              </button>
            </>
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
            onFinish={finishCategory}
            statsModalOpen={showStatsModal}
          />
        )}
        {user && appState === 'learning' && sessionConfig.categoryId !== 'text_islands' && (
          <Drill 
            categoryId={sessionConfig.categoryId} 
            direction={sessionConfig.direction} 
            onFinish={finishCategory}
            onCancel={cancelSession}
            categories={sessionConfig.categories}
            statsModalOpen={showStatsModal}
          />
        )}
      </main>

      {showStatsModal && user && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowStatsModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Reward
              stats={sessionStats}
              onCancel={() => setShowStatsModal(false)}
              onReset={handleResetStats}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
