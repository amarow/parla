import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dataService } from '../dataService';
import { useRecorder } from '../contexts/Recorder';
import { useSession } from '../contexts/SessionContext';

import textIslands from '../data/textIslands.json';

export default function Setup({ onStart }) {
  const { user } = useSession();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const { setLanguage } = useRecorder();

  // Stelle sicher, dass die Spracherkennung hier auf Deutsch (oder die Muttersprache) läuft, 
  // da die Kategorienamen auf Deutsch sind.
  useEffect(() => {
    setLanguage('de-DE');
  }, [setLanguage]);

  const { data: categories = [], isLoading, isError } = useQuery({
    queryKey: ['categories', user.target_language],
    queryFn: async () => {
      return await dataService.getCategories(user.target_language);
    }
  });

  useEffect(() => {
    const lastCategory = localStorage.getItem('last_category_id');
    const lastSubcategory = localStorage.getItem('last_subcategory_id');
    if (lastCategory) {
      setSelectedCategory(lastCategory);
    }
    if (lastSubcategory) {
      setSelectedSubcategory(lastSubcategory);
    }
  }, []);

  const handleCategoryClick = (id) => {
    const idStr = id.toString();
    localStorage.setItem('last_category_id', idStr);
    localStorage.removeItem('last_subcategory_id');
    setSelectedCategory(idStr);
    setSelectedSubcategory('');
    onStart(id, user.preferred_direction || 'nativeToForeign', categories);
  };

  const handleSentenceClick = (pronounKey: string) => {
    localStorage.setItem('last_category_id', 'sentences');
    localStorage.setItem('last_subcategory_id', pronounKey);
    setSelectedCategory('sentences');
    setSelectedSubcategory(pronounKey);
    onStart('sentences', pronounKey);
  };

  const handleThemeClick = (themeId: string) => {
    localStorage.setItem('last_category_id', 'text_islands');
    localStorage.setItem('last_subcategory_id', themeId);
    setSelectedCategory('text_islands');
    setSelectedSubcategory(themeId);
    onStart('text_islands', themeId);
  };

  const getLangName = (code) => {
    const map = { de: 'Deutsch', en: 'Englisch', it: 'Italienisch', es: 'Spanisch', fr: 'Französisch' };
    return map[code] || code;
  };

  if (isLoading) return <div className="setup-container card-panel">Lade Kategorien...</div>;
  if (isError) return <div className="setup-container card-panel">Fehler beim Laden der Kategorien.</div>;

  const isGrammarCat = (name) => {
    const n = name.toLowerCase();
    if (n.includes('grundform') || n.includes('konjunktionen')) return false;
    return n.includes('verb') || n.includes('grammatik');
  };

  const grammarCategories = categories.filter(cat => isGrammarCat(cat.name));
  const vocabCategories = categories.filter(cat => !isGrammarCat(cat.name));

  const pronouns = [
    { key: 'form_1s', label: 'io (ich)' },
    { key: 'form_2s', label: 'tu (du)' },
    { key: 'form_3s', label: 'lui/lei (er/sie/es)' },
    { key: 'form_1p', label: 'noi (wir)' },
    { key: 'form_2p', label: 'voi (ihr)' },
    { key: 'form_3p', label: 'loro (sie)' }
  ];

  return (
    <div className="setup-container card-panel">
      <h2>Kategorie wählen</h2>
      
      {categories.length === 0 ? (
        <p>Keine Vokabeln für {getLangName(user.target_language)} gefunden.</p>
      ) : (
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {vocabCategories.length > 0 && (
            <div>
              <h3 style={{ marginBottom: '12px', fontSize: '1.2rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Vokabeln</h3>
              <div className="category-grid">
                {vocabCategories.map(cat => (
                  <div 
                    key={cat.id} 
                    className={`category-item ${selectedCategory === cat.id.toString() ? 'active' : ''}`}
                    onClick={() => handleCategoryClick(cat.id)}
                  >
                    {cat.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {grammarCategories.length > 0 && (
            <div>
              <h3 style={{ marginBottom: '12px', fontSize: '1.2rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Konjugationen</h3>
              <div className="category-grid">
                {grammarCategories.map(cat => (
                  <div 
                    key={cat.id} 
                    className={`category-item grammar-category ${selectedCategory === cat.id.toString() ? 'active' : ''}`}
                    onClick={() => handleCategoryClick(cat.id)}
                  >
                    {cat.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 style={{ marginBottom: '12px', fontSize: '1.2rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Sätze & Pronomen</h3>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Wähle ein Pronomen, um gezielt Sätze zu üben:</p>
            <div className="category-grid">
              {pronouns.map(p => (
                <div 
                  key={p.key} 
                  className={`category-item sentence-category ${selectedCategory === 'sentences' && selectedSubcategory === p.key ? 'active' : ''}`}
                  onClick={() => handleSentenceClick(p.key)}
                  style={selectedCategory === 'sentences' && selectedSubcategory === p.key ? {
                    background: 'var(--topic-color)',
                    borderColor: 'var(--topic-color)',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)'
                  } : {
                    backgroundColor: 'rgba(52, 152, 219, 0.05)',
                    borderColor: 'var(--topic-color)'
                  }}
                >
                  {p.label}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ marginBottom: '12px', fontSize: '1.2rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Themen</h3>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Kurze Dialoge & Texte hören und nachsprechen:</p>
            <div className="category-grid">
              {textIslands.map((island) => (
                <div 
                  key={island.id}
                  className={`category-item ${(selectedCategory === 'text_islands' && selectedSubcategory === island.id) ? 'active' : ''}`}
                  onClick={() => handleThemeClick(island.id)}
                  style={selectedCategory === 'text_islands' && selectedSubcategory === island.id ? {
                    background: 'var(--topic-color)',
                    borderColor: 'var(--topic-color)',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(75, 138, 230, 0.3)'
                  } : {
                    backgroundColor: 'rgba(75, 138, 230, 0.05)',
                    borderColor: 'var(--topic-color)'
                  }}
                >
                  {island.title}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
