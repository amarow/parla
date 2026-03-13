const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const bcrypt = require('bcryptjs');
const googleTTS = require('google-tts-api');
const multer = require('multer');
require('dotenv').config({ override: true });
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// In Produktion servieren wir das Frontend aus dem 'public' Ordner
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// --- Authentication & User Settings ---

app.post('/api/register', async (req, res) => {
  const { username, password, native_language = 'de', target_language = 'it', preferred_direction = 'nativeToForeign' } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username und Passwort erforderlich' });

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      `INSERT INTO users (username, password_hash, native_language, target_language, preferred_direction) VALUES (?, ?, ?, ?, ?)`,
      [username, hash, native_language, target_language, preferred_direction],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username existiert bereits' });
          return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, username, native_language, target_language, preferred_direction });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Serverfehler bei der Registrierung' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username und Passwort erforderlich' });

  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Ungültige Zugangsdaten' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Ungültige Zugangsdaten' });

    // Keine Passwörter zurückschicken!
    res.json({ 
      id: user.id, 
      username: user.username, 
      native_language: user.native_language, 
      target_language: user.target_language,
      preferred_direction: user.preferred_direction
    });
  });
});

app.put('/api/user/:id/settings', (req, res) => {
  const { native_language, target_language, preferred_direction } = req.body;
  const userId = req.params.id;

  db.run(
    `UPDATE users SET native_language = ?, target_language = ?, preferred_direction = ? WHERE id = ?`,
    [native_language, target_language, preferred_direction, userId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, native_language, target_language, preferred_direction });
    }
  );
});

// --- Core App Features ---

