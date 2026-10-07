# মেসমেট · Mess Mate

**A Bengali, mobile-first app that keeps a shared mess's meals, bazaar and bills honest, so nobody has to fight over the month-end hisab.**

In Bangladesh, students and working people often live together in a *mess*: a shared flat where everyone eats from the same kitchen. Each month someone has to work out who ate how many meals, who bought bazaar, who paid the gas and internet bills, and who now owes whom. Today that lives in a notebook or a WhatsApp group. It goes wrong in the same ways every month:

- Somebody forgets to write their meals, and later "remembers" a different number.
- Old entries quietly change after the money is already settled.
- The manager does all the math by hand, and nobody else can check it.
- Bazaar receipts are long free-text lists, and adding them up is tedious.

Mess Mate replaces the notebook. Everyone logs their own meals on the day. Bazaar and bills go into one shared ledger. The month's report calculates itself and stays visible to every member.

---

## What it does

| Area | What members get |
| --- | --- |
| **Onboarding** | Sign in with Google or email. Create a mess (name and which meals it serves), or join one with an invite link or code. |
| **Meals** | Tap breakfast, lunch or dinner for today. Add guest meals, which count on the host. Anyone can mark "kitchen closed" for today. |
| **Bazaar** | Paste the shopping list as free text. The app suggests the total, including Bengali digits like `চাল ৫ কেজি ৩৫০`. |
| **Household bills** | Rent, electricity, gas, Wi-Fi and so on, with one-tap shortcuts. Split equally among the month's members. |
| **Report** | Meal rate, each person's food cost, what they paid, their bill share, and the final "will get / will pay" amount. Manager approval with a visible status. |
| **Duties** | Bathroom rotation and custom duties. Each person marks their own as done. |
| **Mess & members** | Rename the mess, change meal slots, regenerate the invite code, hand over the manager role, remove members, or leave. |
| **Dashboard** | Today's status, upcoming duty, monthly charts, and month history. |

The UI is entirely in Bengali, works on a 320px-wide phone, and uses English digits for money so amounts are easy to read.

---

## Where the complexity was

This looks like a CRUD app, but most of the work went into four areas.

### 1. The accounting has to be exactly right

Money is split between friends who live together, so a one-taka error turns into an argument. The rules, implemented in [`src/lib/model.ts`](src/lib/model.ts):

- Breakfast counts as **0.5** meal, lunch and dinner as **1** each.
- **Meal rate** = total bazaar ÷ total meals of the month.
- **Food cost** for a person = their meals × meal rate. Guests count on their host.
- **Household bills** are split **equally** among everyone who was in the mess that month, manager included.
- **Net** = what you paid (bazaar + bills) − food cost − bill share.

The nets of all members must add up to exactly **0**. Rounding each person to whole taka can break that, so the leftover drift is absorbed into one row.

A worked example with 3 members, 9,000 tk bazaar, 180 meals and 6,000 tk bills:

| Member | Meals | Food (×50) | Paid | Bill share | Net |
| --- | --- | --- | --- | --- | --- |
| A | 70 | 3,500 | 6,000 (bazaar) | 2,000 | **will get 500** |
| B | 60 | 3,000 | 3,000 bazaar + 6,000 bills | 2,000 | **will get 4,000** |
| C | 50 | 2,500 | 0 | 2,000 | **will pay 4,500** |

There are edge cases too. "Empty" is not the same as "ate zero meals". Kitchen-closed days drop out of the totals. Members who joined or left mid-month still appear in the months they were part of. If there is bazaar but no meals, the app shows a warning instead of dividing by zero.

### 2. Time rules that can't be cheated

Most disputes come from editing the past, so the rules are tied to the **Asia/Dhaka** calendar:

- Each person can enter **their own** meals, bazaar and bills **only for today**.
- Only the **manager** can fix past days, and only until the **20th of the next month**. After that the month is locked.
- **Kitchen closed** can be marked by anyone on the same day, and only by the manager afterwards.
- Any edit to a month's numbers automatically **clears that month's approval**, so an approved report can never silently change.

These rules are enforced **in the database**, not just hidden in the UI. Calling the API directly does not get around them.

### 3. Security for a multi-tenant app on a public API

The browser talks straight to Supabase, so the database itself is the security boundary:

