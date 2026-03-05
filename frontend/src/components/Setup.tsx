import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../api';

export default function Setup({ user, onStart }) {
  const [selectedCategory, setSelectedCategory] = useState<number | string>('');

  const { data: categories = [], isLoading, isError } = useQuery({
    queryKey: ['categories', user.target_language],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/categories?target_language=${user.target_language}`);
      return res.data;
    }
  });

  useEffect(() => {
    if (categories.length > 0) {
      const lastCategory = localStorage.getItem('last_category_id');
      if (lastCategory && categories.some(cat => cat.id.toString() === lastCategory)) {
        setSelectedCategory(parseInt(lastCategory));
      }
    }
  }, [categories]);

  const handleCategoryClick = (id) => {
    localStorage.setItem('last_category_id', id.toString());
    onStart(id, user.preferred_direction || 'nativeToForeign');
  };

  const getLangName = (code) => {
    const map = { de: 'Deutsch', en: 'Englisch', it: 'Italienisch', es: 'Spanisch', fr: 'Französisch' };
    return map[code] || code;
  };

  if (isLoading) return <div className="setup-container card-panel">Lade Kategorien...</div>;
  if (isError) return <div className="setup-container card-panel">Fehler beim Laden der Kategorien.</div>;

  const grammarCategories = categories.filter(cat => cat.name.toLowerCase().includes('verb') || cat.name.toLowerCase().includes('grammatik') || cat.name.toLowerCase().includes('konjunktionen'));
  const vocabCategories = categories.filter(cat => !(cat.name.toLowerCase().includes('verb') || cat.name.toLowerCase().includes('grammatik') || cat.name.toLowerCase().includes('konjunktionen')));

  return (
    <div className="setup-container card-panel">
      <h2>Kategorie wählen</h2>
      
      {categories.length === 0 ? (
        <p>Keine Vokabeln für {getLangName(user.target_language)} gefunden.</p>
      ) : (
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {grammarCategories.length > 0 && (
            <div>
              <h3 style={{ marginBottom: '12px', fontSize: '1.2rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Grammatik & Verben</h3>
              <div className="category-grid">
                {grammarCategories.map(cat => (
                  <div 
                    key={cat.id} 
                    className={`category-item grammar-category ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => handleCategoryClick(cat.id)}
                  >
                    {cat.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {vocabCategories.length > 0 && (
            <div>
              <h3 style={{ marginBottom: '12px', fontSize: '1.2rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Wortschatz</h3>
              <div className="category-grid">
                {vocabCategories.map(cat => (
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
      )}
    </div>
  );
}