// Get categories, optionally filtered by target_language
app.get('/api/categories', (req, res) => {
  const targetLanguage = req.query.target_language;
  let query = 'SELECT * FROM categories';
  let params = [];

  if (targetLanguage) {
    query += ' WHERE target_language = ?';
    params.push(targetLanguage);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get random words for a specific category (max 20)
app.get('/api/words', (req, res) => {
  const categoryId = req.query.category_id;
  let query = 'SELECT * FROM words';
  const params = [];

  if (categoryId) {
    query += ' WHERE category_id = ?';
    params.push(categoryId);
  }

  // Order randomly and limit to 20 for the hardcore mode
  query += ' ORDER BY RANDOM() LIMIT 20';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- Import/Export Features ---

app.post('/api/import', (req, res) => {
  const { lang } = req.body;
  
  if (!lang) return res.status(400).json({ error: 'Language code required' });

  const wordsFilePath = path.join(__dirname, 'data', `${lang}_basic.json`);
  const verbsFilePath = path.join(__dirname, 'data', `${lang}_verbs.json`);
  
  if (!fs.existsSync(wordsFilePath) && !fs.existsSync(verbsFilePath)) {
    return res.status(404).json({ error: `Keine Datenpakete für ${lang} gefunden.` });
  }

  try {
    db.serialize(() => {
      // Vor dem Importieren die alten Daten für diese Sprache löschen, um Duplikate zu vermeiden
      db.run(`DELETE FROM conjugations WHERE verb_id IN (SELECT id FROM verbs WHERE category_id IN (SELECT id FROM categories WHERE target_language = ?))`, [lang]);
      db.run(`DELETE FROM verbs WHERE category_id IN (SELECT id FROM categories WHERE target_language = ?)`, [lang]);
      db.run(`DELETE FROM words WHERE category_id IN (SELECT id FROM categories WHERE target_language = ?)`, [lang]);
      db.run(`DELETE FROM categories WHERE target_language = ?`, [lang]);

      // Import Words
      if (fs.existsSync(wordsFilePath)) {
        const wordsData = JSON.parse(fs.readFileSync(wordsFilePath, 'utf8'));
        wordsData.forEach(categoryGroup => {
          db.run(
            `INSERT INTO categories (name, target_language) VALUES (?, ?)`,
            [categoryGroup.category, categoryGroup.target_language],
            function(err) {
              if (err) return console.error(err.message);
              const categoryId = this.lastID;
              
              const stmt = db.prepare(`INSERT INTO words (category_id, native_word, foreign_word) VALUES (?, ?, ?)`);
              categoryGroup.words.forEach(word => {
                stmt.run(categoryId, word.native, word.foreign);
              });
              stmt.finalize();
            }
          );
        });
      }

      // Import Verbs
      if (fs.existsSync(verbsFilePath)) {
        const verbsData = JSON.parse(fs.readFileSync(verbsFilePath, 'utf8'));
        verbsData.forEach(categoryGroup => {
          db.run(
            `INSERT INTO categories (name, target_language) VALUES (?, ?)`,
            [categoryGroup.category, categoryGroup.target_language],
            function(err) {
              if (err) return console.error(err.message);
              const categoryId = this.lastID;
              
              const verbStmt = db.prepare(`INSERT INTO verbs (category_id, native_infinitive, foreign_infinitive) VALUES (?, ?, ?)`);
              const conjStmt = db.prepare(`INSERT INTO conjugations (verb_id, tense, form_1s, form_2s, form_3s, form_1p, form_2p, form_3p) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
              
              categoryGroup.verbs.forEach(verb => {
                verbStmt.run(categoryId, verb.native, verb.foreign, function(err) {
                  if (err) return console.error(err.message);
                  const verbId = this.lastID;
                  
                  if (verb.conjugations) {
                    verb.conjugations.forEach(conj => {
                      conjStmt.run(verbId, conj.tense, conj.form_1s, conj.form_2s, conj.form_3s, conj.form_1p, conj.form_2p, conj.form_3p);
                    });
                  }
                });
              });
              verbStmt.finalize();
              // Note: conjStmt finalize needs to wait for all callbacks or be handled carefully in a real prod env, 
              // but for this simple sync-like setup (serialize) it's okay, we defer it slightly or omit it.
            }
          );
        });
      }
    });

    res.json({ success: true, message: 'Daten erfolgreich importiert!' });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Lesen der Import-Datei' });
  }
});

// Get verbs and their conjugations for a specific category
app.get('/api/verbs', (req, res) => {
  const categoryId = req.query.category_id;
  if (!categoryId) return res.status(400).json({ error: 'category_id required' });

  db.all('SELECT * FROM verbs WHERE category_id = ?', [categoryId], (err, verbs) => {
    if (err) return res.status(500).json({ error: err.message });
    if (verbs.length === 0) return res.json([]);

    const verbIds = verbs.map(v => v.id);
    const placeholders = verbIds.map(() => '?').join(',');
    
    db.all(`SELECT * FROM conjugations WHERE verb_id IN (${placeholders})`, verbIds, (err, conjugations) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const verbsWithConjugations = verbs.map(verb => ({
        ...verb,
        conjugations: conjugations.filter(c => c.verb_id === verb.id)
      }));
      
      res.json(verbsWithConjugations);
    });
  });
});

// Generate and stream TTS audio
app.get('/api/tts', async (req, res) => {
  try {
    const { text, lang } = req.query;
    if (!text || !lang) {
      return res.status(400).send('Text and language are required');
    }
    
    // Generate base64 audio string using google-tts-api
    const base64Audio = await googleTTS.getAudioBase64(text, { lang, slow: false });
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    
    res.writeHead(200, {
      'Content-Type': 'audio/mp3',
      'Content-Length': audioBuffer.length
    });
    res.end(audioBuffer);
  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ error: 'Failed to generate audio' });
  }
});

// --- Speech to Text (Gemini API) ---
app.post('/api/speech-to-text', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY ist in backend/.env nicht konfiguriert.' });
    }

    const lang = req.body.lang || 'it';
    
    // Explicitly log to console so we know the new code is running!
    console.log("---- Speech-To-Text API Called ----");
    console.log("Using API Key starting with:", process.env.GEMINI_API_KEY.substring(0, 8));

    // Verwende aktuelle 2.5-Modelle
    let modelName = "gemini-2.5-flash"; 
    console.log("Trying model:", modelName);
    
    let model = genAI.getGenerativeModel({ model: modelName });

    const audioData = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype
      }
    };

    const prompt = `Listen to this short audio. Transcribe the single word or short phrase spoken. The expected language is ${lang}. Return ONLY the transcribed text, without any quotes, markdown, or extra explanation. If the audio is completely silent or incomprehensible, return nothing.`;

    let result;
    try {
      result = await model.generateContent([prompt, audioData]);
    } catch (e) {
      console.warn(`Model ${modelName} failed:`, e.message);
      modelName = "gemini-2.0-flash"; // Härterer Fallback
      console.log("Fallback to:", modelName);
      model = genAI.getGenerativeModel({ model: modelName });
      result = await model.generateContent([prompt, audioData]);
    }

    let responseText = result.response.text().trim();
    
    console.log("Recognized text:", responseText);

    res.json({ transcript: responseText });
  } catch (error) {
    console.error('Speech-to-text Error:', error);
    res.status(500).json({ error: 'Failed to process audio with Gemini', details: error.message });
  }
});

// Fallback: Alle anderen Anfragen an die Frontend index.html (SPA)
// Wir nutzen hier in Express 5 direkt eine Regular Expression statt eines Strings
app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
export {};
