const db = require('./database');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const seedData = async () => {
  db.serialize(async () => {
    // Tabellen für sauberen Neustart leeren
    db.run(`DELETE FROM words`);
    db.run(`DELETE FROM categories`);
    db.run(`DELETE FROM users`);

    // Einen Test-Benutzer anlegen (Passwort: "password")
    const hash = await bcrypt.hash('password', 10);
    db.run(`INSERT INTO users (username, password_hash, native_language, target_language) VALUES ('testuser', ?, 'de', 'it')`, [hash], (err) => {
      if (err) console.error("Fehler beim User-Seed:", err.message);
      else console.log('Testuser angelegt (username: testuser, passwort: password).');
    });

    const dataPath = path.join(__dirname, 'data', 'it_basic.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const categoriesData = JSON.parse(rawData);

    let categoryId = 1;
    const stmtCategory = db.prepare(`INSERT INTO categories (id, name, target_language) VALUES (?, ?, ?)`);
    const stmtWord = db.prepare(`INSERT INTO words (category_id, native_word, foreign_word) VALUES (?, ?, ?)`);

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

    stmtCategory.finalize();
    stmtWord.finalize();
    console.log('All words inserted.');
  });
};

seedData();
export {};
