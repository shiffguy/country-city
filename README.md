# ארץ עיר — Country City Online 🌍

A multiplayer online version of the classic Israeli word game "Eretz Ir" (Country-City).

## Architecture

Monorepo with npm workspaces:

```
country-city/
├── apps/
│   ├── mobile/          # React Native Expo app
│   └── server/          # Node.js backend (Express + Socket.IO)
├── packages/
│   └── shared/          # Shared types, constants, validation
├── docker-compose.yml   # PostgreSQL + Redis
└── package.json         # Root workspace config
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Expo CLI (`npm install -g expo-cli`)

### Setup

```bash
# 1. Start databases
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Build shared package
npm run build:shared

# 4. Setup server database
cd apps/server
cp .env.example .env
npx prisma migrate dev --name init
npm run seed
cd ../..

# 5. Start server
npm run dev:server

# 6. Start mobile app (in another terminal)
npm run dev:mobile
```

## Game Rules

1. A random Hebrew letter is selected each round
2. Players fill in words starting with that letter for each category (Country, City, Animal, Plant, Name, Profession)
3. Any player can call "Stop!" — everyone gets 10 more seconds
4. Answers are validated against a Hebrew dictionary
5. Scoring: Unique valid answer = 10 pts, Shared valid answer = 5 pts, Invalid = 0 pts
6. Challenged answers go to player vote

## Tech Stack

- **Mobile**: React Native, Expo SDK 51+, Expo Router, Zustand, Socket.IO Client
- **Server**: Node.js, TypeScript, Express, Socket.IO, Prisma ORM
- **Database**: PostgreSQL 15, Redis 7
- **Shared**: TypeScript types, validation utilities, game constants
