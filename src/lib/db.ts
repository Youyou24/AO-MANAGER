import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createPrisma() {
  const url =
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/appels_offres";
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  __prismaClient?: ReturnType<typeof createPrisma>;
};

export const db = globalForPrisma.__prismaClient ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prismaClient = db;
}
