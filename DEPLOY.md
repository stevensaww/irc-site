# IRC — Going Live

You'll have a working public site with a real database in about 25 minutes. Total cost: **$0/month**, optionally ~$10/year for a custom domain.

## Stack

| Piece            | Service          | Why                                                |
| ---------------- | ---------------- | -------------------------------------------------- |
| Static hosting   | Cloudflare Pages | Free, unlimited bandwidth, global CDN, fast        |
| Database / API   | Supabase         | Free tier handles 50k MAU & 500MB; no servers      |
| (Optional) Domain | Namecheap / Cloudflare | ~₹800/year for `.in`, ~₹950/year for `.org` |

---

## Step 1 — Set up Supabase (5 min)

1. Go to **https://supabase.com** → click **Start your project** → sign in with GitHub.
2. Click **New Project**:
   - Name: `irc`
   - Database password: click **Generate** and **save it somewhere safe**.
   - Region: pick the closest to India (Singapore or Mumbai).
   - Pricing plan: **Free**.
3. Wait ~2 minutes for the project to provision.

Once the dashboard loads:

4. Left sidebar → **SQL Editor** → **New query**.
5. Open the file **`supabase-setup.sql`** from this folder, copy ALL of it, paste into the editor, click **Run**. You should see `Success. No rows returned`.
6. Left sidebar → **Settings** (gear icon) → **API**. You need two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (a long JWT string starting with `eyJ...`)

> The `anon` key is **safe to put in frontend code**. It only allows actions you explicitly approve via Row-Level Security policies — and our policies only allow inserting signups, not reading them.

---

## Step 2 — Wire the keys into the site (1 min)

Open **`app.js`** in this folder. At the top, find:

```js
const CONFIG = {
  SUPABASE_URL: 'YOUR_SUPABASE_URL_HERE',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY_HERE',
  ...
};
```

Replace those two strings with the values you copied from the Supabase dashboard. Save the file.

### Test locally
Open a terminal in this folder and run:
```bash
python3 -m http.server 3000
```
Then open `http://localhost:3000` in your browser. Submit the signup form. You should:
1. See the success modal.
2. Refresh the page — the ticker should now show your real signup added to the base count.
3. Check the Supabase dashboard → **Table Editor** → `signups` — your row should be there.

If anything fails, open the browser dev tools (F12) → **Console** tab. Errors there will tell us what's wrong.

---

## Step 3 — Push to GitHub (5 min)

Cloudflare Pages deploys directly from a Git repo. You'll need a free GitHub account.

1. Go to **https://github.com/new**
   - Repository name: `irc-site`
   - Visibility: Public (or Private — both work for Cloudflare Pages).
   - Don't initialize with README.
   - Click **Create repository**.

2. In your terminal, in this project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/irc-site.git
   git push -u origin main
   ```

   If `git` asks for authentication, use a [Personal Access Token](https://github.com/settings/tokens) as the password (GitHub no longer accepts passwords for Git operations).

---

## Step 4 — Deploy to Cloudflare Pages (5 min)

1. Go to **https://dash.cloudflare.com** → sign up for free.
2. Left sidebar → **Workers & Pages** → **Create** → **Pages** tab → **Connect to Git**.
3. Authorize GitHub → select the `irc-site` repo.
4. **Setup builds and deployments**:
   - Project name: `irc` (this becomes `irc.pages.dev`)
   - Production branch: `main`
   - Build command: **leave empty**
   - Build output directory: **leave empty** (or `/`)
5. Click **Save and Deploy**.

In ~60 seconds your site is live at **https://irc.pages.dev** (or whatever name you chose).

> Every time you push a new commit to `main`, Cloudflare auto-rebuilds in ~30 seconds. No manual deploys needed.

---

## Step 5 — (Optional) Custom domain (~10 min, ~₹800/year)

If you want `indianrationalcongress.in` or similar:

1. Buy the domain from **Namecheap**, **Cloudflare Registrar** (cheapest, no markup), or any registrar.
2. In Cloudflare Pages → your project → **Custom domains** → **Set up a custom domain**.
3. Enter your domain. Cloudflare gives you DNS records to add.
4. Add those records at your registrar's DNS panel.
5. SSL certificate auto-provisions in ~5 minutes. Done.

---

## Step 6 — Watching signups come in

- **Live count**: visit your site, the homepage ticker shows it.
- **All signups**: Supabase Dashboard → **Table Editor** → `signups`.
- **Export to CSV**: Supabase Dashboard → Table Editor → `signups` → click the **Export** button (top right).
- **SQL queries** (e.g. signups by city):
  ```sql
  select city, count(*) as total
  from signups
  group by city
  order by total desc
  limit 20;
  ```

---

## Anti-spam & abuse

The current setup is intentionally minimal because friction kills signups. If you start seeing fake submissions:

1. **Add Cloudflare Turnstile** (free, invisible CAPTCHA). I can wire it in 5 minutes.
2. **Rate limit** at the database level — restrict to N signups per IP per hour. Easy SQL change.
3. **Email verification** — adds friction but kills 99% of spam.

For launch, I recommend going without these and adding only if needed.

---

## What's wired up

The same live count drives, in real time, on every page:

- ✅ **Homepage**: live odometer ticker, progress bar, milestone strip (auto unlocks 100K → 1M → 5M → 10M)
- ✅ **Journey page**: progress ribbon (X.XM / 10M), card states (auto unlock as count rises)
- ✅ **Manifesto page**: lock auto-disappears when count crosses 5,000,000
- ✅ **Signup form**: real database insert; ticker increments live for everyone within ~30s

The page polls every 30 seconds and pauses when the tab is hidden, so it costs almost nothing in API calls.

---

## What's NOT included (yet)

- Email confirmation to signups
- Discord invite link in the success modal (just paste it in `index.html` when you have the server)
- Voting UI for when count hits 5M (placeholder lock disappears; you'll want a real voting interface by then)
- Admin dashboard (use Supabase's built-in table editor for now)

---

## Cost projection

| Signups   | Supabase | Cloudflare Pages | Total |
| --------- | -------- | ---------------- | ----- |
| 0 – 50k   | $0       | $0               | $0    |
| 50k – 500k| $25/mo*  | $0               | $25/mo |
| 500k – 10M| ~$25–50/mo | $0             | ~$25–50/mo |

*Supabase free tier covers 50k Monthly Active Users (people who load the site each month). Beyond that you upgrade to Pro at $25/mo. Cloudflare Pages stays free at any traffic level.

You can also keep it free past 50k MAU by using Supabase **Edge Functions** for caching the count or by replacing the public count with a static value updated periodically — but that's an optimization for when you actually have those numbers, not now.
