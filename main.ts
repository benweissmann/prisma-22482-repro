import { PrismaClient } from "@prisma/client";

async function runTest(
  name: string,
  fn: (p: PrismaClient) => Promise<void>,
  { preparedStatementCache = true }: { preparedStatementCache?: boolean } = {}
) {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url:
          process.env.DATABASE_URL +
          "&statement_cache_size=" +
          (preparedStatementCache ? "100" : "0"),
      },
    },
  });
  await prisma.user.deleteMany();

  console.log(`\n\nTest: ${name}`);
  try {
    await fn(prisma);
    console.log("  success");
    console.log(await prisma.user.findMany());
  } catch (e) {
    console.log("  failure");
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

async function insertNulls(prisma: PrismaClient) {
  await prisma.$executeRaw`
    INSERT INTO "User" (email)
    SELECT
    UNNEST(${[null, null, null]}::text[])
  `;
}

async function insertValues(prisma: PrismaClient) {
  await prisma.$executeRaw`
    INSERT INTO "User" (email)
    SELECT
    UNNEST(${["a", "a", "a"]}::text[])
  `;
}

async function main() {
  await runTest("Just nulls", async (p) => {
    await insertNulls(p);
  });

  await runTest("Just values", async (p) => {
    await insertValues(p);
  });

  await runTest("Both", async (p) => {
    await insertNulls(p);
    await insertValues(p);
  });

  await runTest(
    "Both (no prepared statement cache)",
    async (p) => {
      await insertNulls(p);
      await insertValues(p);
    },
    {
      preparedStatementCache: false,
    }
  );
}

main()
  .then(() => {
    console.log("done");
  })
  .catch((err) => {
    console.error(err);
  });
