export default function Reward({ onRestart }) {
  return (
    <div className="reward-container card-panel text-center">
      <div className="confetti-emoji">🎉🎉🎉</div>
      <h2>Fantastisch!</h2>
      <p>Du hast den Hardcore-Modus besiegt! Alle Vokabeln in diesem Durchlauf waren fehlerfrei.</p>
      <button onClick={onRestart} className="btn-primary" style={{marginTop: '20px'}}>
        Nächste Runde starten
      </button>
    </div>
  );
}
