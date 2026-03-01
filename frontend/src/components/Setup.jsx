import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Setup({ user, onStart }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [direction, setDirection] = useState('nativeToForeign');

  useEffect(() => {
    // Hole nur Kategorien für die gewählte Zielsprache des Users
    axios.get(`http://localhost:3001/api/categories?target_language=${user.target_language}`)
      .then(res => {
        setCategories(res.data);
        if (res.data.length > 0) {
          setSelectedCategory(res.data[0].id);
        }
      })
      .catch(err => console.error(err));
  }, [user.target_language]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onStart(selectedCategory, direction);
  };

  const getLangName = (code) => {
    const map = { de: 'Deutsch', en: 'Englisch', it: 'Italienisch', es: 'Spanisch', fr: 'Französisch' };
    return map[code] || code;
  };

  return (
    <div className="setup-container card-panel">
      <h2>Lern-Session starten</h2>
      
      {categories.length === 0 ? (
        <p>Keine Vokabeln für {getLangName(user.target_language)} gefunden.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Kategorie ({getLangName(user.target_language)}):</label>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Lernrichtung:</label>
            <select 
              value={direction} 
              onChange={(e) => setDirection(e.target.value)}
            >
              <option value="nativeToForeign">
                {getLangName(user.native_language)} ➔ {getLangName(user.target_language)}
              </option>
              <option value="foreignToNative">
                {getLangName(user.target_language)} ➔ {getLangName(user.native_language)}
              </option>
            </select>
          </div>
          <button type="submit" className="btn-primary">Starten (Hardcore Modus)</button>
        </form>
      )}
    </div>
  );
}
