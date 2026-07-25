import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

// Initialize Socket.io client. Set autoConnect false to connect manually when user signs in.
export const socket: Socket = io(BACKEND_URL, {
  autoConnect: false,
  transports: ['websocket'],
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});
export function getBackendUrl() {
  return BACKEND_URL;
}