- **Row Level Security on every table.** You can only see rows of the mess you currently belong to.
- **Helper functions live in a `private` schema** (`is_member`, `is_manager`, `can_log`, `can_fix`, `month_open`, `dhaka_today`), so the public API cannot call them.
- **Sensitive actions are server-side RPCs**, not table writes: `create_mess`, `join_mess`, `invite_preview`, `regenerate_invite`, `remove_member`, `leave_mess`, `transfer_manager`, `approve_month` and `toggle_duty`. Each one checks the caller's role itself.
- **Column-level grants.** A user can only change their own `full_name`. A manager can only change the mess name and meal slots. Memberships and approvals cannot be written directly at all.
- **Triggers protect history.** `created_by`, `created_at` and `mess_id` cannot be rewritten on update.
- **Privacy.** Co-members see each other's name and picture, never their email.
- **One active mess per user**, enforced by a partial unique index.
- **Security headers:** `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a locked-down permissions policy.

### 4. A smooth flow from invite link to first meal

- If a logged-out person opens an invite link, the link is remembered (in a short-lived, httpOnly cookie) through Google or email login, and they land on the join screen afterwards.
- A user with no mess is sent to onboarding. A user already in a mess cannot open onboarding or join pages. This routing lives in [`src/proxy.ts`](src/proxy.ts), the Next.js 16 proxy.
- The client store loads the current and previous month up front, and older months on demand. It re-syncs when the tab regains focus, so everyone sees the same numbers.
- Meal taps update instantly and roll back if the server rejects them. Money entries are saved first and shown after the server confirms. Every rejection becomes a clear Bengali message instead of a raw database error.

---

## Tech stack

- **Next.js 16** (App Router, Turbopack, `proxy.ts`) with **React 19**, linted with the React Compiler rules
- **TypeScript** and **Tailwind CSS v4**
- **Supabase**: Postgres, Auth (Google and email), Row Level Security, RPCs and triggers
- **Recharts** for the dashboard charts
- Deployed on **Vercel**

---

## Project structure

```text
src/
  app/                  Routes: dashboard, meals, bazaar, bills, report, duties,
                        mess, members/[id], account, onboarding, join/[code],
                        login, auth/callback
  components/           One component per screen, plus shared pieces
                        (shell, month-picker, entry-tools, avatar, charts, icons)
  lib/
    model.ts            Domain types and the ledger math
    dates.ts            Dhaka-time calendar helpers and edit deadlines
    store.tsx           Client-side mess state, month loading, optimistic writes
    errors.ts           Maps database errors to Bengali messages
    supabase/           Browser and server clients
  proxy.ts              Auth, onboarding and invite-link routing
supabase/migrations/
  001_profiles.sql      Profiles, messes, memberships, signup trigger
  002_mess_core.sql     Activity tables, RLS policies, private helpers, triggers, RPCs
  003_column_guards.sql Column-level write restrictions
```

---

## Running it locally

**Requirements:** Node.js 20+ and a Supabase project.

1. **Install dependencies.**

   ```bash
   npm install
   ```

2. **Set up the environment.**

   ```bash
   cp .env.example .env.local
   ```

   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from **Supabase → Project Settings → API**. Never commit `.env.local`.

3. **Create the database.** Run the files in `supabase/migrations/` in order (`001`, `002`, `003`) in the Supabase SQL editor, or with `supabase db push`.

4. **Configure auth** in Supabase:
   - Enable the **Google** provider under **Authentication → Providers**.
   - Under **Authentication → URL Configuration**, set the Site URL and add `http://127.0.0.1:3010/auth/callback` (plus your production URL) to the redirect URLs.

5. **Start the app.**

   ```bash
   npm run dev -- --hostname 127.0.0.1 --port 3010
   ```

   Then open <http://127.0.0.1:3010>.

### Checks

```bash
npx tsc --noEmit   # typecheck
npm run lint       # eslint
```

---

## Roadmap

These parts are planned but **not built yet**:

- **Notifications:** an evening reminder to log meals, duty reminders starting 48 hours before (every 12 hours), and report-approval reminders on the 10th, 13th, 15th and 17th.
- **Per-mess subscription:** the data types exist in `model.ts`, but billing is not wired up.
- **Custom SMTP** for branded sign-in emails.

---

Built by [Anik Roy](https://github.com/DevAnikRoy).
