import React, { useState, useEffect } from 'react';
import { SkipBack, SkipForward, Mic, Play, Square, BarChart2 } from 'lucide-react';
import { levelToStep, stepToLevel, SPEED_PROFILES } from '../utils/speedConfig';
import { localAuth } from '../api';
import { useSession } from '../contexts/SessionContext';

function getAppStartTime(): number {
  const stored = sessionStorage.getItem('parladino_app_start_time');
  if (stored) return parseInt(stored, 10);
  const now = Date.now();
  sessionStorage.setItem('parladino_app_start_time', now.toString());
  return now;
}

function formatElapsedTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface TransportBarProps {
  onBack?: () => void;
  backDisabled?: boolean;
  backTitle?: string;
  
  onForward?: () => void;
  forwardDisabled?: boolean;
  forwardTitle?: string;
  extraForwardContent?: React.ReactNode;

  // Main Action (Play/Mic/Pause)
  onMainAction?: () => void;
  mainActionType?: 'mic' | 'playPause'; // 'mic' or 'playPause' type
  mainActionActive?: boolean; // isListening or isPlaying
  mainActionDisabled?: boolean;
  mainActionTitle?: string; // override title

  onShowStats?: () => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  onBack,
  backDisabled = false,
  backTitle = "Zurück",
  onForward,
  forwardDisabled = false,
  forwardTitle = "Vorwärts",
  extraForwardContent,
  onMainAction,
  mainActionType = 'mic',
  mainActionActive = false,
  mainActionDisabled = false,
  mainActionTitle,
  onShowStats
}) => {
  const { user, setUser, speedProfile } = useSession();
  const currentStep = levelToStep(speedProfile.level);

  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    return Math.max(0, Math.floor((Date.now() - getAppStartTime()) / 1000));
  });

  useEffect(() => {
    const startTime = getAppStartTime();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSliderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const step = parseInt(e.target.value, 10);
    const newLevel = stepToLevel(step);
    const profile = SPEED_PROFILES[newLevel];
    if (user) {
      try {
        const updated = await localAuth.updateSettings(user.id, {
          global_speed: newLevel,
          pause_time: profile.pauseTime,
          speech_rate: profile.speechRate
        });
        setUser(updated);
      } catch (err) {
        setUser({
          ...user,
          global_speed: newLevel,
          pause_time: profile.pauseTime,
          speech_rate: profile.speechRate
        });
      }
    }
  };

  const renderMainIcon = () => {
    if (mainActionType === 'mic') {
      return mainActionActive ? <Mic size={28} /> : <Play size={28} style={{ marginLeft: '3px' }} />;
    } else {
      // playPause type
      return mainActionActive ? <Square size={22} /> : <Play size={28} style={{ marginLeft: '3px' }} />;
    }
  };

  const getMainTitle = () => {
    if (mainActionTitle) return mainActionTitle;
    if (mainActionType === 'mic') {
      return mainActionActive ? 'Mikrofon ausschalten' : 'Mikrofon einschalten';
    } else {
      return mainActionActive ? 'Pause' : 'Start';
    }
  };

  const mainBtnClass = `main-action-btn ${mainActionActive ? 'listening-global' : ''}`;

  return (
    <div className="transport-bar" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', width: '100%' }}>
      {user && (
        <div 
          className="speed-slider-control" 
          style={{ 
            position: 'absolute',
            left: '24px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-start', 
            justifyContent: 'center',
            gap: '2px'
          }}
        >
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-meta)', whiteSpace: 'nowrap' }}>
            {speedProfile.label}
          </span>
          <input 
            type="range" 
            min="1" 
            max="5" 
            step="1" 
            value={currentStep} 
            onChange={handleSliderChange}
            style={{ width: '90px', cursor: 'pointer', accentColor: 'var(--topic-color)' }}
            title={`Geschwindigkeit: ${speedProfile.label}`}
          />
        </div>
      )}

      <button 
        className="icon-btn" 
        onClick={onBack} 
        disabled={backDisabled}
        style={{ 
          width: '52px', 
          height: '52px', 
          opacity: backDisabled ? 0.5 : 1,
          cursor: backDisabled ? 'not-allowed' : 'pointer'
        }} 
        title={backTitle}
      >
        <SkipBack size={24} />
      </button>
      
      {onMainAction && (
        <button 
          className={mainBtnClass}
          onClick={onMainAction}
          disabled={mainActionDisabled}
          style={{
            width: '60px', height: '60px', borderRadius: '50%',
            backgroundColor: mainActionActive ? 'var(--card-bg)' : 'var(--topic-color)',
            color: mainActionActive ? 'var(--topic-color)' : 'white',
            border: mainActionActive ? '2px solid var(--topic-color)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: mainActionDisabled ? 'not-allowed' : 'pointer',
            boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
            transition: 'all 0.3s',
            opacity: mainActionDisabled ? 0.5 : 1
          }}
          title={getMainTitle()}
        >
          {renderMainIcon()}
        </button>
      )}

      {extraForwardContent ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <button 
            className="icon-btn" 
            onClick={onForward} 
            disabled={forwardDisabled}
            style={{ 
              width: '52px', 
              height: '52px', 
              opacity: forwardDisabled ? 0.5 : 1,
              cursor: forwardDisabled ? 'not-allowed' : 'pointer'
            }} 
            title={forwardTitle}
          >
            <SkipForward size={24} />
          </button>
          {extraForwardContent}
        </div>
      ) : (
        <button 
          className="icon-btn" 
          onClick={onForward} 
          disabled={forwardDisabled}
          style={{ 
            width: '52px', 
            height: '52px', 
            opacity: forwardDisabled ? 0.5 : 1,
            cursor: forwardDisabled ? 'not-allowed' : 'pointer'
          }} 
          title={forwardTitle}
        >
          <SkipForward size={24} />
        </button>
      )}

      <div 
        style={{ 
          position: 'absolute',
          right: '24px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'flex-end',
          gap: '12px'
        }}
      >


        <div 
          className="elapsed-time-display" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-end', 
            justifyContent: 'center',
            gap: '2px'
          }}
        >
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-meta)', whiteSpace: 'nowrap' }}>
            Zeit
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--topic-color)', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
            {formatElapsedTime(elapsedSeconds)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TransportBar;
