# Protocol Lab

A personal business dashboard, built to eventually replace the paid tools you use
day to day — inspired by the "content engine" walkthrough. This covers the
foundation plus a working CRM, comms, and automations layer with a full
team/permissions system, and a Training module for tracking your own
fight-camp schedule alongside the business.

## What's actually working right now

- **One-time account setup** at `/setup` — creates the owner login for Protocol Lab.
- **Login** at `/login`.
- **Content tracker** (`/dashboard/content`) — logs reels/posts, ranked by
  followers gained per 10,000 views.
- **Analytics** (`/dashboard/analytics`) — weekly follower counts per platform,
  growth over time.
- **People / CRM** (`/dashboard/people`) — every company and contact you're in
  touch with (name, company, title, status, tags, assigned rep). Click into
  one to see the full shared timeline: emails, calls, texts, and notes, in
  order, with who did each one and when.
- **Mail** (`/dashboard/mail`) — connect your own Gmail (each teammate connects
  their own) and send/log email straight from a contact's page. Every email
  sent through the CRM is logged automatically.
- **Comms** (`/dashboard/comms`) — text and call contacts from their page.
  Texting and calling go through one shared Twilio business number the owner
  connects in Settings. Calls can be recorded (see the legal note below).
- **Automations** (`/dashboard/automations`) — trigger → action rules (e.g.
  "contact tagged hot-lead → log a note", "no reply in 3 days → send a
  follow-up email"). Run manually with "Run now" for now — see the note on
  scheduling below.
- **Team & permissions** (`/dashboard/settings/team`, owner only) — invite
  teammates and pick exactly which tabs each of them can see, with an
  on/off checkbox per module. You (the owner) always have full access;
  employees only see what's checked. Changes take effect on their very
  next click, not their next login.
- **CFO** (`/dashboard/cfo`) — your personal budget, spending, and cashflow
  tracker. Wealthsimple (and every other bank) has no public API for personal
  accounts, so there's no live sync — instead you copy your activity feed from
  Wealthsimple and paste it into the "+ Add" tab, which parses it into
  editable rows (date/description/amount/category) for you to review and
  save. Categories are deliberately kept to a simple 8-category list
  (Housing, Groceries, Dining & Cafes, Transport & Gas, Bills & Debt,
  Business, Income, Everything Else) — the parser auto-detects your merchant
  history, and if your account still has the older fine-grained categories
  they're folded into the 8 automatically the next time this page loads (no
  manual step). Income detection treats incoming bank transfers and e-Transfers
  as income by default; a merchant it can't place lands in "uncategorized" so
  you can fix it once, from the Overview tab, and it'll remember for next
  time.

  From there: an **Overview** tab with a one-click "Apply this budget" button
  that sets all 6 spending categories to a personalized budget built from
  your real 3-month spending history using the Conscious Spending Plan from
  *I Will Teach You to Be Rich* (Fixed Costs / Investments / Savings /
  Guilt-Free Spending) — you can also edit any category's budget number
  directly, expand a category to see and recategorize its transactions
  inline, and see every transaction for the month in one table without
  switching tabs; a full searchable/filterable **History** of every
  transaction; a **Calendar** of your recurring fixed bills showing what's
  paid vs. still due each month; a **Goals & Debt** tab to track savings
  goals and pay-down progress on debts; and a **CFO Chat** tab — an AI
  coach grounded in your real budget, categories, goals, and debts, so you
  can ask things like "am I on track" or "where should this month's card
  payoff come from" and get answers based on your actual numbers, not
  generic tips. CFO Chat needs an `ANTHROPIC_API_KEY` — see
  [CFO Chat setup](#cfo-chat-setup) below; without it the tab explains
  what's missing instead of erroring. Everything here is private to your own
  login — nobody else on the team sees it.
- **Training** (`/dashboard/training`) — your personal fight-camp schedule
  (Muay Thai / BJJ / strength / recovery), the full session library for
  every protocol referenced in the week, and the training principles behind
  the sequencing. Each day can be checked off as done, per week, so you can
  see your adherence over time.
- **Shoot Board** (`/dashboard/shoots`) — a per-client content production
  Kanban: Scripting → Film → Editing → Ready to Post → Posted. Drag a card
  between columns (or use the arrow buttons on mobile), filter by client,
  attach a card to a real CRM contact or just type a client label if there's
  no contact yet.
- **Content Lab** (`/dashboard/lab`) — Ad Analyzer, Script Analyzer, and
  Trend Log in one place. Paste in a transcript/script from a well-performing
  ad or video, tag it to a client, and write up why it works — this is what
  you'd use to coach a client on their own ad-making. This is manual capture
  for now (v1); a live Meta Ads pull and AI-generated breakdowns are the
  natural next step once an ad account and API keys are connected.
- **Brain** (`/dashboard/brain`) — your personal knowledge library:
  Learnings (from books/podcasts, with a source), Thoughts, and Notes, each
  tagged to one of nine fixed categories (Personal, Business, Marketing,
  Events, Fitness, Philosophy, Creativity, Relationships, Other), searchable
  and filterable. Built to match the "MY BRAIN" capture rules from your
  other notes system — plain capture, your own words, no unsolicited
  analysis.
- **Calendar** (`/dashboard/calendar`) — shared events list, upcoming first,
  optionally linked to a CRM contact. Google Calendar sync is a later step.
- **Booking** (`/dashboard/booking`) — set your weekly availability windows,
  share the public **`/book`** page, confirm or decline requests as they
  come in.
- **Docs & Sign** (`/dashboard/docs`) — draft a document, mark it sent, share
  its `/sign/[id]` link. The recipient types their legal name to sign — no
  account needed. Not a certified e-signature product, good for internal
  agreements.
- **Recordings** (`/dashboard/recordings`) — one library for screen
  recordings, uploaded videos, and Twilio call recording links.
- **Copilot** (`/dashboard/copilot`) — paste a transcript, write up the
  summary/decisions/action items. Live auto-transcription is a later step.
- **IG Automations** (`/dashboard/ig-automations`) — define comment/DM-keyword
  auto-reply rules now; actually firing them needs a connected Meta/Instagram
  Graph API app (its own review process) — ask me to wire that in when ready.
- **Ads** (`/dashboard/ads`) — manual ledger of what's running per client and
  platform: budget, spend, results, status. A live Meta Ads pull is a later
  step once an ad account and API keys are connected.

Every placeholder from the original phase plan is now built, except for the
pieces that genuinely need external credentials from you first: live Meta
Ads sync, real IG automation firing, and Google Calendar sync.

## Tech stack

- **Next.js** (pages + backend API in one project)
- **PostgreSQL** via **Prisma**
- **Auth.js (NextAuth)** for login/sessions
- **Gmail API** (googleapis) for email
- **Twilio** for texting and calls
- Deploys to **Railway**

## Deploying to Railway

1. Create a Railway account at railway.app.
2. Push this project to a new GitHub repo, then in Railway: New Project →
   Deploy from GitHub repo.
3. Add a database: "+ New" → Database → PostgreSQL. Railway wires up
   `DATABASE_URL` automatically.
4. Add environment variables on your app service (Variables tab):
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`. This also
     encrypts stored Gmail/Twilio credentials, so don't lose it or rotate it
     casually — rotating it invalidates every stored connection.
   - `PUBLIC_APP_URL` — your Railway URL once you have it (e.g.
     `https://my-hq-production.up.railway.app`, no trailing slash). Required
     for Twilio call recording to work.
   - Gmail variables (optional — see below).
5. Build command: `npx prisma migrate deploy && npm run build`. Start
   command: `npm run start`.
6. Deploy, then open the URL — it redirects to `/setup` to create your
   owner login (works once only).

## Connecting Gmail (optional, per teammate)

Each person connects their own Gmail from the Mail page, but the app itself
needs one Google Cloud OAuth app set up first (you do this once, as the
owner):

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create
   a project (or use an existing one).
2. APIs & Services → Library → enable the **Gmail API**.
3. APIs & Services → OAuth consent screen → set it up (External is fine for
   a small team; add your teammates' emails as test users if it stays in
   "Testing" mode).
4. APIs & Services → Credentials → Create Credentials → OAuth client ID →
   Web application.
   - Authorized redirect URI: `https://your-app-url/api/integrations/gmail/callback`
5. Copy the Client ID and Client Secret into Railway's environment
   variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
   `GOOGLE_REDIRECT_URI` (the same URL as step 4).
6. Redeploy. Each teammate can now click "Connect Gmail" on the Mail page.

Until this is set up, Mail still works in "log only" mode — you can record
that an email was sent, it just won't actually send through Gmail.

## Connecting Twilio (texting & recorded calls)

The owner connects this once in Settings — it's a single shared business
number, not a per-person credential.

1. Create a [Twilio](https://www.twilio.com/) account, buy a phone number
   (Phone Numbers → Buy a Number).
2. From the Twilio Console homepage, copy your **Account SID** and
   **Auth Token**.
3. In the HQ, go to Settings and paste those in plus the phone number.
4. To receive inbound texts into the CRM automatically: in Twilio, go to
   your number's configuration → "A message comes in" → set the webhook to
   `https://your-app-url/api/webhooks/twilio/sms-inbound` (HTTP POST).

**Before turning on call recording:** consent rules for recording phone
calls vary by country and by US state — some places require telling the
other party, some require their explicit consent before you record.
Confirm what applies to where you and your contacts are before relying on
this feature. This isn't legal advice — check with someone who can confirm
it for your situation.

## CFO Chat setup

The "CFO Chat" tab (`/dashboard/cfo`) calls the Claude API directly, which
needs its own API key — separate from whatever Claude surface you're using
to develop this app.

1. Go to the [Anthropic Console](https://console.anthropic.com), sign in
   (or create an account), and open **Settings → API Keys**.
2. Create a new key and copy it.
3. In Railway, open this project → **Variables** → add `ANTHROPIC_API_KEY`
   with that value.
4. Redeploy. The chat tab starts working immediately — no code changes
   needed.

Optional: set `ANTHROPIC_MODEL` if you want to pin a specific model instead
of the built-in default. Current model IDs are listed at
[docs.claude.com/en/docs/about-claude/models](https://docs.claude.com/en/docs/about-claude/models).

Note the Anthropic Console is a pay-as-you-go API account, billed
separately from any Claude.ai subscription — a chat feature like this one
typically costs a few cents per conversation, but check current pricing
before relying on heavy daily use.

## Team & permissions

Only the owner can invite teammates and set their access, from Settings →
Team. There's no email-invite system yet — inviting someone generates a
one-time temporary password shown once on screen, which you share with them
directly (Slack, text, in person). A future pass could wire up real email
invites and let people set their own password on first login.

## Automations — what actually runs on its own

The app checks for due automations every 15 minutes, in the background,
inside the same running server — no separate Railway cron service needed
(see `src/instrumentation.ts`). But only automations that are *safe* to
fire unattended do this automatically:

- **New contact added** — always safe (only ever matches contacts created
  since the last run, so it can't double-fire).
- **No reply after N days** — always safe (its own action logs a new
  outbound touch, which pushes that contact's "last contact" date forward,
  so they naturally stop matching until they go quiet again).
- **Contact has tag → Add tag** — safe (adding a tag someone already has is
  a no-op).
- **Everything else** (tag-triggered emails/notes, and anything set to
  "Manual / all contacts") stays click-to-run on purpose — otherwise a
  tag-triggered email would re-send to the same contact every 15 minutes,
  forever. The automations list shows which of yours auto-run vs. need a
  click.

## Getting Claude's updates onto your site

After Claude sends you an updated `hq-app.zip`, download it and double-click
`scripts/update.command` inside this project folder (Finder → your hq-app
folder → scripts → update.command). It finds the newest zip in your
Downloads automatically, merges it in, commits, and pushes — Railway
redeploys on its own from there. No need to open Terminal or copy/paste
commands; if double-clicking prompts about running a script from an
unidentified developer, right-click it and choose "Open" once to allow it.

## Running it on your own computer first

1. Install [Node.js](https://nodejs.org) and
   [PostgreSQL](https://www.postgresql.org/download/).
2. Create a database, e.g. `createdb hq`.
3. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and
   `AUTH_SECRET`.
4. Run:
   ```
   npm install
   npx prisma migrate dev --name init
   npm run dev
   ```
5. Open http://localhost:3000.

## What's next

Recordings (Loom-style screen capture), meeting Copilot (call transcription),
content queue/editor, calendar, booking, docs, and e-signatures are still
placeholders in the sidebar, each marked with a phase number. Tell me which
one to build next.
