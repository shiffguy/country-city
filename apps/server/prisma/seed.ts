import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const DICTIONARY_DIR = path.join(__dirname, '..', 'src', 'data', 'dictionary');

const DICTIONARY_FILES: Record<string, string> = {
  countries: 'countries.json',
  cities: 'cities.json',
  animals: 'animals.json',
  plants: 'plants.json',
  names: 'names.json',
  professions: 'professions.json',
  general: 'general.json',
};

function loadDictionaryFile(filename: string): string[] {
  const filePath = path.join(DICTIONARY_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`  [Skip] File not found: ${filename}`);
      return [];
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`  [Skip] Not an array: ${filename}`);
      return [];
    }
    return parsed as string[];
  } catch (err) {
    console.error(`  [Error] Loading ${filename}:`, (err as Error).message);
    return [];
  }
}

async function main(): Promise<void> {
  console.log('=== Eretz Ir Database Seed ===\n');

  // Log dictionary counts
  console.log('Dictionary files:');
  let totalWords = 0;
  for (const [category, filename] of Object.entries(DICTIONARY_FILES)) {
    const words = loadDictionaryFile(filename);
    const uniqueWords = new Set(words);
    console.log(`  ${category}: ${uniqueWords.size} unique words (${words.length} total entries)`);
    totalWords += uniqueWords.size;
  }
  console.log(`  Total unique words across all categories: ${totalWords}\n`);

  // Create test user for development
  console.log('Creating test user...');
  const testUser = await prisma.user.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {
      nickname: 'TestPlayer',
      rating: 1200,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nickname: 'TestPlayer',
      rating: 1200,
      gamesPlayed: 10,
      wins: 5,
    },
  });

  console.log(`  Created test user: ${testUser.nickname} (${testUser.id})`);

  // Create a second test user
  const testUser2 = await prisma.user.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {
      nickname: 'TestPlayer2',
      rating: 1100,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      nickname: 'TestPlayer2',
      rating: 1100,
      gamesPlayed: 5,
      wins: 2,
    },
  });

  console.log(`  Created test user: ${testUser2.nickname} (${testUser2.id})`);

  console.log('\n=== Seed completed successfully ===');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
