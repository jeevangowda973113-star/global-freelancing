# Global Freelancing

**Connecting Global Talent with Opportunities.**

A responsive early-stage frontend for an international freelancing marketplace connecting clients and independent professionals.

## Current milestone

This repository contains a static, responsive marketplace homepage prototype built with HTML, CSS, and vanilla JavaScript.

### Included
- Responsive landing page for desktop and mobile
- Service category navigation
- Search and category filtering for sample listings
- Sample service cards
- Early-stage account interaction placeholder
- No framework or paid API required

### Important status
The displayed sellers and services are sample content only. This version does not yet include real accounts, identity verification, secure messaging, database storage, job posting, moderation workflows, or payments. Those features must be built and tested before the platform is used by real clients or freelancers.

## Backend foundation

The first backend milestone uses Supabase Auth + PostgreSQL with Row Level Security (RLS), and Netlify Functions for API routes.

### Setup required before the backend can run
1. Create a Supabase project.
2. Open the Supabase SQL Editor and run the complete file at [supabase/schema.sql](supabase/schema.sql).
3. In Netlify, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as environment variables. Use the project's public/anon key only; never place a service-role key in the browser or Git.
4. Deploy the repository to Netlify when ready. The health endpoint will be available at `/api/health`.

### API routes
- `GET /api/services` — list active service listings.
- `POST /api/services` — save an authenticated user's service as a draft.
- `GET /api/projects` — list open projects.
- `POST /api/projects` — save an authenticated user's project as a draft.
- `GET /api/profiles` — read the signed-in user's profile.
- `PATCH /api/profiles` — update supported profile fields.
- `GET /api/proposals` — list proposals visible to the signed-in user under RLS.
- `POST /api/proposals` — submit a proposal to an open project.
- `GET /api/conversations` — list the signed-in user's conversation memberships.
- `POST /api/conversations` — create a private two-member conversation using the database RPC.
- `GET /api/messages?conversation_id=<uuid>` — list messages in a conversation the user belongs to.
- `POST /api/messages` — send a message in a conversation the user belongs to.
- `POST /api/reports` — report exactly one profile, service, or project.
- `POST /api/health` is not supported; health is checked with `GET /api/health`.

Authenticated POST requests require `Authorization: Bearer <Supabase access token>`. API requests use the caller's token so Supabase RLS remains in force.

The schema also establishes profiles, proposals, private conversations/messages, and user-submitted reports. Those workflows still need frontend integration, abuse controls, moderator tools, and security testing. Draft records are not publicly listed.

## Run locally

Open `index.html` in a browser, or use a simple local static server.

## Deploy later with Netlify

Connect this GitHub repository to Netlify. Since this is a static site, no build command is required and the publish directory is the repository root (`.`).

Netlify Free currently includes 300 monthly credits for new credit-based accounts. Production deployments and traffic consume credits, so monitor usage in the Netlify dashboard.

## Roadmap
1. Marketplace UI and responsive foundation
2. Authentication and role-based client/freelancer profiles
3. Database-backed gigs, projects, and proposals
4. Secure messaging and reporting/moderation tools
5. Trust and verification workflows
6. Payment provider integration and dispute processes
7. Performance, accessibility, privacy, and security review before wider launch

Never put private API keys, passwords, or service-role credentials in frontend code or commit them to Git.

## Email authentication setup

The browser sign-up and sign-in form uses Supabase Auth. The Netlify function at `/api/config` exposes only the Supabase project URL and public anon key; never put a service-role key in browser code or commit it to Git.

Before deploying, add these environment variables in Netlify:

- `SUPABASE_URL`: your Supabase project URL
- `SUPABASE_ANON_KEY`: your Supabase publishable/anon public key

Then redeploy the site. In Supabase Authentication settings, configure the site URL and allowed redirect URLs to match the Netlify site URL. If email confirmation is enabled, new users must confirm their email before signing in.

The database trigger creates a basic profile after signup. This is an early authentication foundation, not a complete trust, identity-verification, payment, or moderation system.


### Backend API coverage added

The Netlify Functions now include profile read/update, proposal submission/listing, private conversation creation/listing, message read/send, and report submission. These routes use the signed-in user's Supabase access token and depend on database RLS policies for authorization. Conversation membership is created through the `start_conversation` database function; clients cannot directly insert membership rows.

This is still an MVP backend foundation. It does not yet include production rate limiting, moderator/admin review tools, file uploads, payment processing, dispute handling, anti-fraud detection, or independent penetration testing. Do not treat reports as automatically reviewed, and do not use this for real-money transactions until the relevant legal, provider, and security work is completed.


## Latest UI refresh

The homepage now has a dark, Fiverr-inspired visual direction while retaining the Global Freelancing name, including an updated hero/search area, popular category navigation, and responsive styling. This change is part of the early marketplace UI prototype; it does not imply that all marketplace workflows are complete.
