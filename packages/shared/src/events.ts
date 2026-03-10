import {
  GameState,
  GameConfig,
  GamePlayer,
  Answer,
  AnswerStatus,
  VoteType,
  ChatMessage,
  RoundResults,
  PlayerScore,
} from './types';

// ============================================================
// Event Name Constants
// ============================================================

/** Events emitted by the server to clients */
export const SERVER_EVENTS = {
  // Connection
  CONNECTED: 'server:connected',
  ERROR: 'server:error',

  // Game lifecycle
  GAME_CREATED: 'server:game:created',
  GAME_UPDATED: 'server:game:updated',
  GAME_STATE: 'server:game:state',
  GAME_ENDED: 'server:game:ended',

  // Player events
  PLAYER_JOINED: 'server:player:joined',
  PLAYER_LEFT: 'server:player:left',
  PLAYER_KICKED: 'server:player:kicked',

  // Round events
  ROUND_STARTED: 'server:round:started',
  ROUND_STOPPED: 'server:round:stopped',
  ROUND_RESULTS: 'server:round:results',
  TIME_UPDATE: 'server:time:update',

  // Answer events
  ANSWER_SUBMITTED: 'server:answer:submitted',
  ANSWER_UPDATED: 'server:answer:updated',
  ANSWERS_REVEALED: 'server:answers:revealed',

  // Voting events
  VOTE_PHASE_STARTED: 'server:vote:started',
  VOTE_RECEIVED: 'server:vote:received',
  VOTE_RESULTS: 'server:vote:results',

  // Chat
  CHAT_MESSAGE: 'server:chat:message',

  // Matchmaking
  MATCHMAKING_FOUND: 'server:matchmaking:found',
  MATCHMAKING_UPDATE: 'server:matchmaking:update',
} as const;

/** Events emitted by clients to the server */
export const CLIENT_EVENTS = {
  // Game lifecycle
  CREATE_GAME: 'client:game:create',
  JOIN_GAME: 'client:game:join',
  LEAVE_GAME: 'client:game:leave',
  START_GAME: 'client:game:start',
  KICK_PLAYER: 'client:player:kick',

  // Round actions
  SUBMIT_ANSWER: 'client:answer:submit',
  CALL_STOP: 'client:round:stop',

  // Voting
  CAST_VOTE: 'client:vote:cast',

  // Chat
  SEND_CHAT: 'client:chat:send',

  // Matchmaking
  JOIN_MATCHMAKING: 'client:matchmaking:join',
  LEAVE_MATCHMAKING: 'client:matchmaking:leave',

  // Reconnection
  RECONNECT: 'client:reconnect',
} as const;

// ============================================================
// Server Event Payloads
// ============================================================

export interface ServerConnectedPayload {
  userId: string;
  socketId: string;
}

export interface ServerErrorPayload {
  code: string;
  message: string;
}

export interface GameCreatedPayload {
  gameId: string;
  inviteCode?: string;
  gameState: GameState;
}

export interface GameUpdatedPayload {
  gameState: GameState;
}

export interface GameStatePayload {
  gameState: GameState;
}

export interface GameEndedPayload {
  gameId: string;
  finalScores: PlayerScore[];
  winnerId: string;
}

export interface PlayerJoinedPayload {
  player: GamePlayer;
  playerCount: number;
}

export interface PlayerLeftPayload {
  userId: string;
  nickname: string;
  playerCount: number;
}

export interface PlayerKickedPayload {
  userId: string;
  nickname: string;
  reason: string;
}

export interface RoundStartedPayload {
  round: number;
  letter: string;
  timeRemaining: number;
  categories: string[];
}

export interface RoundStoppedPayload {
  stoppedByUserId: string;
  stoppedByNickname: string;
  timeRemaining: number;
}

export interface RoundResultsPayload {
  results: RoundResults;
}

export interface TimeUpdatePayload {
  timeRemaining: number;
}

export interface AnswerSubmittedPayload {
  userId: string;
  category: string;
}

export interface AnswerUpdatedPayload {
  answer: Answer;
}

export interface AnswersRevealedPayload {
  round: number;
  answers: Answer[];
}

export interface VotePhaseStartedPayload {
  answers: Answer[];
  timeRemaining: number;
}

export interface VoteReceivedPayload {
  answerId: string;
  approveCount: number;
  rejectCount: number;
}

export interface VoteResultsPayload {
  answers: Answer[];
}

