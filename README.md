# LinkedIn Automation MVP

Warm outbound LinkedIn automation platform. Capture profile viewers, qualify leads, generate AI-powered personalized messages, and automate connection requests.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Monorepo | Turborepo + pnpm |
| Frontend | Next.js 15 + shadcn/ui |
| Backend | Next.js API Routes |
| Database | Neon PostgreSQL + Drizzle ORM |
| Auth | Clerk |
| LinkedIn API | Unipile (Phase 2) |
| AI | Vercel AI SDK + Claude (Phase 2) |

## Prerequisites

- Node.js 20+ (see `.nvmrc`)
- pnpm 9.15.0+ (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- Neon PostgreSQL account
- Clerk account

## Getting Started

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd linkedin-automation
   pnpm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example apps/web/.env.local
   ```

   Fill in the values:
   - **Neon**: Get connection strings from [Neon Console](https://console.neon.tech)
     - `DATABASE_URL` = Pooled connection (use for runtime)
     - `DATABASE_URL_DIRECT` = Direct connection (use for migrations)
   - **Clerk**: Get keys from [Clerk Dashboard](https://dashboard.clerk.com)

3. **Run database migrations**
   ```bash
   pnpm db:generate   # Generate migration files
   pnpm db:migrate    # Apply to database
   ```

4. **Start development server**
   ```bash
   pnpm dev
   ```

5. **Open** http://localhost:3000

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Run TypeScript checks |
| `pnpm test` | Run unit/integration tests |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply migrations to database |
| `pnpm db:push` | Push schema directly (dev only) |

## Testing

The project uses Vitest for unit/integration tests and Playwright for E2E tests.

### Unit & Integration Tests

```bash
# Run all tests
pnpm test

# Run with coverage report
pnpm test:coverage

# Watch mode for development
pnpm --filter web test:watch
```

Test files are located in `apps/web/__tests__/` and follow the pattern `*.test.ts` or `*.test.tsx`.

### E2E Tests

```bash
# Run headless
pnpm test:e2e

# Interactive mode
pnpm test:e2e:ui
```

E2E tests require the app to be running. They're located in `apps/web/e2e/`.

For authenticated E2E tests, set:
- `E2E_CLERK_USER_EMAIL` - Test user email
- `E2E_CLERK_USER_PASSWORD` - Test user password

### CI Pipeline

Tests run automatically on push/PR via GitHub Actions:
- Unit tests with coverage reporting
- Linting and type checking
- E2E tests (on main/staging branches)

## Project Structure

```
linkedin-automation/
├── apps/
│   └── web/                  # Next.js 15 application
│       ├── app/              # App Router pages
│       ├── components/       # React components
│       └── lib/db/           # Drizzle schema + queries
├── packages/
│   └── shared/               # Shared types + constants
├── docs/                     # Architecture documentation
├── drizzle/                  # Migration files
├── drizzle.config.ts         # Drizzle Kit config
└── turbo.json                # Turborepo config
```

## Database URLs Explained

Neon provides two connection types:

| Type | Variable | Use Case |
|------|----------|----------|
| Pooled | `DATABASE_URL` | App runtime queries (faster, connection reuse) |
| Direct | `DATABASE_URL_DIRECT` | Migrations (drizzle-kit requires direct connection) |

Always use the **pooled** connection (`-pooler` in hostname) for your app, and **direct** for migrations.

## Documentation

See `/docs/` for detailed architecture:

- [MVP Overview](docs/mvp-overview.md) - Feature scope and strategy
- [Architecture Decisions](docs/architecture-decisions.md) - Tech stack rationale
- [Database Schema](docs/database-schema.md) - Full Drizzle schema
- [Unipile Integration](docs/unipile-integration.md) - LinkedIn API guide
- [Build Epics](docs/epics.md) - Implementation roadmap

## License

Private - All rights reserved
