import { PrismaClient, type Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function hasProtocolOwnerDelegate(client: PrismaClient | undefined): client is PrismaClient {
  return Boolean(client && 'protocolOwner' in client);
}

const prismaClient = hasProtocolOwnerDelegate(globalForPrisma.prisma)
  ? globalForPrisma.prisma
  : new PrismaClient();

export const prisma = prismaClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export type PrismaTx = Prisma.TransactionClient;

export async function withTransaction<T>(fn: (tx: PrismaTx) => Promise<T>) {
  return prisma.$transaction((tx) => fn(tx));
}
