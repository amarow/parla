import db from './database.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedData = async () => {
  db.serialize(async () => {
    // Tabellen für sauberen Neustart leeren
    db.run(`DELETE FROM conjugations`);
    db.run(`DELETE FROM verbs`);
    db.run(`DELETE FROM words`);
    db.run(`DELETE FROM categories`);
    db.run(`DELETE FROM users`);

    // Einen Test-Benutzer anlegen (Passwort: "password")
    const hash = await bcrypt.hash('password', 10);
    db.run(`INSERT INTO users (username, password_hash, native_language, target_language) VALUES ('testuser', ?, 'de', 'it')`, [hash], (err) => {
      if (err) console.error("Fehler beim User-Seed:", err.message);
      else console.log('Testuser angelegt (username: testuser, passwort: password).');
    });

    let categoryId = 1;
    const stmtCategory = db.prepare(`INSERT INTO categories (id, name, target_language) VALUES (?, ?, ?)`);
    const stmtWord = db.prepare(`INSERT INTO words (category_id, native_word, foreign_word) VALUES (?, ?, ?)`);

    // Seed basic words
    const basicDataPath = path.join(__dirname, 'data', 'it_basic.json');
    if (fs.existsSync(basicDataPath)) {
      const rawData = fs.readFileSync(basicDataPath, 'utf-8');
      const categoriesData = JSON.parse(rawData);

      categoriesData.forEach((catData: any) => {
        stmtCategory.run(categoryId, catData.category, catData.target_language, function(err: any) {
          if (err) return console.error(err.message);
          console.log(`Category '${catData.category}' inserted.`);
        });

        catData.words.forEach((word: any) => {
          stmtWord.run(categoryId, word.native, word.foreign);
        });
        
        categoryId++;
      });
      console.log('All basic words inserted.');
    }

    // Seed verbs
    const verbsDataPath = path.join(__dirname, 'data', 'it_verbs.json');
    if (fs.existsSync(verbsDataPath)) {
      const rawVerbs = fs.readFileSync(verbsDataPath, 'utf-8');
      const verbsCategories = JSON.parse(rawVerbs);
      
      const verbStmt = db.prepare(`INSERT INTO verbs (category_id, native_infinitive, foreign_infinitive) VALUES (?, ?, ?)`);
      const conjStmt = db.prepare(`INSERT INTO conjugations (verb_id, tense, form_1s, form_2s, form_3s, form_1p, form_2p, form_3p) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

      verbsCategories.forEach((catData: any) => {
        stmtCategory.run(categoryId, catData.category, catData.target_language, function(err: any) {
          if (err) return console.error(err.message);
          console.log(`Verb Category '${catData.category}' inserted.`);
        });

        catData.verbs.forEach((verb: any) => {
          verbStmt.run(categoryId, verb.native, verb.foreign, function(err: any) {
            if (err) return console.error(err.message);
            const verbId = this.lastID;
            
            if (verb.conjugations) {
              verb.conjugations.forEach((conj: any) => {
                conjStmt.run(verbId, conj.tense, conj.form_1s, conj.form_2s, conj.form_3s, conj.form_1p, conj.form_2p, conj.form_3p);
              });
            }
          });
        });
        categoryId++;
      });
      console.log('All verbs inserted.');
    }

    // Since we use setTimeout inside serialize, statements finalize can be a bit tricky, but this simple script is fine
  });
};

seedData();
