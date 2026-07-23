# Implementation Plan - Simplify Recorder and Introduce SessionContext

This plan outlines the steps to:
1. Simplify the `Recorder` context to a purely technical React component.
2. Introduce a new shared `SessionContext` to handle shared states (`user`, `alwaysShowTranslation`, and `speedProfile` derived from user preferences), eliminating prop drilling.
3. Extract a state-free `DrillEvaluator` logic class to unify the speech validation rules across all Drill components.
4. Render the diagnostic `AnalyseBar` locally within the individual Drill components using a shared UI component.

---

## Goal Description
The codebase currently suffers from deep prop drilling (passing `user`, `onUpdateUser`, `alwaysShowTranslation`, and `setAlwaysShowTranslation` down multiple component layers) and contains evaluation logic inside the technical `Recorder` context.

To solve this:
1. Create a [SessionContext.tsx](file:///home/ama/Schreibtisch/dev/parladino/frontend/src/contexts/SessionContext.tsx) to manage user session, translation settings, and speed configurations.
2. Simplify [Recorder.tsx](file:///home/ama/Schreibtisch/dev/parladino/frontend/src/contexts/Recorder.tsx) to act as a purely technical word recorder with **no resets**.
3. Create a state-free [DrillEvaluator](file:///home/ama/Schreibtisch/dev/parladino/frontend/src/utils/speechMatch.ts) class to handle all text-matching business rules.
4. Create a reusable [AnalyseBar.tsx](file:///home/ama/Schreibtisch/dev/parladino/frontend/src/components/AnalyseBar.tsx) UI component.
5. Update [main.tsx](file:///home/ama/Schreibtisch/dev/parladino/frontend/src/main.tsx) to wrap the app with `SessionProvider` and `RecorderProvider`.
6. Update drills, setup, settings, and the transport bar to consume `useSession()` and `useRecorder()`, removing all related props.

---

## User Review Required
> [!IMPORTANT]
> The `clearTranscript` and `reset` functions will be completely removed from the `useRecorder` API. The `Recorder` will never clear its buffer during a session. Drills will evaluate the spoken words by reading only the last $N$ words of the buffer via `getLatestWords(N)`, ensuring that previous spoken history does not interfere.

---

## Proposed Changes

### Component 1: `SessionContext` (New React Context)
#### [NEW] [SessionContext.tsx](file:///home/ama/Schreibtisch/dev/parladino/frontend/src/contexts/SessionContext.tsx)
Manage shared states and derive the speed settings dynamically from user preferences:

```tsx
import React, { createContext, useContext, useState } from 'react';
import { getSpeedProfile, SpeedProfile } from '../utils/speedConfig';

interface SessionContextType {
  user: any;
  setUser: (user: any) => void;
  updateUser: (updatedFields: any) => void;
  alwaysShowTranslation: boolean;
  setAlwaysShowTranslation: (show: boolean) => void;
  speedProfile: SpeedProfile;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [alwaysShowTranslation, setAlwaysShowTranslation] = useState(false);

  const updateUser = (updatedFields: any) => {
    setUser((prev: any) => {
      if (!prev) return null;
      return { ...prev, ...updatedFields };
    });
  };

  const speedProfile = getSpeedProfile(user);

  return (
    <SessionContext.Provider value={{
      user,
      setUser,
      updateUser,
      alwaysShowTranslation,
      setAlwaysShowTranslation,
      speedProfile
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) throw new Error('useSession must be used within a SessionProvider');
  return context;
};
```

---

### Component 2: `DrillEvaluator` Logic Class
#### [MODIFY] [speechMatch.ts](file:///home/ama/Schreibtisch/dev/parladino/frontend/src/utils/speechMatch.ts)
Encapsulate all evaluation methods inside a static `DrillEvaluator` class:

```typescript
export class DrillEvaluator {
  /**
   * Evaluiert, ob ein gesprochenes Wort oder kurzes Vokabular mit der erwarteten Antwort übereinstimmt (Fuzzy & Normalisiert).
   */
  static checkVocabMatch(spoken: string, expected: string, langCode: string): boolean {
    const cleanTranscript = normalizeText(spoken, langCode, true);
    const cleanTarget = normalizeText(expected, langCode, true);
    const isFuzzy = checkFuzzyMatch(cleanTranscript, cleanTarget);
    return !!cleanTranscript && (
      cleanTranscript === cleanTarget || 
      cleanTranscript.includes(cleanTarget) || 
      cleanTarget.includes(cleanTranscript) || 
      isFuzzy
    );
  }

  /**
   * Evaluiert Sätze auf exakte Wortreihenfolge und Fuzzy-Abgleich.
   */
  static checkSentenceMatch(spoken: string, expected: string): boolean {
    return checkAllWordsPresent(spoken, expected);
  }

  /**
   * Evaluiert Konjugationsverben.
   */
  static checkConjugationMatch(spoken: string, expectedVerb: string, possiblePronouns: string[] = []): boolean {
    return checkConjugationMatch(spoken, expectedVerb, possiblePronouns);
  }

  /**
   * Prüft auf Abbruch- oder Überspring-Kommandos.
   */
  static checkSkipCommand(spoken: string): boolean {
    return checkSkipOrWrong(spoken);
  }

  /**
   * Berechnet die geprüfte Wortsequenz für die Diagnose-Ausgabe.
   */
  static getEvaluatedSequence(transcript: string, expectedText?: string | number, allowOptionalPronoun: boolean = false): string {
    return getEvaluatedSequence(transcript, expectedText, allowOptionalPronoun);
  }
}
```

---

### Component 3: `AnalyseBar` (New Shared UI Component)
#### [NEW] [AnalyseBar.tsx](file:///home/ama/Schreibtisch/dev/parladino/frontend/src/components/AnalyseBar.tsx)
Create a new shared UI component that accepts rendering parameters for diagnostic feedback.

---

### Component 4: `Recorder` Context (Pure Recording Component)
#### [MODIFY] [Recorder.tsx](file:///home/ama/Schreibtisch/dev/parladino/frontend/src/contexts/Recorder.tsx)
Remove all target text state, pronoun evaluation, reset methods, and clean up the SpeechRecognition hooks. Only expose basic control state and the sliding window API `getLatestWords(count)`.

---

### Component 5: Main Application Wrapper and Entry Point
#### [MODIFY] [main.tsx](file:///home/ama/Schreibtisch/dev/parladino/frontend/src/main.tsx)
Nest `RecorderProvider` inside `SessionProvider`.

#### [MODIFY] [App.tsx](file:///home/ama/Schreibtisch/dev/parladino/frontend/src/App.tsx)
- Remove `user` and `setUser` local state. Instead, consume them from `useSession()`.
- Remove `expectedWordCount`, `evaluatedSequence`, `clearTranscript` destructuring from `useRecorder()`.
- Delete the inline `AnalyseBar` rendering block.
- Remove all prop drilling of `user`, `onUpdateUser`, `alwaysShowTranslation`, and `setAlwaysShowTranslation` to drills and setup.

---

### Component 6: Settings, Setup and Drill Components
Update settings, setup, and each of the four drills to use `useSession()` and `useRecorder()` locally, completely eliminating prop inputs for `user`, `onUpdateUser`, and `alwaysShowTranslation`.

---

## Verification Plan

### Automated Tests
Run build to verify there are no TypeScript compile errors across modified files:
```bash
npm run build
```

### Manual Verification
1. Open the app and log in.
2. Verify settings and setup load correctly.
3. Start a vocab drill, conjugation drill, sentence drill, or theme drill.
4. Verify the diagnostic `AnalyseBar` renders correctly at the bottom of the screen.
5. Speak and check that the transcript updates smoothly and displays up to 50 words.
6. Verify that changing options (e.g. speaking speed) updates the session state immediately.
