export type SpeedLevel = 'very_slow' | 'slow' | 'medium' | 'fast' | 'very_fast';

export interface SpeedProfile {
  level: SpeedLevel;
  label: string;
  speechRate: number;
  pauseTime: number;
  noInputTimeout: number;
}

export const SPEED_LEVEL_ORDER: SpeedLevel[] = ['very_slow', 'slow', 'medium', 'fast', 'very_fast'];

export const SPEED_PROFILES: Record<SpeedLevel, SpeedProfile> = {
  very_slow: {
    level: 'very_slow',
    label: 'Sehr langsam',
    speechRate: 0.65,
    pauseTime: 3200,
    noInputTimeout: 14400 // 3200 * 4.5
  },
  slow: {
    level: 'slow',
    label: 'Langsam',
    speechRate: 0.75,
    pauseTime: 2000,
    noInputTimeout: 9000 // 2000 * 4.5
  },
  medium: {
    level: 'medium',
    label: 'Mittel (Normal)',
    speechRate: 0.85,
    pauseTime: 1200,
    noInputTimeout: 5400 // 1200 * 4.5
  },
  fast: {
    level: 'fast',
    label: 'Schnell',
    speechRate: 1.00,
    pauseTime: 700,
    noInputTimeout: 3150 // 700 * 4.5
  },
  very_fast: {
    level: 'very_fast',
    label: 'Sehr schnell',
    speechRate: 1.15,
    pauseTime: 300,
    noInputTimeout: 1350 // 300 * 4.5
  }
};

export function getSpeedProfile(user?: any): SpeedProfile {
  const level: SpeedLevel = user?.global_speed || 'medium';
  if (SPEED_PROFILES[level]) {
    return SPEED_PROFILES[level];
  }
  return SPEED_PROFILES.medium;
}

export function levelToStep(level: SpeedLevel): number {
  const index = SPEED_LEVEL_ORDER.indexOf(level);
  return index !== -1 ? index + 1 : 3;
}

export function stepToLevel(step: number): SpeedLevel {
  return SPEED_LEVEL_ORDER[step - 1] || 'medium';
}
