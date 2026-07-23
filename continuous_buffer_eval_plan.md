# Implementation Plan - 100ms Live Ticker for AnalyseBar

Update the `VoiceContext` (Recorder) to refresh the visual `AnalyseBar` buffer state on a **100ms interval ticker** for smooth, real-time live inspection.

## 1. Goal Description

Provide smooth, real-time visual feedback in the `AnalyseBar` by updating the displayed speech buffer (`Erkannt`) and the extracted target sequence (`Geprüft von hinten`) every **100 milliseconds** (`setInterval` @ 100ms).

---

## 2. Proposed Changes

### Component 1: `VoiceContext.tsx` (The `Recorder`)
#### [MODIFY] `VoiceContext.tsx`
- Add a 100ms ticker effect (`setInterval(..., 100)`):
  - When `isListening === true`, a 100ms timer periodically syncs `bufferRef.current` to the `transcript` state.
  - Ensures the `AnalyseBar` updates visually 10 times per second with zero lag.

---

### Component 2: `App.tsx` & `AnalyseBar`
#### [MODIFY] `App.tsx`
- Ensure `AnalyseBar` renders the 100ms live buffer update:
  - **Erkannt**: Displays live buffer updated every 100ms.
  - **Erwartet**: Displays target word count $N$.
  - **Geprüft (von hinten)**: Displays $N$ words extracted from the end of the 100ms live buffer.

---

## 3. Verification Plan

### Automated Verification
Run build to verify zero compilation errors:
```bash
npm run build
```

### Manual Verification
1. Start Vocab Drill.
2. Speak continuously into the microphone.
3. Observe the `AnalyseBar` at the bottom of the screen:
   - Verify `Erkannt` and `Geprüft` update live every 100ms.
