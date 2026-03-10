import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
  const url = dbUrl.startsWith("file:") ? dbUrl : `file:${dbUrl}`;
  const adapter = new PrismaLibSql({ url });
  // `as any` required: PrismaClient constructor with driver adapters uses an
  // experimental overload whose TypeScript signature does not yet match the
  // stable PrismaClient type. This is a known upstream limitation in Prisma 7.
  return new PrismaClient({ adapter, log: ["error"] } as any);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
