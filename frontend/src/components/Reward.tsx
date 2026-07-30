import { X } from 'lucide-react';
import { getDrillTypeName } from '../utils/statsService';

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return `${hours} Std. ${minutes} Min.`;
  }
  return `${minutes} Min.`;
}

export default function Reward({ onCancel, stats, onReset }: any) {
  const session = stats?.session;
  const lifetime = stats?.lifetime;

  const hintsUsed = session ? session.hintsUsed : 0;
  const completedItems = session ? session.completedItems : 0;
  const correctFirstTry = session ? session.correctFirstTry : 0;

  const accuracy = completedItems > 0 ? Math.round((correctFirstTry / completedItems) * 100) : 100;

  return (
    <div 
      className="reward-container card-panel text-center" 
      style={{ 
        position: 'relative',
        padding: '40px 36px', 
        backgroundColor: 'var(--card-bg)',
        borderRadius: '24px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
        width: '520px',
        maxWidth: '95%',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center'
      }}
    >
      {/* Close button X */}
      <button 
        type="button"
        className="icon-btn" 
        onClick={onCancel} 
        title="Schließen"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: '1px solid var(--border-color)',
          borderRadius: '50%',
          backgroundColor: 'transparent'
        }}
      >
        <X size={16} />
      </button>

      <h2 style={{ margin: '0 0 28px 0', fontSize: '1.45rem', fontWeight: 700, color: 'var(--topic-color)', letterSpacing: '-0.02em' }}>
        Statistik
      </h2>
      
      <div className="stats-card" style={{ width: '100%', textAlign: 'left' }}>
        {/* Session Stats */}
        {session && session.completedItems > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--topic-color)', opacity: 0.9, fontWeight: 600 }}>
              Letzte Sitzung
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.98rem' }}>
              <span style={{ opacity: 0.85 }}>Erfolgsquote:</span>
              <strong style={{ fontSize: '1.05rem' }}>{accuracy}%</strong>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.98rem' }}>
              <span style={{ opacity: 0.85 }}>Auf Anhieb richtig:</span>
              <strong style={{ fontSize: '1.05rem' }}>{correctFirstTry} / {completedItems}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.98rem' }}>
              <span style={{ opacity: 0.85 }}>Nachgeschaut (Hilfen):</span>
              <strong style={{ fontSize: '1.05rem', color: hintsUsed === 0 ? 'var(--right-color)' : 'inherit' }}>{hintsUsed}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.98rem' }}>
              <span style={{ opacity: 0.85 }}>Dauer:</span>
              <strong style={{ fontSize: '1.05rem' }}>{formatDuration((session.endTime || Date.now()) - session.startTime)}</strong>
            </div>
          </div>
        )}

        {/* Lifetime Stats */}
        {lifetime && (
          <>
            {session && session.completedItems > 0 && (
              <hr style={{ margin: '24px 0', borderColor: 'var(--border-color)', opacity: 0.25 }} />
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.98rem' }}>
              <span style={{ opacity: 0.85 }}>Übungs-Einheiten:</span>
              <strong style={{ fontSize: '1.05rem' }}>{lifetime.totalSessions}</strong>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.98rem' }}>
              <span style={{ opacity: 0.85 }}>Geübte Aufgaben:</span>
              <strong style={{ fontSize: '1.05rem' }}>{lifetime.totalItemsPracticed}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.98rem' }}>
              <span style={{ opacity: 0.85 }}>Auf Anhieb richtig:</span>
              <strong style={{ fontSize: '1.05rem' }}>{lifetime.totalCorrectFirstTry}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.98rem' }}>
              <span style={{ opacity: 0.85 }}>Hilfen genutzt:</span>
              <strong style={{ fontSize: '1.05rem' }}>{lifetime.totalHintsUsed}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.98rem' }}>
              <span style={{ opacity: 0.85 }}>Gesamte Übungszeit:</span>
              <strong style={{ fontSize: '1.05rem' }}>{formatDuration(lifetime.totalDurationMs || 0)}</strong>
            </div>
          </>
        )}

        {/* Table breakdown per category */}
        {lifetime && lifetime.categories && (
          <div style={{ marginTop: '28px', width: '100%' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--topic-color)', opacity: 0.9, fontWeight: 600 }}>
              Aufteilung nach Übungsart
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', opacity: 0.6 }}>
                  <th style={{ padding: '8px 4px', fontWeight: 600 }}>Übungsart</th>
                  <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'center' }}>Aufg.</th>
                  <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'center' }}>Erfolg</th>
                  <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>Zeit</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(lifetime.categories).map(([key, cat]: [string, any]) => {
                  const typeName = getDrillTypeName(key as any);
                  const accuracyVal = cat.totalItemsPracticed > 0 
                    ? `${Math.round((cat.totalCorrectFirstTry / cat.totalItemsPracticed) * 100)}%`
                    : '-';
                  
                  const totalMinutes = Math.floor((cat.totalDurationMs || 0) / 60000);
                  const hrs = Math.floor(totalMinutes / 60);
                  const mins = totalMinutes % 60;
                  const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

                  return (
                    <tr key={key} style={{ borderBottom: '1px solid var(--border-color)', opacity: 0.85 }}>
                      <td style={{ padding: '10px 4px', fontWeight: 500 }}>{typeName}</td>
                      <td style={{ padding: '10px 4px', textAlign: 'center' }}>{cat.totalItemsPracticed}</td>
                      <td style={{ padding: '10px 4px', textAlign: 'center' }}>{accuracyVal}</td>
                      <td style={{ padding: '10px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>{timeStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reset Button */}
      {lifetime && (
        <button 
          type="button"
          onClick={onReset}
          style={{
            marginTop: '36px',
            padding: '10px 20px',
            fontSize: '0.82rem',
            color: '#e74c3c',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            fontWeight: 500,
            letterSpacing: '0.01em'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.08)';
            e.currentTarget.style.borderColor = '#e74c3c';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        >
          Zurücksetzen
        </button>
      )}
    </div>
  );
}
