# NHVPL — New Haven Pickleball League Portal

Full-stack registration and payment portal for the New Haven Pickleball League. Built with Next.js 14, TypeScript, Prisma, Supabase (PostgreSQL), Stripe, and PayPal.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL via Supabase
- **ORM:** Prisma
- **Auth:** NextAuth.js v5
- **Payments:** Stripe + PayPal
- **Email:** Resend
- **Validation:** Zod + React Hook Form
- **Charts:** Recharts

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Settings > Database** and copy the connection string
3. Copy `.env.example` to `.env.local` and fill in your `DATABASE_URL`

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`. At minimum you need:
- `DATABASE_URL` — your Supabase PostgreSQL connection string
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev

### 4. Set up the database

```bash
npm run db:push      # Push schema to Supabase
npm run db:seed      # Create your admin account
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
  app/
    page.tsx                          # Landing page
    register/                         # Public registration flow
      page.tsx                        # Event selection
      [eventId]/page.tsx              # Registration form
      [eventId]/payment/page.tsx      # Payment step
    confirmation/[registrationId]/    # Success page
    admin/                            # Protected admin area
      login/page.tsx
      dashboard/page.tsx
      events/page.tsx
      registrants/page.tsx
    api/                              # API routes
      register/                       # POST — create registration
      events/active/                  # GET — active events
      payments/stripe/                # Stripe checkout
      payments/paypal/                # PayPal checkout
      webhooks/                       # Payment webhooks
      admin/                          # Protected admin APIs
  lib/
    prisma.ts                         # DB client
    stripe.ts                         # Stripe client
    email.ts                          # Email client
    validations.ts                    # Zod schemas
    utils.ts                          # Helpers
  auth.ts                             # NextAuth config
  middleware.ts                       # Route protection
prisma/
  schema.prisma                       # Database schema
  seed.ts                             # Admin user seeder
```

## Setting Up Payments

### Stripe
1. Create an account at [stripe.com](https://stripe.com)
2. Get your test API keys from the Dashboard
3. Set up a webhook endpoint pointing to `/api/webhooks/stripe`
4. Add keys to `.env.local`

### PayPal
1. Create a developer account at [developer.paypal.com](https://developer.paypal.com)
2. Create a sandbox app and get client ID + secret
3. Add keys to `.env.local`

## Deployment

### Vercel (recommended)
1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.example`
4. Deploy

### Custom Domain
Add your domain (e.g., `register.nhvpickleball.com`) in Vercel project settings, then update DNS with your domain provider.