export interface ChatMessagePayload {
  chatMessage: ChatMessage;
}

export interface MatchmakingFoundPayload {
  gameId: string;
}

export interface MatchmakingUpdatePayload {
  playersInQueue: number;
  estimatedWait: number;
}

// ============================================================
// Client Event Payloads
// ============================================================

export interface CreateGamePayload {
  config: GameConfig;
}

export interface JoinGamePayload {
  gameId?: string;
  inviteCode?: string;
}

export interface LeaveGamePayload {
  gameId: string;
}

export interface StartGamePayload {
  gameId: string;
}

export interface KickPlayerPayload {
  gameId: string;
  userId: string;
}

export interface SubmitAnswerPayload {
  gameId: string;
  round: number;
  category: string;
  answerText: string;
}

export interface CallStopPayload {
  gameId: string;
}

export interface CastVotePayload {
  answerId: string;
  vote: VoteType;
}

export interface SendChatPayload {
  gameId: string;
  message: string;
}

export interface JoinMatchmakingPayload {
  categories?: string[];
}

export interface LeaveMatchmakingPayload {}

export interface ReconnectPayload {
  gameId: string;
  userId: string;
}

// ============================================================
// Event Maps (for type-safe event handling)
// ============================================================

export interface ServerEventMap {
  [SERVER_EVENTS.CONNECTED]: ServerConnectedPayload;
  [SERVER_EVENTS.ERROR]: ServerErrorPayload;
  [SERVER_EVENTS.GAME_CREATED]: GameCreatedPayload;
  [SERVER_EVENTS.GAME_UPDATED]: GameUpdatedPayload;
  [SERVER_EVENTS.GAME_STATE]: GameStatePayload;
  [SERVER_EVENTS.GAME_ENDED]: GameEndedPayload;
  [SERVER_EVENTS.PLAYER_JOINED]: PlayerJoinedPayload;
  [SERVER_EVENTS.PLAYER_LEFT]: PlayerLeftPayload;
  [SERVER_EVENTS.PLAYER_KICKED]: PlayerKickedPayload;
  [SERVER_EVENTS.ROUND_STARTED]: RoundStartedPayload;
  [SERVER_EVENTS.ROUND_STOPPED]: RoundStoppedPayload;
  [SERVER_EVENTS.ROUND_RESULTS]: RoundResultsPayload;
  [SERVER_EVENTS.TIME_UPDATE]: TimeUpdatePayload;
  [SERVER_EVENTS.ANSWER_SUBMITTED]: AnswerSubmittedPayload;
  [SERVER_EVENTS.ANSWER_UPDATED]: AnswerUpdatedPayload;
  [SERVER_EVENTS.ANSWERS_REVEALED]: AnswersRevealedPayload;
  [SERVER_EVENTS.VOTE_PHASE_STARTED]: VotePhaseStartedPayload;
  [SERVER_EVENTS.VOTE_RECEIVED]: VoteReceivedPayload;
  [SERVER_EVENTS.VOTE_RESULTS]: VoteResultsPayload;
  [SERVER_EVENTS.CHAT_MESSAGE]: ChatMessagePayload;
  [SERVER_EVENTS.MATCHMAKING_FOUND]: MatchmakingFoundPayload;
  [SERVER_EVENTS.MATCHMAKING_UPDATE]: MatchmakingUpdatePayload;
}

export interface ClientEventMap {
  [CLIENT_EVENTS.CREATE_GAME]: CreateGamePayload;
  [CLIENT_EVENTS.JOIN_GAME]: JoinGamePayload;
  [CLIENT_EVENTS.LEAVE_GAME]: LeaveGamePayload;
  [CLIENT_EVENTS.START_GAME]: StartGamePayload;
  [CLIENT_EVENTS.KICK_PLAYER]: KickPlayerPayload;
  [CLIENT_EVENTS.SUBMIT_ANSWER]: SubmitAnswerPayload;
  [CLIENT_EVENTS.CALL_STOP]: CallStopPayload;
  [CLIENT_EVENTS.CAST_VOTE]: CastVotePayload;
  [CLIENT_EVENTS.SEND_CHAT]: SendChatPayload;
  [CLIENT_EVENTS.JOIN_MATCHMAKING]: JoinMatchmakingPayload;
  [CLIENT_EVENTS.LEAVE_MATCHMAKING]: LeaveMatchmakingPayload;
  [CLIENT_EVENTS.RECONNECT]: ReconnectPayload;
}
