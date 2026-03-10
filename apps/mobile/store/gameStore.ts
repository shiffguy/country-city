import { create } from 'zustand';
import { socketService, ConnectionStatus } from '../services/socket';
import {
  guestLogin,
  setAuthToken,
  GuestLoginResponse,
  PlayerInfo,
} from '../services/api';
import { showInterstitial } from '../services/ads';

export type GamePhase =
  | 'WAITING'
  | 'PLAYING'
  | 'STOPPED'
  | 'REVIEW'
  | 'VOTING'
  | 'ROUND_RESULTS'
  | 'FINISHED';

export type MatchmakingStatus = 'idle' | 'searching' | 'found';

export type ValidationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'challenged'
  | 'checking';

export interface User {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  rating: number;
  gamesPlayed: number;
  wins: number;
}

export interface GameState {
  id: string;
  type: 'public' | 'private';
  status: string;
  currentLetter: string | null;
  currentRound: number;
  totalRounds: number;
  categories: string[];
  players: PlayerInfo[];
  phase: GamePhase;
  timeRemaining: number;
  stopCalledBy: string | null;
  inviteCode?: string;
}

export interface Answer {
  id: string;
  playerId: string;
  playerNickname: string;
  category: string;
  text: string;
  status: ValidationStatus;
  score: number;
  votesFor: number;
  votesAgainst: number;
  myVote?: 'for' | 'against' | null;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  text: string;
  timestamp: number;
}

export interface RoundScore {
  playerId: string;
  nickname: string;
  scores: Record<string, number>;
  roundTotal: number;
  gameTotal: number;
}

interface GameStore {
  // State
  user: User | null;
  token: string | null;
  connectionStatus: ConnectionStatus;
  currentGame: GameState | null;
  answers: Record<string, string>;
  reviewAnswers: Answer[];
  roundScores: RoundScore[];
  chatMessages: ChatMessage[];
  matchmakingStatus: MatchmakingStatus;
  error: string | null;
  isAdFree: boolean;

