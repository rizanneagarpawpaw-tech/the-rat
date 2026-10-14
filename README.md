# Aria Vale — Portfolio

A modern, animated personal portfolio that reads all of its content from its own
**database file**, plus a **browser admin panel** so you can edit that database
without touching any code.

```
myproject/
├── index.html            ← the portfolio (reads the database)
├── admin.html            ← the admin panel (edits the database)
├── db.json               ← THE DATABASE — everything the site shows lives here
├── db.seed.json          ← untouched backup used by “Reset to defaults”
├── 404.html              ← themed not-found page (GitHub Pages)
├── .nojekyll             ← stops Jekyll from processing the site
├── .github/workflows/    ← one-click Pages deployment
├── server.ps1            ← zero-dependency Windows server (PowerShell)
├── server.js             ← optional Node.js version of the same server
├── start.bat             ← double-click to run the site
└── assets/
    ├── css/style.css     ← portfolio design
    ├── css/admin.css     ← admin design
    ├── js/app.js         ← renders index.html from the database
    └── js/admin.js       ← the admin editor
```

## Quick start

**Windows (no installation needed)**

1. Double-click `start.bat`
2. The portfolio opens at **http://localhost:4173**
3. The admin panel is at **http://localhost:4173/admin.html**

Or from a terminal:

```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1          # port 4173
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 8080
```

**If you have Node.js instead**

```bash
node server.js          # same site, same API, same database file
```

> Only one server can run at a time — pick PowerShell *or* Node.

## Editing your content

Open `http://localhost:4173/admin.html`, edit, then press **Save**.
Reload the portfolio to see it live.

| Tab | What it controls |
| --- | --- |
| Profile | Name, role, bio, avatar, contact details, availability badge |
| Stats | The four numbers under the hero |
| Skills | Animated skill bars + the floating hero chips |
| Services | The “What I do” cards |
| Projects | Your work grid — tags, colours, links, featured sizing |
| Experience | The career timeline |
| Testimonials | The scrolling quote cards |
| Links | Social buttons in the contact section |
| Settings | Accent colours, section visibility, CTA & footer text |
| Raw data | The full `db.json`, plus import / export / reset |

Other admin features: reorder ↑↓, duplicate, delete, JSON import/export,
unsaved-changes indicator, and a database reset that restores `db.seed.json`.

### Admin key

Saving is password-protected. The default key is **`portfolio-admin`**.
Change it by setting an environment variable before starting the server:

```powershell
$env:ADMIN_KEY = "your-secret"; powershell -File .\server.ps1
```

```bash
ADMIN_KEY="your-secret" node server.js
```

## How the pieces fit together

- `db.json` is the single source of truth — a plain JSON file you can also edit
  in any text editor or keep in git.
- The server serves the static site **and** a tiny API:

  | Route | Purpose |
  | --- | --- |
  | `GET /api/data` | Read the database |
  | `POST /api/data` | Write the database (needs the admin key) |
  | `GET /api/seed` | Read the pristine backup |
  | `POST /api/reset` | Restore `db.json` from `db.seed.json` (needs the key) |

- `index.html` fetches `/api/data` and renders every section from it — nothing
  in the page is hard-coded, so changing the database changes the site.
- Writes are atomic (temp file + rename), validated as JSON, and size-limited.
- Path traversal outside the project folder is blocked.

## Customising the look

The design is driven by CSS variables at the top of `assets/css/style.css`:

```css
--accent:  #7c5cff;   /* violet  */
--accent-2: #22d3ee;  /* cyan    */
--pink:    #ff5c9e;   /* accent  */
```

The admin panel’s **Settings → Theme colours** overrides the first two live,
straight from the database.

## Deploying to GitHub Pages

The site is fully static-compatible: it loads `db.json` directly, so it works
on GitHub Pages (or Netlify, S3, any file host) with no server at all.

**1. Push to GitHub**

```bash
git init
git add .
git commit -m "Portfolio"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

**2. Turn on Pages** — repo → *Settings* → *Pages* → *Build and deployment*
→ Source: **GitHub Actions**. The included workflow (`.github/workflows/deploy.yml`)
deploys on every push and validates that `db.json` is well-formed JSON first.

*(Prefer branch deployment? Source: **Deploy from a branch** → `main` / root
works too — the included `.nojekyll` stops Jekyll from touching your files.)*

**3. Your site is live** at `https://<your-username>.github.io/<your-repo>/`

Everything is relative, so it works under that sub-path — or on a custom
domain, or at the root of a user site. A themed `404.html` is included and
auto-resolves the correct home link at any depth.

### Editing content on Pages

Static hosting can only serve files — there is no server to write `db.json`.
The admin panel detects this automatically:

- It opens in **read-only mode** with a banner explaining the situation.
- The **Save** button becomes **Download db.json**.
- Edit → *Raw data* → *Download db.json* → commit the file → push → live.

For instant saving instead, run the site locally with `start.bat`, edit there,
then commit the updated `db.json`.

### Pages notes

- **Commit `db.json`** — it *is* the database the live site renders from.
  (`db.seed.json` too, if you want the “Reset to defaults” backup available.)
- Pages caches for ~10 minutes, so a freshly pushed `db.json` may take a few
  minutes to appear.
- `server.ps1` / `server.js` / `start.bat` are harmless on Pages (they're just
  served as downloads) and stay available for local editing.

## Deploying elsewhere

Any host that can run a process and write one file works — a small VPS, a
`tmux` session, or a PaaS that accepts custom servers — giving you the live
admin panel with `node server.js`.

## Notes

- The site loads Google Fonts (Space Grotesk + Inter) when online and falls
  back to system fonts offline.
- Pressing **Export** in the admin downloads a copy of `db.json` — a good way
  to back up before big edits.
