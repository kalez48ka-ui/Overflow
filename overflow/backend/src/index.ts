import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import http from 'http';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { Server as SocketServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { PriceService } from './modules/price/price.service';
import { CricketDataService } from './modules/cricket/cricket-data.service';
import { VaultService } from './modules/vault/vault.service';
import { OracleService } from './modules/oracle/oracle.service';
import { createTeamsRouter } from './routes/teams';
import { createTradesRouter } from './routes/trades';
import { createMatchesRouter } from './routes/matches';
import { createPortfolioRouter } from './routes/portfolio';
import { createVaultRouter } from './routes/vault';
import { createAiRouter } from './routes/ai';
import { createAdminRouter } from './routes/admin';
import { createLeaderboardRouter } from './routes/leaderboard';
import { FanWarsService } from './modules/fanwars/fanwars.service';
import { createFanWarsRouter } from './routes/fanwars';
import { PredictionsService } from './modules/predictions/predictions.service';
import { createPredictionsRouter } from './routes/predictions';
import { ChainSyncService } from './modules/sync/chain-sync.service';

const prisma = new PrismaClient();
let chainSyncInstance: ChainSyncService | null = null;

const app = express();
app.set('trust proxy', 1); // Trust first proxy for X-Forwarded-For (rate limiter + brute-force IP tracking)
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

const io = new SocketServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
  maxHttpBufferSize: 1e6,      // 1 MB max message size
  pingTimeout: 20000,
  pingInterval: 25000,
});

// Connection limiter — reject new sockets beyond threshold
const MAX_SOCKET_CONNECTIONS = 500;
let activeSocketCount = 0;

io.use((socket, next) => {
  if (activeSocketCount >= MAX_SOCKET_CONNECTIONS) {
    console.warn(`[Socket] Connection rejected — limit reached (${MAX_SOCKET_CONNECTIONS})`);
    return next(new Error('Server at capacity, please retry later'));
  }
  activeSocketCount++;
  socket.on('disconnect', () => {
    activeSocketCount--;
  });
  next();
});

// Rate limiters
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const tradesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trade rate limit exceeded, please wait before submitting more trades' },
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Admin rate limit exceeded' },
});

// Serve static presentation files
app.use('/presentation', express.static(path.join(__dirname, '../public'), { dotfiles: 'deny', index: false }));

// Middleware
app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'x-admin-token'],
  maxAge: 600, // preflight cache 10 minutes
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(globalLimiter);

// X-Request-ID for request tracing
app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', requestId);
  req.requestId = requestId;
  next();
});

// Request timeout — prevent slow upstream calls from tying up connections
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  next();
});

// Enforce JSON content type on state-mutating requests (CSRF mitigation)
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !req.is('application/json')) {
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  next();
});

// Services
const priceService = new PriceService(prisma);
priceService.setSocket(io);

const vaultService = new VaultService(prisma);
vaultService.setSocket(io);

const fanWarsService = new FanWarsService(prisma);
fanWarsService.setSocket(io);

const predictionsService = new PredictionsService(prisma);
predictionsService.setSocket(io);

const cricketService = new CricketDataService(prisma);
cricketService.setSocket(io);
cricketService.setFanWarsService(fanWarsService);

const oracleService = new OracleService(prisma, vaultService, fanWarsService);
oracleService.setSocket(io);

// Routes (with per-path rate limiters for sensitive endpoints)
app.use('/api/teams', createTeamsRouter(prisma, priceService));
app.use('/api/trades', tradesLimiter, createTradesRouter(prisma, priceService, vaultService, io));
app.use('/api/matches', createMatchesRouter(cricketService));
app.use('/api/portfolio', createPortfolioRouter(prisma));
app.use('/api/vault', createVaultRouter(vaultService));
app.use('/api/ai', createAiRouter(prisma));
app.use('/api/admin', adminLimiter, createAdminRouter(prisma, oracleService, vaultService));
app.use('/api/leaderboard', createLeaderboardRouter(prisma));
app.use('/api/fanwars', createFanWarsRouter(fanWarsService));
app.use('/api/predictions', createPredictionsRouter(predictionsService));

