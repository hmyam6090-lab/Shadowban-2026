import 'dotenv/config';

async function main(): Promise<void> {
  console.log('Prisma seed placeholder: content is loaded from packages/game-data for the MVP.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});