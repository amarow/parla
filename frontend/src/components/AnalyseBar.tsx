import React from 'react';

interface AnalyseBarProps {
  language: string;
  transcript: string;
  expectedWordCount: number;
  evaluatedSequence: string;
}

export const AnalyseBar: React.FC<AnalyseBarProps> = ({
  language,
  transcript,
  expectedWordCount,
  evaluatedSequence,
}) => {
  return (
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
  );
};
