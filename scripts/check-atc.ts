import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.protocolQuestion.count();
  const atcTrue = await prisma.protocolQuestion.count({
    where: { isATC: true },
  });

  console.log(`Protocol Questions: ${total}`);
  console.log(`ATC-marked rows:   ${atcTrue}`);

  if (total === 0) {
    console.error("No PQ rows found. Seed data may be missing.");
    process.exit(1);
  }

  if (atcTrue === 0) {
    console.error(
      "ATC check failed: isATC is 0 for all rows. Run `npm run db:seed:static`."
    );
    process.exit(1);
  }

  console.log("ATC check passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
