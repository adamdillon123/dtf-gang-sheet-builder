# DTF Gang Sheet + Singles + Library

Standalone Next.js 14 app for building DTF gang sheets, ordering single transfers, and managing a design library.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template:

```bash
cp .env.example .env
```

3. Start Postgres via Docker:

```bash
docker compose up -d
```

4. Run Prisma migrations + seed data:

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

5. Start the dev server:

```bash
npm run dev
```

## Environment Variables

See `.env.example` for required values.

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `SESSION_SECRET`
- `S3_BUCKET`
- `S3_REGION`
- `S3_ENDPOINT` (for Cloudflare R2 or other S3-compatible providers)
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE` (set to `true` for MinIO)
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

## Commands

- `npm run dev` - start development server
- `npm run build` - build for production
- `npm run start` - run production server
- `npm run test` - run Vitest unit tests
- `npm run lint` - lint code
- `npm run format` - format code

## Deployment

This app is Vercel-friendly. Provide the environment variables above and configure your database + S3 storage. Run `npx prisma migrate deploy` as part of your deploy pipeline.

## Seeded Admin

Default credentials (override via env vars):

- Email: `admin@example.com`
- Password: `admin123`

## Notes

- Gang sheets export at 300 DPI (22.5" width => 6750px).
- Singles batching uses a shelf algorithm and exports transparent PNGs for print.
