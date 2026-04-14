import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
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

const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  'http://149.102.129.143:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

const io = new SocketServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
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

// Middleware
app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'x-admin-token'],
  maxAge: 600, // preflight cache 10 minutes
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(globalLimiter);

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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io connection handler
const ALPHANUMERIC_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('subscribe:team', (symbol: unknown) => {
    if (typeof symbol !== 'string' || !ALPHANUMERIC_PATTERN.test(symbol)) {
      socket.emit('error', { message: 'Invalid team symbol format' });
      return;
    }
    const sanitized = symbol.toUpperCase();
    socket.join(`team:${sanitized}`);
    console.log(`[Socket] ${socket.id} subscribed to team:${sanitized}`);
  });

  socket.on('subscribe:match', (matchId: unknown) => {
    if (typeof matchId !== 'string' || !ALPHANUMERIC_PATTERN.test(matchId)) {
      socket.emit('error', { message: 'Invalid match ID format' });
      return;
    }
    socket.join(`match:${matchId}`);
    console.log(`[Socket] ${socket.id} subscribed to match:${matchId}`);
  });

  socket.on('subscribe:fanwar', (matchId: unknown) => {
    if (typeof matchId !== 'string' || !ALPHANUMERIC_PATTERN.test(matchId)) {
      socket.emit('error', { message: 'Invalid match ID format' });
      return;
    }
    socket.join(`fanwar:${matchId}`);
    console.log(`[Socket] ${socket.id} subscribed to fanwar:${matchId}`);
  });

  socket.on('subscribe:prediction', (matchId: unknown) => {
    if (typeof matchId !== 'string' || !ALPHANUMERIC_PATTERN.test(matchId)) {
      socket.emit('error', { message: 'Invalid match ID format' });
      return;
    }
    socket.join(`prediction:${matchId}`);
    console.log(`[Socket] ${socket.id} subscribed to prediction:${matchId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
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
    } else if (adminSecret === 'overflow2026') {
      console.warn('[Security] WARNING: ADMIN_SECRET is set to the known default "overflow2026". Change it immediately.');
    }

    cricketService.startPolling();

    // Emit price updates every 10 seconds
    setInterval(() => {
      priceService.emitAllPrices().catch((err) => {
        console.error('[PriceService] Failed to emit prices:', err);
      });
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

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down...');
  cricketService.stopPolling();
  await prisma.$disconnect();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Server] Shutting down...');
  cricketService.stopPolling();
  await prisma.$disconnect();
  server.close();
  process.exit(0);
});

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
