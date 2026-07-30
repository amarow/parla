export interface SessionStats {
  categoryId: string;
  drillType: DrillType;
  totalItems: number;
  completedItems: number;
  correctFirstTry: number;
  hintsUsed: number;
  startTime: number;
  endTime?: number;
  lastUpdatedTime?: number;
}

export type DrillType = 'vocab' | 'conjugations' | 'sentences' | 'text_islands';

export interface CategoryStats {
  totalSessions: number;
  totalItemsPracticed: number;
  totalCorrectFirstTry: number;
  totalHintsUsed: number;
  totalDurationMs: number;
}

export interface LifetimeStats {
  totalSessions: number;
  totalItemsPracticed: number;
  totalCorrectFirstTry: number;
  totalHintsUsed: number;
  totalDurationMs: number;
  lastActive: number;
  categories?: Record<DrillType, CategoryStats>;
}

export function getDrillTypeName(type: DrillType): string {
  switch (type) {
    case 'vocab': return 'Vokabeln';
    case 'conjugations': return 'Konjugationen';
    case 'sentences': return 'Sätze';
    case 'text_islands': return 'Themen (Shadowing)';
  }
}

const emptyCategoryStats = (): CategoryStats => ({
  totalSessions: 0,
  totalItemsPracticed: 0,
  totalCorrectFirstTry: 0,
  totalHintsUsed: 0,
  totalDurationMs: 0
});

const defaultCategoriesBreakdown = (): Record<DrillType, CategoryStats> => ({
  vocab: emptyCategoryStats(),
  conjugations: emptyCategoryStats(),
  sentences: emptyCategoryStats(),
  text_islands: emptyCategoryStats()
});

const STORAGE_KEY = 'parladino_lifetime_stats';

class StatsService {
  private currentSession: SessionStats | null = null;

  startSession(categoryId: string, drillType: DrillType, totalItems: number = 0) {
    this.currentSession = {
      categoryId,
      drillType,
      totalItems,
      completedItems: 0,
      correctFirstTry: 0,
      hintsUsed: 0,
      startTime: Date.now(),
    };
  }

  recordAttempt(isCorrect: boolean, hintUsed: boolean = false) {
    if (!this.currentSession) return;
    
    this.currentSession.completedItems += 1;
    if (isCorrect && !hintUsed) {
      this.currentSession.correctFirstTry += 1;
    }
    if (hintUsed) {
      this.currentSession.hintsUsed += 1;
    }

    this.commitProgressToLifetime(isCorrect, hintUsed);
  }

  getCurrentSession(): SessionStats | null {
    return this.currentSession;
  }

  endSession(): { session: SessionStats; lifetime: LifetimeStats } | null {
    if (!this.currentSession || this.currentSession.completedItems === 0) {
      this.currentSession = null;
      return null;
    }

    const now = Date.now();
    const finalSegment = now - (this.currentSession.lastUpdatedTime || this.currentSession.startTime);

    if (finalSegment > 0) {
      const current = this.getLifetimeStats();
      const drillType = this.currentSession.drillType;
      const catStats = current.categories ? { ...current.categories } : defaultCategoriesBreakdown();
      const currentCat = catStats[drillType] || emptyCategoryStats();

      catStats[drillType] = {
        ...currentCat,
        totalDurationMs: (currentCat.totalDurationMs || 0) + finalSegment
      };

      const updated: LifetimeStats = {
        ...current,
        totalDurationMs: (current.totalDurationMs || 0) + finalSegment,
        lastActive: now,
        categories: catStats
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save lifetime stats to localStorage', e);
      }
    }

    const session: SessionStats = {
      ...this.currentSession,
      endTime: now
    };

    this.currentSession = null;
    const lifetime = this.getLifetimeStats();
    return { session, lifetime };
  }

  getLifetimeStats(): LifetimeStats {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (!parsed.categories) {
          parsed.categories = defaultCategoriesBreakdown();
        }
        if (parsed.totalDurationMs === undefined) {
          parsed.totalDurationMs = 0;
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load lifetime stats from localStorage', e);
    }
    return {
      totalSessions: 0,
      totalItemsPracticed: 0,
      totalCorrectFirstTry: 0,
      totalHintsUsed: 0,
      totalDurationMs: 0,
      lastActive: Date.now(),
      categories: defaultCategoriesBreakdown()
    };
  }

  resetLifetimeStats(): LifetimeStats {
    const reset: LifetimeStats = {
      totalSessions: 0,
      totalItemsPracticed: 0,
      totalCorrectFirstTry: 0,
      totalHintsUsed: 0,
      totalDurationMs: 0,
      lastActive: Date.now(),
      categories: defaultCategoriesBreakdown()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
    } catch (e) {
      console.warn('Failed to reset lifetime stats in localStorage', e);
    }
    return reset;
  }

  private commitProgressToLifetime(isCorrect: boolean, hintUsed: boolean) {
    if (!this.currentSession) return;
    
    const current = this.getLifetimeStats();
    const drillType = this.currentSession.drillType;
    const catStats = current.categories ? { ...current.categories } : defaultCategoriesBreakdown();
    const currentCat = catStats[drillType] || emptyCategoryStats();

    const isFirstItem = this.currentSession.completedItems === 1;
    const sessionIncrement = isFirstItem ? 1 : 0;

    const now = Date.now();
    const elapsedSinceLastUpdate = now - (this.currentSession.lastUpdatedTime || this.currentSession.startTime);
    this.currentSession.lastUpdatedTime = now;

    catStats[drillType] = {
      totalSessions: currentCat.totalSessions + sessionIncrement,
      totalItemsPracticed: currentCat.totalItemsPracticed + 1,
      totalCorrectFirstTry: currentCat.totalCorrectFirstTry + (isCorrect && !hintUsed ? 1 : 0),
      totalHintsUsed: currentCat.totalHintsUsed + (hintUsed ? 1 : 0),
      totalDurationMs: (currentCat.totalDurationMs || 0) + elapsedSinceLastUpdate
    };

    const updated: LifetimeStats = {
      totalSessions: current.totalSessions + sessionIncrement,
      totalItemsPracticed: current.totalItemsPracticed + 1,
      totalCorrectFirstTry: current.totalCorrectFirstTry + (isCorrect && !hintUsed ? 1 : 0),
      totalHintsUsed: current.totalHintsUsed + (hintUsed ? 1 : 0),
      totalDurationMs: (current.totalDurationMs || 0) + elapsedSinceLastUpdate,
      lastActive: now,
      categories: catStats
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save lifetime stats to localStorage', e);
    }
  }
}

export const statsService = new StatsService();
