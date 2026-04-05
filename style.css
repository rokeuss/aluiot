# Nim Bank Dashboard

Personal bank transaction dashboard — password protected, reads CSV files from the `/data` folder.

## Setup

### 1. CSV Files
Place your bank CSV exports in the `/data` folder:
```
data/
  2022.csv
  2023.csv
  2024.csv
  2025.csv
  2026.csv   ← update this monthly
```

The app auto-detects the column layout. Your bank CSVs just need columns named:
`Date`, `Description`, `Debit`, `Credit`, `Balance` (or similar).

### 2. Config
Edit `config.js` to change:
- `PIN` — the 4-digit password (default: `1507`)
- `accountName` / `accountIBAN` — display name
- `files` — add/remove year entries
- `defaultYear` — which year loads on open

### 3. Deploy to Netlify via GitHub

1. Push this folder to a new **private** GitHub repo
2. Go to [netlify.com](https://netlify.com) → "Add new site" → "Import from Git"
3. Select your repo → Build command: *(leave empty)* → Publish directory: `.`
4. Click **Deploy**

### Updating monthly
When you get a new month's CSV (e.g. April 2026):
1. Export from your bank → save/overwrite as `data/2026.csv` (append the new rows)
2. `git add data/2026.csv && git commit -m "Add April 2026" && git push`
3. Netlify auto-redeploys in ~30 seconds

## CSV Format
The parser handles your bank's format automatically (skips header rows, finds Date/Debit/Credit columns by name).

Normalized format also works:
```
Date,Description,Transaction_Type,Reference,Debit,Credit,Balance
2026-03-31,IBU-Maintenance Fees,Commission - Fee,,35,0,270648.56
```
