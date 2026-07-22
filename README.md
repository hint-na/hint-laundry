# Hint Laundry & Dry Cleaners — staff app

Point-of-sale app for the counter: orders, payments, slips, receipts and
WhatsApp notifications. Runs at https://hint-na.github.io/hint-laundry/ and
installs to a phone's home screen (Add to Home Screen) so it opens instantly,
even with no internet.

## Files

| File | What it is |
|---|---|
| `index.html` | Small page shell: fonts, icons, script tags, service-worker registration |
| `app.jsx` | **The app source — edit this one** (React JSX) |
| `app.js` | Compiled copy of `app.jsx` that the browser actually runs |
| `sw.js` | Service worker — caches everything for offline use |
| `manifest.webmanifest` | Home-screen install details (name, icons, colors) |
| `vendor/` | React and the Excel library, self-hosted |
| `fonts/` | Inter + IBM Plex Mono, self-hosted |
| `icons/` | App icons |

## Making a change

1. Edit `app.jsx`.
2. Compile it:
   ```
   npm install --no-save @babel/cli @babel/core @babel/preset-react
   npx babel --presets @babel/preset-react --no-comments app.jsx -o app.js
   ```
3. Bump `VERSION` in `sw.js` (e.g. `v3.0.0` → `v3.0.1`) so phones fetch the new build.
4. Commit and push — GitHub Pages redeploys automatically.

## Data & cloud sync

Each device works from its own local store (localStorage) with daily backup
downloads for the owner, so the app is fully usable offline. Optionally, the
owner can turn on **cloud sync** in Settings: records are then also stored in
the shop's Supabase database (project `hint-laundry`) and every connected
device sees the same customers, orders and payments. Devices join by pasting
the shop's link code (Settings → Copy link code). Sync is last-write-wins per
record, works offline-first, and catches up automatically when internet
returns. Staff PINs are stored as salted SHA-256 hashes.

The Supabase side is two SQL functions (`laundry_create_shop`,
`laundry_sync`) with row-level security locked down — the publishable key in
`app.jsx` grants no data access without a shop's secret link code.
