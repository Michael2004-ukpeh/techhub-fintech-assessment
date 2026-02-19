# TechHub Fintech — Wallet & Payment API

This repository implements a Wallet & Payment API built with NestJS and TypeORM. The following notes explain how to set up the project, run migrations, seed data, and run tests locally.

**Prerequisites**

- Node.js >= 16
- npm
- PostgreSQL (for development/production). Tests may be configured to run against a test DB or in-memory DB.

**Environment**
Create a `.env` file in the project root with values appropriate for your environment. Example:

```env
# Database (development)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=techhub_dev
DB_USERNAME=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=3600s

# Node
NODE_ENV=development
PORT=3000
```

**Install dependencies**

```bash
npm install
```

**Build (required before TypeORM CLI using compiled data-source)**

```bash
npm run build
```

**Migrations**

Generate a migration (example — adjust data-source path if different):

```bash
# build first
npm run build

# generate migration (example)
npm run migration:generate  -- migrations/InitialMigration
```

Run migrations:

```bash
npm run migration:run
```

**Seeding**

If a seed script exists, run:

```bash
npm run seed
```

**Run (development)**

```bash
npm run dev
# or
npm run start:dev
```

**Run (production-like)**

```bash
npm run build
npm run start:prod
```