  // Actions
  login: (nickname: string) => Promise<void>;
  createGame: (config: {
    categories: string[];
    totalRounds: number;
    maxPlayers: number;
    isPrivate: boolean;
  }) => void;
  joinGame: (gameIdOrCode: string) => void;
  leaveGame: () => void;
  startGame: () => void;
  submitAnswers: () => void;
  callStop: () => void;
  vote: (answerId: string, vote: 'for' | 'against') => void;
  sendChat: (message: string) => void;
  joinMatchmaking: () => void;
  leaveMatchmaking: () => void;
  setAnswer: (category: string, text: string) => void;
  clearAnswers: () => void;
  setupSocketListeners: () => void;
  cleanupSocketListeners: () => void;
  reset: () => void;
  setError: (error: string | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setAdFree: (value: boolean) => void;
}

const initialState = {
  user: null,
  token: null,
  connectionStatus: 'disconnected' as ConnectionStatus,
  currentGame: null,
  answers: {},
  reviewAnswers: [],
  roundScores: [],
  chatMessages: [],
  matchmakingStatus: 'idle' as MatchmakingStatus,
  error: null,
  isAdFree: false,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  login: async (nickname: string) => {
    try {
      set({ error: null });
      const response: GuestLoginResponse = await guestLogin(nickname);
      const { user, token } = response;
      setAuthToken(token);
      set({
        user: {
          id: user.id,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          rating: user.rating,
          gamesPlayed: user.gamesPlayed,
          wins: user.wins,
        },
        token,
      });
      socketService.connect(token);
      get().setupSocketListeners();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05d4\u05ea\u05d7\u05d1\u05e8\u05d5\u05ea';
      set({ error: message });
      throw err;
    }
  },

  createGame: (config) => {
    socketService.emit('game:create', config);
  },

  joinGame: (gameIdOrCode: string) => {
    socketService.emit('game:join', { gameId: gameIdOrCode });
  },

  leaveGame: () => {
    socketService.emit('game:leave');
    set({ currentGame: null, answers: {}, reviewAnswers: [], roundScores: [], chatMessages: [] });
  },

  startGame: () => {
    socketService.emit('game:start');
  },

  submitAnswers: () => {
    const { answers, currentGame } = get();
    if (!currentGame) return;
    socketService.emit('game:submitAnswers', {
      gameId: currentGame.id,
      answers,
    });
  },

  callStop: () => {
    const { currentGame } = get();
    if (!currentGame) return;
    socketService.emit('game:callStop', { gameId: currentGame.id });
  },

  vote: (answerId: string, vote: 'for' | 'against') => {
    socketService.emit('game:vote', { answerId, vote });
  },

  sendChat: (message: string) => {
    const { currentGame } = get();
    if (!currentGame) return;
    socketService.emit('chat:send', {
      gameId: currentGame.id,
      text: message,
    });
  },

  joinMatchmaking: () => {
    set({ matchmakingStatus: 'searching' });
    socketService.emit('matchmaking:join');
  },

  leaveMatchmaking: () => {
    set({ matchmakingStatus: 'idle' });
    socketService.emit('matchmaking:leave');
  },

  setAnswer: (category: string, text: string) => {
    set((state) => ({
      answers: { ...state.answers, [category]: text },
    }));
  },

  clearAnswers: () => {
    set({ answers: {} });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  setConnectionStatus: (status: ConnectionStatus) => {
    set({ connectionStatus: status });
  },

  setAdFree: (value: boolean) => {
    set({ isAdFree: value });
  },

  setupSocketListeners: () => {
    const statusUnsubscribe = socketService.onStatusChange((status) => {
      set({ connectionStatus: status });
    });

    socketService.on('game:state', (data: unknown) => {
      const gameState = data as GameState;
      set({ currentGame: gameState });
    });

    socketService.on('game:created', (data: unknown) => {
      const gameState = data as GameState;
      set({ currentGame: gameState });
    });

    socketService.on('game:playerJoined', (data: unknown) => {
      const { player } = data as { player: PlayerInfo };
      set((state) => {
        if (!state.currentGame) return state;
        const exists = state.currentGame.players.some(
          (p) => p.id === player.id
        );
        if (exists) return state;
        return {
          currentGame: {
            ...state.currentGame,
            players: [...state.currentGame.players, player],
          },
        };
      });
    });

    socketService.on('game:playerLeft', (data: unknown) => {
      const { playerId } = data as { playerId: string };
      set((state) => {
        if (!state.currentGame) return state;
        return {
          currentGame: {
            ...state.currentGame,
            players: state.currentGame.players.filter(
              (p) => p.id !== playerId
            ),
          },
        };
      });
    });

    socketService.on('game:roundStart', (data: unknown) => {
      const roundData = data as {
        currentRound: number;
        currentLetter: string;
        timeRemaining: number;
      };
      set((state) => {
        if (!state.currentGame) return state;
        return {
          currentGame: {
            ...state.currentGame,
            currentRound: roundData.currentRound,
            currentLetter: roundData.currentLetter,
            timeRemaining: roundData.timeRemaining,
            phase: 'PLAYING' as GamePhase,
            stopCalledBy: null,
          },
          answers: {},
          reviewAnswers: [],
          roundScores: [],
        };
      });
    });

    socketService.on('game:timerUpdate', (data: unknown) => {
      const { timeRemaining } = data as { timeRemaining: number };
      set((state) => {
        if (!state.currentGame) return state;
        return {
          currentGame: {
            ...state.currentGame,
            timeRemaining,
          },
        };
      });
    });

    socketService.on('game:stopCalled', (data: unknown) => {
      const { playerId, timeRemaining } = data as {
        playerId: string;
        timeRemaining: number;
      };
      set((state) => {
        if (!state.currentGame) return state;
        return {
          currentGame: {
            ...state.currentGame,
            phase: 'STOPPED' as GamePhase,
            stopCalledBy: playerId,
            timeRemaining,
          },
        };
      });
    });

    socketService.on('game:roundEnd', (data: unknown) => {
      set((state) => {
        if (!state.currentGame) return state;
        return {
          currentGame: {
            ...state.currentGame,
            phase: 'REVIEW' as GamePhase,
          },
        };
      });
    });

    socketService.on('game:reviewPhase', (data: unknown) => {
      const { answers } = data as { answers: Answer[] };
      set((state) => {
        if (!state.currentGame) return state;
        return {
          reviewAnswers: answers,
          currentGame: {
            ...state.currentGame,
            phase: 'REVIEW' as GamePhase,
          },
        };
      });
    });

    socketService.on('game:voteUpdate', (data: unknown) => {
      const { answerId, votesFor, votesAgainst } = data as {
        answerId: string;
        votesFor: number;
        votesAgainst: number;
      };
      set((state) => ({
        reviewAnswers: state.reviewAnswers.map((a) =>
          a.id === answerId ? { ...a, votesFor, votesAgainst } : a
        ),
      }));
    });

    socketService.on('game:roundResults', (data: unknown) => {
      const { scores } = data as { scores: RoundScore[] };
      set((state) => {
        if (!state.currentGame) return state;
        return {
          roundScores: scores,
          currentGame: {
            ...state.currentGame,
            phase: 'ROUND_RESULTS' as GamePhase,
            players: state.currentGame.players.map((p) => {
              const playerScore = scores.find((s) => s.playerId === p.id);
              if (playerScore) {
                return { ...p, score: playerScore.gameTotal };
              }
              return p;
            }),
          },
        };
      });
      // Show interstitial ad between rounds
      showInterstitial();
    });

    socketService.on('game:finished', (data: unknown) => {
      set((state) => {
        if (!state.currentGame) return state;
        return {
          currentGame: {
            ...state.currentGame,
            phase: 'FINISHED' as GamePhase,
          },
        };
      });
      // Show interstitial ad after game ends
      showInterstitial();
    });

    socketService.on('chat:message', (data: unknown) => {
      const message = data as ChatMessage;
      set((state) => ({
        chatMessages: [...state.chatMessages, message],
      }));
    });

    socketService.on('matchmaking:found', (data: unknown) => {
      const { gameId } = data as { gameId: string };
      set({ matchmakingStatus: 'found' });
      // The game state will come via game:state
    });

    socketService.on('error', (data: unknown) => {
      const { message } = data as { message: string };
      set({ error: message });
    });
  },

  cleanupSocketListeners: () => {
    socketService.off('game:state');
    socketService.off('game:created');
    socketService.off('game:playerJoined');
    socketService.off('game:playerLeft');
    socketService.off('game:roundStart');
    socketService.off('game:timerUpdate');
    socketService.off('game:stopCalled');
    socketService.off('game:roundEnd');
    socketService.off('game:reviewPhase');
    socketService.off('game:voteUpdate');
    socketService.off('game:roundResults');
    socketService.off('game:finished');
    socketService.off('chat:message');
    socketService.off('matchmaking:found');
    socketService.off('error');
  },

  reset: () => {
    get().cleanupSocketListeners();
    socketService.disconnect();
    setAuthToken(null);
    set(initialState);
  },
}));
