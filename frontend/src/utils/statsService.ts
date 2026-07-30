export interface SessionStats {
  categoryId: string;
  totalItems: number;
  completedItems: number;
  correctFirstTry: number;
  hintsUsed: number;
  startTime: number;
  endTime?: number;
}

export interface LifetimeStats {
  totalSessions: number;
  totalItemsPracticed: number;
  totalCorrectFirstTry: number;
  totalHintsUsed: number;
  lastActive: number;
}

const STORAGE_KEY = 'parladino_lifetime_stats';

class StatsService {
  private currentSession: SessionStats | null = null;

  startSession(categoryId: string, totalItems: number = 0) {
    this.currentSession = {
      categoryId,
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
  }

  getCurrentSession(): SessionStats | null {
    return this.currentSession;
  }

  endSession(): { session: SessionStats; lifetime: LifetimeStats } {
    const session: SessionStats = this.currentSession ? {
      ...this.currentSession,
      endTime: Date.now()
    } : {
      categoryId: 'unknown',
      totalItems: 0,
      completedItems: 0,
      correctFirstTry: 0,
      hintsUsed: 0,
      startTime: Date.now(),
      endTime: Date.now()
    };

    const lifetime = this.updateLifetimeStats(session);
    this.currentSession = null;
    return { session, lifetime };
  }

  getLifetimeStats(): LifetimeStats {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load lifetime stats from localStorage', e);
    }
    return {
      totalSessions: 0,
      totalItemsPracticed: 0,
      totalCorrectFirstTry: 0,
      totalHintsUsed: 0,
      lastActive: Date.now()
    };
  }

  resetLifetimeStats(): LifetimeStats {
    const reset: LifetimeStats = {
      totalSessions: 0,
      totalItemsPracticed: 0,
      totalCorrectFirstTry: 0,
      totalHintsUsed: 0,
      lastActive: Date.now()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
    } catch (e) {
      console.warn('Failed to reset lifetime stats in localStorage', e);
    }
    return reset;
  }

  private updateLifetimeStats(session: SessionStats): LifetimeStats {
    const current = this.getLifetimeStats();
    const updated: LifetimeStats = {
      totalSessions: current.totalSessions + 1,
      totalItemsPracticed: current.totalItemsPracticed + session.completedItems,
      totalCorrectFirstTry: current.totalCorrectFirstTry + session.correctFirstTry,
      totalHintsUsed: current.totalHintsUsed + session.hintsUsed,
      lastActive: Date.now()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save lifetime stats to localStorage', e);
    }

    return updated;
  }
}

export const statsService = new StatsService();
