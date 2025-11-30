// Tipos para el módulo de gamificación

export type MissionCategory = 'ELECTRICITY' | 'TRANSPORT' | 'WASTE' | 'GENERAL' | 'BONUS';
export type MissionType = 'REDUCTION' | 'FREQUENCY' | 'DISCOVERY' | 'BONUS';
export type MissionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type MissionStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'FAILED';

export interface Mission {
  id: number;
  title: string;
  description: string;
  category: MissionCategory;
  type: MissionType;
  difficulty: MissionDifficulty;
  xpReward: number;
  startDate: string;
  endDate: string;
  targetValue?: number;
  targetUnit?: string;
  iconEmoji?: string;
  isTemplate: boolean;
  weekNumber?: string;
  year?: number;
}

export interface MissionProgress {
  id: number;
  missionId: number;
  userId: number;
  status: MissionStatus;
  currentProgress: number;
  targetValue: number;
  completionPercent: number;
  startedAt: string;
  completedAt?: string;
  expiresAt: string;
  xpAwarded?: number;
}

export interface MissionWithProgress {
  mission: Mission;
  progress?: MissionProgress;
}

export interface UserMissionsProgressResponse {
  activeMissions: MissionWithProgress[];
  completedMissions: MissionWithProgress[];
  expiredMissions: MissionWithProgress[];
  totalActive: number;
  totalCompleted: number;
  totalExpired: number;
}

export interface LeaderboardEntry {
  rankPosition: number;
  userId: number;
  username: string;
  co2AvoidedKg: number;
  missionsCompleted: number;
  totalXpWeek: number;
  isCurrentUser: boolean;
  medalEmoji?: string;
}

export interface LeaderboardResponse {
  weekNumber: string;
  year: number;
  topUsers: LeaderboardEntry[];
  currentUser?: LeaderboardEntry;
  totalUsers: number;
  calculatedAt?: string;
}

export interface GamificationProfile {
  userId: number;
  totalXp: number;
  currentLevel: number;
  levelTitle: string;
  currentStreak: number;
  bestStreak: number;
  lastActivityDate?: string;
  xpToNextLevel: number;
}

export interface XPBalance {
  totalXp: number;
  currentLevel: number;
  xpToNextLevel: number;
  xpThisMonth: number;
  updatedAt: string;
}

export interface StreakInfo {
  currentStreak: number;
  bestStreak: number;
  lastCalculationDate?: string;
  lastActivityDate?: string;
  streakType: string;
}
