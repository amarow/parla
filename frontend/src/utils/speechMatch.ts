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
 * Prüft, ob alle Wörter des erwarteten Texts im gesprochenen Text enthalten sind.
 */
export function checkAllWordsPresent(transcript: string, expected: string): boolean {
  const cleanTranscript = normalizeText(transcript);
  const cleanExpected = normalizeText(expected);
  
  const expectedWords = cleanExpected.split(/\s+/).filter(Boolean);
  const spokenWords = cleanTranscript.split(/\s+/).filter(Boolean);
  
  if (expectedWords.length === 0) return false;
  return expectedWords.every(word => spokenWords.includes(word));
}

/**
 * Prüft, ob ein konjugiertes Verb und das passende Pronomen im gesprochenen Text enthalten sind.
 */
export function checkConjugationMatch(transcript: string, expectedVerb: string, possiblePronouns: string[]): boolean {
  const cleanTranscript = normalizeText(transcript);
  const spokenWords = cleanTranscript.split(/\s+/).filter(Boolean);
  
  const expectedVerbParts = normalizeText(expectedVerb).split(/\s+/).filter(Boolean);
  const hasVerb = expectedVerbParts.every(part => spokenWords.includes(part));
  
  const hasPronoun = possiblePronouns.map(p => normalizeText(p)).some(p => spokenWords.includes(p));
  
  return hasVerb && hasPronoun;
}

/**
 * Prüft, ob das Transkript Befehle zum Überspringen enthält (z. B. "weiter", "falsch", "weiß nicht")
 * oder ob die Länge des normalisierten Transkripts einen Schwellenwert überschreitet (für fehlerhafte Eingabe).
 */
export function checkSkipOrWrong(transcript: string, thresholdLength: number, removeSpaces: boolean = false): boolean {
  const transcriptLower = transcript.toLowerCase();
  const cleanTranscript = normalizeText(transcript, undefined, removeSpaces);
  
  const hasSkipKeyword = transcriptLower.includes('weiter') || 
                          transcriptLower.includes('falsch') || 
                          transcriptLower.includes('weiß nicht') ||
                          transcriptLower.includes('weiss nicht');
                          
  return hasSkipKeyword || cleanTranscript.length > thresholdLength;
}
