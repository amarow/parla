import axios from 'axios';

export interface Category {
  id: string;
  name: string;
  target_language: string;
}

export interface Word {
  id: string;
  category_id: string;
  native_word: string;
  foreign_word: string;
}

export interface Verb {
  id: string;
  category_id: string;
  native_infinitive: string;
  foreign_infinitive: string;
  conjugations: Conjugation[];
}

export interface Conjugation {
  tense: string;
  form_1s: string;
  form_2s: string;
  form_3s: string;
  form_1p: string;
  form_2p: string;
  form_3p: string;
}

class DataService {
  private categories: Category[] = [];
  private words: Word[] = [];
  private verbs: Verb[] = [];
  private sentenceLogic: any = null;
  private isLoaded = false;

  async loadData(targetLang: string = 'it') {
    const lang = targetLang || 'it';
    console.log(`🔍 Lade Vokabeln für: ${lang}...`);
    try {
      const [basicRes, verbsRes, logicRes] = await Promise.all([
        axios.get(`/data/${lang}_basic.json`),
        axios.get(`/data/${lang}_verbs.json`),
        axios.get(`/data/it_sentence_logic.json`).catch(() => ({ data: [] }))
      ]);

      console.log(`✅ JSON-Dateien für ${lang} erfolgreich geladen`);

      this.categories = [];
      this.words = [];
      this.verbs = [];

      // Process basic words
      basicRes.data.forEach((catGroup: any, catIdx: number) => {
        const catId = `basic_${catIdx}`;
        this.categories.push({
          id: catId,
          name: catGroup.category,
          target_language: catGroup.target_language
        });

        catGroup.words.forEach((w: any, wIdx: number) => {
          this.words.push({
            id: `${catId}_${wIdx}`,
            category_id: catId,
            native_word: w.native,
            foreign_word: w.foreign
          });
        });
      });

      // Process verbs
      verbsRes.data.forEach((catGroup: any, catIdx: number) => {
        const catId = `verb_${catIdx}`;
        this.categories.push({
          id: catId,
          name: catGroup.category,
          target_language: catGroup.target_language
        });

        catGroup.verbs.forEach((v: any, vIdx: number) => {
          this.verbs.push({
            id: `${catId}_${vIdx}`,
            category_id: catId,
            native_infinitive: v.native,
            foreign_infinitive: v.foreign,
            conjugations: v.conjugations || []
          });
        });
      });

      this.sentenceLogic = logicRes.data;
      this.isLoaded = true;
    } catch (error) {
      console.error("Failed to load local data", error);
    }
  }

  async getCategories(targetLang: string) {
    const lang = targetLang || 'it';
    if (!this.isLoaded) await this.loadData(lang);
    const filtered = this.categories.filter(c => c.target_language === lang);
    console.log(`Found ${filtered.length} categories for ${lang}`);
    return filtered;
  }

  async getWords(categoryId: string) {
    const filtered = this.words.filter(w => w.category_id === categoryId);
    // Shuffle and limit to 20 like the backend did
    return filtered.sort(() => 0.5 - Math.random()).slice(0, 20);
  }

  async getVerbs(categoryId: string) {
    return this.verbs.filter(v => v.category_id === categoryId);
  }

  async getSentenceLogic() {
    if (!this.isLoaded) await this.loadData();
    return {
      logic: this.sentenceLogic,
      verbs: this.verbs // For logic, we provide all verbs
    };
  }
}

export const dataService = new DataService();
