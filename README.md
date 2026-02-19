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
npx typeorm -d dist/database/data-source.js migration:generate -n InitialMigration
```

Run migrations:

```bash
npx typeorm -d dist/database/data-source.js migration:run
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

**Tests**

- Unit tests: `npm run test`
- E2E tests: `npm run test:e2e`

Notes for test runs

- Jest / ts-jest may run the app in TypeScript context and require path-mapping to resolve `src/*` imports. If you get module-not-found for `src/...`, ensure `test/jest-e2e.json` (or your Jest config) includes `moduleNameMapper` mapping, e.g.:

```json
{ "^src/(.*)$": "<rootDir>/src/$1" }
```

- Database for tests: if e2e tests fail with "Driver not connected" or "No metadata for \"User\" was found", either configure a test database via `.env` (run migrations before tests) or run tests against an in-memory DB by setting `NODE_ENV=test` and adjusting `src/database/data-source.ts` to use SQLite for tests (synchronize: true).

- Some e2e tests perform DB operations and may need increased Jest timeouts. You can call `jest.setTimeout(20000)` in test setup or increase per-test timeouts.

**Key files to inspect**

- [src/database/data-source.ts](src/database/data-source.ts)
- [test/jest-e2e.json](test/jest-e2e.json)
- [package.json](package.json)

If you'd like, I can:

- Run the e2e tests and report current failures, or
- Add a test-only in-memory DB config and re-run tests.

Choose which follow-up you want next.