// Health check with DB connectivity verification
app.get('/api/health', async (_req, res) => {
  const dbOk = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
  const status = dbOk ? 'ok' : 'degraded';
  res.status(dbOk ? 200 : 503).json({
    status,
    db: dbOk,
    timestamp: new Date().toISOString(),
  });
});

// Socket.io connection handler
const ALPHANUMERIC_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

io.on('connection', (socket) => {
  // Connection logging disabled in production to reduce I/O

  socket.on('subscribe:team', (symbol: unknown) => {
    if (typeof symbol !== 'string' || !ALPHANUMERIC_PATTERN.test(symbol)) {
      socket.emit('error', { message: 'Invalid team symbol format' });
      return;
    }
    const sanitized = symbol.toUpperCase();
    socket.join(`team:${sanitized}`);
    // verbose logging removed for production
  });

  socket.on('subscribe:match', (matchId: unknown) => {
    if (typeof matchId !== 'string' || !ALPHANUMERIC_PATTERN.test(matchId)) {
      socket.emit('error', { message: 'Invalid match ID format' });
      return;
    }
    socket.join(`match:${matchId}`);
    // verbose logging removed for production
  });

  socket.on('subscribe:fanwar', (matchId: unknown) => {
    if (typeof matchId !== 'string' || !ALPHANUMERIC_PATTERN.test(matchId)) {
      socket.emit('error', { message: 'Invalid match ID format' });
      return;
    }
    socket.join(`fanwar:${matchId}`);
    // verbose logging removed for production
  });

  socket.on('subscribe:vault', () => {
    socket.join('vault:subscribers');
  });

  socket.on('subscribe:markets', () => {
    socket.join('markets');
    // verbose logging removed for production
  });

  socket.on('subscribe:prediction', (matchId: unknown) => {
    if (typeof matchId !== 'string' || !ALPHANUMERIC_PATTERN.test(matchId)) {
      socket.emit('error', { message: 'Invalid match ID format' });
      return;
    }
    socket.join(`prediction:${matchId}`);
    // verbose logging removed for production
  });

  socket.on('disconnect', () => {
    // verbose logging removed for production
  });
});

// Start server
async function bootstrap(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('[Database] Connected to PostgreSQL');

    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) {
      console.warn('[Security] WARNING: ADMIN_SECRET is not set. Admin panel will be inaccessible.');
    }

    cricketService.startPolling();

    // Start on-chain event sync (non-blocking — retries internally if RPC is down)
    chainSyncInstance = new ChainSyncService(prisma, priceService, vaultService, io);
    chainSyncInstance.start().catch((err) => {
      console.error('[ChainSync] Failed to start:', err);
    });

    // Emit price updates every 10 seconds (only when clients are subscribed)
    setInterval(() => {
      const hasSubscribers = io.sockets.adapter.rooms.get('markets')?.size ?? 0;
      const hasTeamSubs = Array.from(io.sockets.adapter.rooms.keys()).some(r => r.startsWith('team:'));
      if (hasSubscribers > 0 || hasTeamSubs) {
        priceService.emitAllPrices().catch((err) => {
          console.error('[PriceService] Failed to emit prices:', err);
        });
      }
    }, 10000);

    server.listen(config.port, () => {
      console.log(`[Server] Overflow backend running on port ${config.port}`);
      console.log(`[Server] API: http://localhost:${config.port}/api`);
      console.log(`[Server] WebSocket: ws://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

// Graceful shutdown — drain connections before exit
function gracefulShutdown(signal: string): void {
  console.log(`\n[Server] ${signal} received — shutting down gracefully...`);
  cricketService.stopPolling();
  if (chainSyncInstance) chainSyncInstance.stop();

  // Close Socket.io connections first
  io.close();

  // Stop accepting new HTTP connections and drain existing ones
  server.close(async () => {
    console.log('[Server] All connections drained');
    await prisma.$disconnect();
    process.exit(0);
  });

  // Force exit after 10s if draining takes too long
  setTimeout(() => {
    console.error('[Server] Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
  // Give logs time to flush, then exit so PM2/supervisor can restart
  setTimeout(() => process.exit(1), 1000);
});

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
  process.exit(1);
});

bootstrap();
