import React from 'react';
import { SkipBack, SkipForward, Mic, Play, Square } from 'lucide-react';

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
  mainActionTitle
}) => {
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
    <div className="transport-bar">
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
    </div>
  );
};

export default TransportBar;
