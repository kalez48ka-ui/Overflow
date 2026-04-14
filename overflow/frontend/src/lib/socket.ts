"use client";
import { io, Socket } from "socket.io-client";

// Socket.io needs direct connection — can't proxy through Next.js rewrites
// On HTTPS (Vercel), WebSocket won't work without WSS backend — falls back gracefully
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
