"use client";
import { io, Socket } from "socket.io-client";

// Socket.io needs direct connection — can't proxy through Next.js rewrites
// On HTTPS (Vercel), skip WebSocket entirely — data loads via REST polling
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Detect if we're on HTTPS (Vercel) where ws:// would be blocked as mixed content
const isSecureContext = typeof window !== "undefined" && window.location.protocol === "https:";
const backendIsInsecure = API_URL.startsWith("http://");

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // If HTTPS frontend + HTTP backend, disable socket to avoid mixed content errors
    if (isSecureContext && backendIsInsecure) {
      // Create a dummy socket that never connects — pages fall back to REST polling
      socket = io(API_URL, {
        autoConnect: false,
        reconnection: false,
      });
    } else {
      socket = io(API_URL, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 10,
        autoConnect: true,
      });
    }
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
