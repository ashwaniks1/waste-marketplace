## Cursor Cloud specific instructions

- **Project context**: read `AI_AGENT_CONTEXT.md` before substantive changes; keep it updated when architecture, schema, APIs, env, or flows change.
- **Dev server**: run `npm run dev` (see `README.md` for standard setup). Supabase + Postgres env vars are required.
- **Supabase env in tmux**: if secrets were added after tmux was already running, restart the tmux server (`tmux kill-server`) before starting `npm run dev`, otherwise the dev server may not see `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` and will crash early.
- **Driver map (“window is not defined”)**: Leaflet must not be evaluated during SSR. `src/app/driver/page.tsx` loads the map via a client-only dynamic import (`ssr: false`) to avoid the runtime crash.

