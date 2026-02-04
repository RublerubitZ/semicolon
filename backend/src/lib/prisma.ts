import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// 연결 상태 추적
let isShuttingDown = false;

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: [
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
      ...(process.env.NODE_ENV === 'development' ? [{ level: 'query' as const, emit: 'event' as const }] : []),
    ],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// 에러 로깅 개선
prisma.$on('error' as any, (e: any) => {
  console.error('[Prisma Error]', {
    timestamp: new Date().toISOString(),
    message: e.message,
    target: e.target,
    isShuttingDown,
  });
});

prisma.$on('warn' as any, (e: any) => {
  console.warn('[Prisma Warning]', {
    timestamp: new Date().toISOString(),
    message: e.message,
    target: e.target,
  });
});

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as any, (e: any) => {
    console.log('[Prisma Query]', {
      query: e.query,
      duration: `${e.duration}ms`,
    });
  });
}

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Graceful shutdown (shutdown 상태일 때만 disconnect)
process.on('beforeExit', async () => {
  if (!isShuttingDown) {
    isShuttingDown = true;
    console.log('[Prisma] Disconnecting on beforeExit...');
    await prisma.$disconnect();
  }
});

process.on('SIGINT', async () => {
  if (!isShuttingDown) {
    isShuttingDown = true;
    console.log('[Prisma] Disconnecting on SIGINT...');
    await prisma.$disconnect();
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  if (!isShuttingDown) {
    isShuttingDown = true;
    console.log('[Prisma] Disconnecting on SIGTERM...');
    await prisma.$disconnect();
    process.exit(0);
  }
});

export default prisma;
