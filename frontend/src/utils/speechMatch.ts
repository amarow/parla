import writtenNumber from 'written-number';

/**
 * Normalisiert einen Text für den Sprachabgleich.
 * Entfernt Satzzeichen, zusätzliche Leerzeichen und normalisiert Umlaute/Akzente.
 * Optional wandelt es auch Zahlen in geschriebene Wörter um und entfernt alle Leerzeichen.
 */
export function normalizeText(str: string, langCode?: string, removeSpaces: boolean = false): string {
  let text = str.toLowerCase().trim();
  
  if (langCode) {
    const lang = langCode.split('-')[0];
    text = text.split(' ').map(w => {
      if (/^\d+$/.test(w)) {
        try {
          return writtenNumber(parseInt(w), { lang: lang === 'it' ? 'it' : 'de' });
        } catch (e) {
          return w;
        }
      }
      return w;
    }).join(' ');
  }

  text = text
    .replace(/[.,!?]/g, '')
    .replace(/['’´`"]/g, '')
    .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Akzente entfernen

  if (removeSpaces) {
    return text.replace(/\s+/g, '');
  } else {
    return text.replace(/\s+/g, ' ').trim();
  }
}

/**
 * Berechnet die Levenshtein-Distanz zwischen zwei Strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[j][0] = j;
  
  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Prüft auf eine Fuzzy-Übereinstimmung (Levenshtein) zwischen zwei normalisierten Strings.
 */
export function checkFuzzyMatch(normalizedTranscript: string, normalizedTarget: string): boolean {
  const distance = levenshteinDistance(normalizedTranscript, normalizedTarget);
  const maxDistance = normalizedTarget.length > 5 ? 2 : (normalizedTarget.length > 3 ? 1 : 0);
  return distance <= maxDistance;
}

/**
 * Prüft, ob die Wörter des erwarteten Texts in den LETZTEN N Wörtern des gesprochenen Texts
 * in der korrekten Reihenfolge (optional per Fuzzy-Match) übereinstimmen.
 */
export function checkAllWordsPresent(transcript: string, expected: string): boolean {
  const cleanTranscript = normalizeText(transcript);
  const cleanExpected = normalizeText(expected);
  
  const expectedWords = cleanExpected.split(/\s+/).filter(Boolean);
  const spokenWords = cleanTranscript.split(/\s+/).filter(Boolean);
  
  if (expectedWords.length === 0) return false;
  
  // Nur exakt die letzten N Wörter vom Ende des Puffers holen
  const recentWords = spokenWords.slice(-expectedWords.length);
  if (recentWords.length !== expectedWords.length) return false;

  const recentStr = recentWords.join(' ');
  const expectedStr = expectedWords.join(' ');

  return recentStr === expectedStr || checkFuzzyMatch(recentStr, expectedStr);
}

const ALL_ITALIAN_PRONOUNS = ['io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro'];

/**
 * Extrahiert exakt die notwendige Anzahl von Wörtern vom ENDE des Transkripts.
 */
export function getEvaluatedSequence(
  transcript: string, 
  expectedText?: string | number, 
  allowOptionalPronoun: boolean = false
): string {
  const cleanTranscript = normalizeText(transcript);
  const words = cleanTranscript.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';

  let count = 3;
  if (typeof expectedText === 'number') {
    count = expectedText;
  } else if (typeof expectedText === 'string' && expectedText.trim().length > 0) {
    const cleanExpected = normalizeText(expectedText);
    const expectedWords = cleanExpected.split(/\s+/).filter(Boolean);
    count = expectedWords.length;
    if (allowOptionalPronoun) {
      // Prüfen, ob am Ende ein Pronomen mitgesprochen wurde
      const testWindow = words.slice(-(count + 1));
      const hasPronoun = testWindow.some(w => ALL_ITALIAN_PRONOUNS.includes(w));
      if (hasPronoun) {
        count += 1;
      }
    }
  }

  return words.slice(-count).join(' ');
}

/**
 * Prüft, ob ein konjugiertes Verb von HINTEN her im gesprochenen Text enthalten ist.
 * Falls Pronomen gesprochen wurden, wird geprüft, ob das zuletzt gesprochene Pronomen korrekt ist.
 */
export function checkConjugationMatch(transcript: string, expectedVerb: string, possiblePronouns: string[] = []): boolean {
  const cleanTranscript = normalizeText(transcript);
  const allSpokenWords = cleanTranscript.split(/\s+/).filter(Boolean);
  if (allSpokenWords.length === 0) return false;

  const expectedVerbParts = normalizeText(expectedVerb).split(/\s+/).filter(Boolean);
  if (expectedVerbParts.length === 0) return false;

  // Prüfen, ob am Ende ein Pronomen gesprochen wurde
  const verbLen = expectedVerbParts.length;
  const testWindow = allSpokenWords.slice(-(verbLen + 1));
  const hasSpokenPronoun = testWindow.some(w => ALL_ITALIAN_PRONOUNS.includes(w));

  const maxWindow = verbLen + (hasSpokenPronoun ? 1 : 0);
  const recentSpokenWords = allSpokenWords.slice(-maxWindow);

  // Prüfen, ob das erwartete Verb in diesen exakten End-Wörtern enthalten ist
  const hasVerb = expectedVerbParts.every(part => recentSpokenWords.includes(part));
  if (!hasVerb) return false;

  if (possiblePronouns.length > 0) {
    const cleanPossiblePronouns = possiblePronouns.map(p => normalizeText(p));
    const recentSpokenPronouns = recentSpokenWords.filter(w => ALL_ITALIAN_PRONOUNS.includes(w));

    if (recentSpokenPronouns.length > 0) {
      // Nur das ZULETZT gesprochene Pronomen in diesem End-Fenster bewerten
      const lastSpokenPronoun = recentSpokenPronouns[recentSpokenPronouns.length - 1];
      const isLastPronounValid = cleanPossiblePronouns.includes(lastSpokenPronoun);

      if (!isLastPronounValid) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Prüft, ob das Transkript Befehle zum Überspringen enthält (z. B. "weiter", "falsch", "weiß nicht", "skip", "nächste").
 */
export function checkSkipOrWrong(transcript: string, _thresholdLength?: number, _removeSpaces: boolean = false): boolean {
  const transcriptLower = transcript.toLowerCase();
  
  const hasSkipKeyword = transcriptLower.includes('weiter') || 
                          transcriptLower.includes('falsch') || 
                          transcriptLower.includes('weiß nicht') ||
                          transcriptLower.includes('weiss nicht') ||
                          transcriptLower.includes('naechste') ||
                          transcriptLower.includes('nächste') ||
                          transcriptLower.includes('überspringen') ||
                          transcriptLower.includes('ueberspringen') ||
                          transcriptLower.includes('skip') ||
                          transcriptLower.includes('pass');
                          
  return hasSkipKeyword;
}
