import { io, Socket } from 'socket.io-client';

const DEFAULT_SERVER_URL = 'http://localhost:3000';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
type StatusListener = (status: ConnectionStatus) => void;

class SocketService {
  private socket: Socket | null = null;
  private serverUrl: string = DEFAULT_SERVER_URL;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private statusListeners: Set<StatusListener> = new Set();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private baseDelay: number = 1000;

  setServerUrl(url: string): void {
    this.serverUrl = url;
  }

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.disconnect();

    this.socket = io(this.serverUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.baseDelay,
      reconnectionDelayMax: 30000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.setConnectionStatus('connected');
    });

    this.socket.on('disconnect', (reason: string) => {
      this.setConnectionStatus('disconnected');
      if (reason === 'io server disconnect') {
        // Server intentionally disconnected, don't auto-reconnect
        return;
      }
    });

    this.socket.on('reconnect_attempt', () => {
      this.reconnectAttempts++;
      this.setConnectionStatus('reconnecting');
    });

    this.socket.on('reconnect', () => {
      this.reconnectAttempts = 0;
      this.setConnectionStatus('connected');
    });

    this.socket.on('reconnect_failed', () => {
      this.setConnectionStatus('disconnected');
    });

    this.socket.on('connect_error', (error: Error) => {
      console.warn('[Socket] Connection error:', error.message);
      this.setConnectionStatus('disconnected');
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.reconnectAttempts = 0;
    this.setConnectionStatus('disconnected');
  }

  emit(event: string, data?: unknown): void {
    if (!this.socket?.connected) {
      console.warn(`[Socket] Cannot emit "${event}": not connected`);
      return;
    }
    this.socket.emit(event, data);
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.socket) {
      console.warn(`[Socket] Cannot listen to "${event}": no socket`);
      return;
    }
    this.socket.on(event, callback);
  }

  off(event: string, callback?: (...args: unknown[]) => void): void {
    if (!this.socket) {
      return;
    }
    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.connectionStatus === 'connected';
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.warn('[Socket] Status listener error:', err);
      }
    });
  }
}

export const socketService = new SocketService();
export type { ConnectionStatus };
