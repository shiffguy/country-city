// ============================================================
// Enums
// ============================================================

export enum GameType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum GameStatus {
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
}

export enum AnswerStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHALLENGED = 'CHALLENGED',
}

export enum VoteType {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export enum GamePhase {
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  STOPPED = 'STOPPED',
  REVIEW = 'REVIEW',
  VOTING = 'VOTING',
  ROUND_RESULTS = 'ROUND_RESULTS',
  FINISHED = 'FINISHED',
}

// ============================================================
// Core Interfaces
// ============================================================

export interface User {
  id: string;
  nickname: string;
  avatarUrl?: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  createdAt: string;
  lastSeen: string;
}

export interface Game {
  id: string;
  type: GameType;
  status: GameStatus;
  currentLetter?: string;
  currentRound: number;
  totalRounds: number;
  maxPlayers: number;
  createdById: string;
  inviteCode?: string;
  categories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GamePlayer {
  id: string;
  gameId: string;
  userId: string;
  score: number;
  joinedAt: string;
  user?: User;
}

export interface Answer {
  id: string;
  gameId: string;
  round: number;
  userId: string;
  category: string;
  answerText: string;
  status: AnswerStatus;
  dictionaryValid: boolean;
  score: number;
  user?: User;
}

export interface Vote {
  id: string;
  answerId: string;
  voterUserId: string;
  vote: VoteType;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  gameId: string;
  userId: string;
  message: string;
  createdAt: string;
  user?: User;
}

// ============================================================
// Configuration & State
// ============================================================

export interface GameConfig {
  type: GameType;
  categories: string[];
  maxPlayers: number;
  totalRounds: number;
}

export interface GameState {
  game: Game;
  players: GamePlayer[];
  answers: Answer[];
  currentPhase: GamePhase;
  timeRemaining: number;
  stopCalledBy?: string;
}

export interface PlayerScore {
  userId: string;
  nickname: string;
  roundScores: number[];
  totalScore: number;
}

export interface RoundResults {
  round: number;
  letter: string;
  scores: PlayerScore[];
}
