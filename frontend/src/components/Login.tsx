import { useState } from 'react';
import axios from 'axios';
import { BASE_URL } from '../api';

export default function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const endpoint = isRegistering ? '/api/register' : '/api/login';
    
    try {
      const res = await axios.post(`${BASE_URL}${endpoint}`, { username, password });
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Ein Fehler ist aufgetreten.');
    }
  };

  return (
    <div className="card-panel">
      <h2>{isRegistering ? 'Registrieren' : 'Einloggen'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Benutzername</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
            className="input-field"
          />
        </div>
        <div className="form-group">
          <label>Passwort</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            className="input-field"
          />
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
          {isRegistering ? 'Account erstellen' : 'Anmelden'}
        </button>
      </form>
      
      <p className="toggle-text">
        {isRegistering ? 'Bereits einen Account?' : 'Noch kein Account?'}
        <button className="btn-link" onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? 'Hier einloggen' : 'Hier registrieren'}
        </button>
      </p>
    </div>
  );
}