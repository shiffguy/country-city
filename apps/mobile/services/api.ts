import { CONFIG } from '../constants/config';

const DEFAULT_BASE_URL = CONFIG.API_BASE_URL;

let baseUrl = DEFAULT_BASE_URL;
let authToken: string | null = null;

export function setBaseUrl(url: string): void {
  baseUrl = url;
}

export function setAuthToken(token: string | null): void {
  authToken = token;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage =
        errorData?.message || getHebrewError(response.status);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Network request failed') {
      throw new Error('\u05d0\u05d9\u05df \u05d7\u05d9\u05d1\u05d5\u05e8 \u05dc\u05e9\u05e8\u05ea. \u05d1\u05d3\u05d5\u05e7 \u05d0\u05ea \u05d4\u05d0\u05d9\u05e0\u05d8\u05e8\u05e0\u05d8 \u05e9\u05dc\u05da.');
    }
    throw error;
  }
}

function getHebrewError(status: number): string {
  switch (status) {
    case 400:
      return '\u05d1\u05e7\u05e9\u05d4 \u05dc\u05d0 \u05ea\u05e7\u05d9\u05e0\u05d4';
    case 401:
      return '\u05dc\u05d0 \u05de\u05d7\u05d5\u05d1\u05e8. \u05d9\u05e9 \u05dc\u05d4\u05ea\u05d7\u05d1\u05e8 \u05de\u05d7\u05d3\u05e9';
    case 403:
      return '\u05d0\u05d9\u05df \u05d4\u05e8\u05e9\u05d0\u05d4 \u05dc\u05e4\u05e2\u05d5\u05dc\u05d4 \u05d6\u05d5';
    case 404:
      return '\u05dc\u05d0 \u05e0\u05de\u05e6\u05d0';
    case 429:
      return '\u05d9\u05d5\u05ea\u05e8 \u05de\u05d3\u05d9 \u05d1\u05e7\u05e9\u05d5\u05ea. \u05e0\u05e1\u05d4 \u05e9\u05d5\u05d1 \u05d1\u05e2\u05d5\u05d3 \u05e8\u05d2\u05e2';
    case 500:
      return '\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05e9\u05e8\u05ea. \u05e0\u05e1\u05d4 \u05e9\u05d5\u05d1 \u05de\u05d0\u05d5\u05d7\u05e8 \u05d9\u05d5\u05ea\u05e8';
    default:
      return '\u05e9\u05d2\u05d9\u05d0\u05d4 \u05dc\u05d0 \u05e6\u05e4\u05d5\u05d9\u05d4';
  }
}

export interface GuestLoginResponse {
  user: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
    rating: number;
    gamesPlayed: number;
    wins: number;
  };
  token: string;
}

export interface GameStateResponse {
  id: string;
  type: 'public' | 'private';
  status: string;
  currentLetter: string | null;
  currentRound: number;
  totalRounds: number;
  categories: string[];
  players: PlayerInfo[];
  phase: string;
  timeRemaining: number;
  stopCalledBy: string | null;
  inviteCode?: string;
}

export interface PlayerInfo {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  rating: number;
  score: number;
  isHost: boolean;
  isOnline: boolean;
}

export interface UserStats {
  rating: number;
  gamesPlayed: number;
  wins: number;
  winRate: number;
}

export interface ValidateWordResponse {
  valid: boolean;
  reason?: string;
}

export async function guestLogin(nickname: string): Promise<GuestLoginResponse> {
  return request<GuestLoginResponse>('POST', '/api/auth/guest', { nickname });
}

export async function getGameState(gameId: string): Promise<GameStateResponse> {
  return request<GameStateResponse>('GET', `/api/games/${gameId}`);
}

export async function getUserStats(userId: string): Promise<UserStats> {
  return request<UserStats>('GET', `/api/users/${userId}/stats`);
}

export async function validateWord(
  word: string,
  category: string
): Promise<ValidateWordResponse> {
  return request<ValidateWordResponse>('POST', '/api/validate', {
    word,
    category,
  });
}
