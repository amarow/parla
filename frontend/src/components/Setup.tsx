import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../api';

export default function Setup({ user, onStart }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState<number | string>('');

  useEffect(() => {
    // Hole nur Kategorien für die gewählte Zielsprache des Users
    axios.get(`${API_BASE}/categories?target_language=${user.target_language}`)
      .then(res => {
        setCategories(res.data);
        
        // Letzte gewählte Kategorie aus localStorage laden (nur für Highlighting, falls nötig)
        const lastCategory = localStorage.getItem('last_category_id');
        if (lastCategory && res.data.some(cat => cat.id.toString() === lastCategory)) {
          setSelectedCategory(parseInt(lastCategory));
        }
      })
      .catch(err => console.error(err));
  }, [user.target_language]);

  const handleCategoryClick = (id) => {
    localStorage.setItem('last_category_id', id.toString());
    onStart(id, user.preferred_direction || 'nativeToForeign');
  };

  const getLangName = (code) => {
    const map = { de: 'Deutsch', en: 'Englisch', it: 'Italienisch', es: 'Spanisch', fr: 'Französisch' };
    return map[code] || code;
  };

  return (
    <div className="setup-container card-panel">
      <h2>Kategorie wählen</h2>
      
      {categories.length === 0 ? (
        <p>Keine Vokabeln für {getLangName(user.target_language)} gefunden.</p>
      ) : (
        <div className="form-group">
          <div className="category-grid">
            {categories.map(cat => (
              <div 
                key={cat.id} 
                className={`category-item ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.id)}
              >
                {cat.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
