import type { Difficulty } from '../core/config';

export type LeaderboardSessionLength = 'express' | 'standard';

export type LeaderboardSectionId =
  | 'easy-express'
  | 'medium-express'
  | 'hard-express'
  | 'easy-standard'
  | 'medium-standard'
  | 'hard-standard';

export type LeaderboardSectionDefinition = {
  id: LeaderboardSectionId;
  difficulty: Difficulty;
  sessionLength: LeaderboardSessionLength;
  title