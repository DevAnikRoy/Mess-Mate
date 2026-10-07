<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Production data is off-limits

Mess Mate is live with real users. The Supabase database (project `ayzflzfmwkuavimlpogk`) holds real data.

- Never insert, update, or delete rows that belong to real users or real messes. This includes the owner's own mess "Badda Mess Mate", its members, and any mess or user created by real sign-ups.
- Only change real data when the owner gives an explicit command for that specific change. A general "fix this" or "clean up" does not count.
- Read-only queries (`select`) for debugging are fine. Schema migrations must stay non-destructive for existing rows.
- For testing, create clearly named temporary QA users and messes. Delete only those, by their exact ids, when the test is done.
