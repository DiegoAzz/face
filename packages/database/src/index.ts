import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

export enum Role {
  SUPERADMIN = 'SUPERADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  EDITOR = 'EDITOR',
  OPERATOR = 'OPERATOR',
  AUDITOR = 'AUDITOR',
}

export enum DraftStatus {
  DISCOVERED = 'DISCOVERED',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  PUBLISHING = 'PUBLISHING',
  PUBLISHED = 'PUBLISHED',
  FAILED_RETRYABLE = 'FAILED_RETRYABLE',
  FAILED_FINAL = 'FAILED_FINAL',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  SINGLE_SOURCE = 'SINGLE_SOURCE',
  CORROBORATED = 'CORROBORATED',
  DISPUTED = 'DISPUTED',
}

export enum NewsSourceType {
  RSS = 'RSS',
  LICENSED_API = 'LICENSED_API',
}

let prismaInstance: PrismaClient | null = null;

export function getDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL;
  if (!envUrl || envUrl.includes('localhost:5432') || envUrl.startsWith('postgresql://postgres:postgres@localhost')) {
    return 'file:/app/data/newsflow.db';
  }
  return envUrl;
}

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    const dbUrl = getDatabaseUrl();
    process.env.DATABASE_URL = dbUrl;

    prismaInstance = new PrismaClient({
      datasources: {
        db: { url: dbUrl },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prismaInstance;
}

export const prisma = getPrismaClient();
