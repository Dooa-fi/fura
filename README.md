# Fura

Scripts, hooks and video ideas written in a creator's own voice. Fura learns how you talk from your own clips.

- **How it works:** see [EXPLANATION.md](EXPLANATION.md), or open `/how-it-works` in the app.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the keys
npm run dev                  # http://localhost:3000
```

One-time: in Supabase, open **SQL Editor**, paste [supabase/schema.sql](supabase/schema.sql), and press **Run**.

Demo clips for testing are in [samples/](samples/).

## Deploy (free)

Push to GitHub → import on [vercel.com](https://vercel.com) → add the same environment variables → Deploy.
