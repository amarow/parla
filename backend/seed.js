const db = require('./database');
const bcrypt = require('bcryptjs');

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

    // Kategorie anlegen (für Italienisch)
    db.run(`INSERT INTO categories (id, name, target_language) VALUES (1, 'Essen & Trinken', 'it')`, function(err) {
      if (err) return console.error(err.message);
      console.log('Category inserted.');
      
      const words = [
        { native: "der Apfel", foreign: "la mela" },
        { native: "das Brot", foreign: "il pane" },
        { native: "das Wasser", foreign: "l'acqua" },
        { native: "der Wein", foreign: "il vino" },
        { native: "das Fleisch", foreign: "la carne" },
        { native: "der Fisch", foreign: "il pesce" },
        { native: "der Käse", foreign: "il formaggio" },
        { native: "die Milch", foreign: "il latte" },
        { native: "der Kaffee", foreign: "il caffè" },
        { native: "die Pizza", foreign: "la pizza" },
        { native: "die Nudeln", foreign: "la pasta" },
        { native: "das Frühstück", foreign: "la colazione" },
        { native: "das Mittagessen", foreign: "il pranzo" },
        { native: "das Abendessen", foreign: "la cena" },
        { native: "das Ei", foreign: "l'uovo" },
        { native: "die Tomate", foreign: "il pomodoro" },
        { native: "die Kartoffel", foreign: "la patata" },
        { native: "das Öl", foreign: "l'olio" },
        { native: "das Salz", foreign: "il sale" },
        { native: "der Zucker", foreign: "lo zucchero" }
      ];

      const stmt = db.prepare(`INSERT INTO words (category_id, native_word, foreign_word) VALUES (1, ?, ?)`);
      words.forEach(word => {
        stmt.run(word.native, word.foreign);
      });
      stmt.finalize();
      console.log('Words inserted.');
    });
  });
};

seedData();