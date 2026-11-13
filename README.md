# BatchScan AI — Packaging Batch Code, Expiry & Manufacturing Intelligence Scanner

> **Production-grade SaaS web app** for real-time packaging OCR, barcode extraction, shelf-life tracking, and warehouse expiry management. Powered by Google Gemini Vision, Supabase Cloud, and Raspberry Pi edge capture.

---

## Features

| Page | Capability |
|------|------------|
| **Dashboard** | 6 KPI cards, scan velocity line chart, expiry donut, top-products bar chart, expiring-this-week table |
| **Scan** | 3-step flow: Upload / Pi Capture / Sample → Review & Edit (per-field confidence colors) → Save. Bulk upload queue. |
| **Scan History** | Searchable, sortable, paginated table. URL-param search, sticky columns, duplicate detection, Retry button. Detail drawer. |
| **Inventory** | FEFO-sorted unique batches with shelf tags, quantities, and live expiry status |
| **Alerts** | Critical / Expired / Warning groups with actionable buttons (Discard, Sold, Discount, Front-of-Rack) |
| **Reports** | Date-range CSV export with live status, PDF print, preview table |
| **Settings** | AI model, Pi node, Supabase status, RBAC roles, Batch Recall (inline results), Notifications (stub), Danger Zone |

---

## Tech Stack

- **Backend:** FastAPI (Python 3.10+), Uvicorn, `app.py`
- **AI Vision:** Google Gemini Flash-Lite (`GEMINI_API_KEY`) + NVIDIA NIM API
- **Barcode:** `zxing-cpp` + OpenCV
- **Database:** Supabase PostgreSQL (`SUPABASE_URL`, `SUPABASE_KEY`)
- **Frontend:** Vite 6 + Vanilla JS (modular `src/`), Chart.js 4, Lucide icons
- **Mobile:** Capacitor 7 (Android APK)

---

## Setup

### 1. Clone & Install

```bash
git clone <repo>
cd "OCR new"
pip install -r requirements.txt
npm install
```

### 2. Environment Variables

Create a `.env` file in the project root (already in `.gitignore`):

```env
GEMINI_API_KEY=your_google_gemini_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_or_service_role_key
```

> **Never commit `.env`.** It is listed in `.gitignore`.

### 3. Run the Backend

```bash
python app.py
# OR
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Server starts at `http://127.0.0.1:8000`. LAN access via `http://192.168.0.102:8000`.

### 4. Build Frontend

```bash
npm run build
# Copy PWA assets
cp static/manifest.json static/sw.js static/icon-192.png static/icon-512.png dist/
```

The FastAPI server automatically serves `dist/index.html` as the root.

### 5. Dev Mode (Hot Reload)

```bash
npm run dev   # Vite at http://127.0.0.1:5173
```

---

## Android APK

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
# APK at: android/app/build/outputs/apk/debug/app-debug.apk
```

> Requires JDK 17 and Android SDK. `capacitor.build.gradle` is set to `VERSION_17`.

The APK is also served at `/BatchScan-AI.apk` from the FastAPI server.

---

## Raspberry Pi Edge Capture

The Pi camera client sends frames to the server via:

```
POST http://192.168.0.102:8000/api/rpi/upload
```

Run on the Pi:

```bash
python rpi_camera_client.py
```

---

## Database Migration

The file `migrate_v2.sql` contains optional schema upgrades:
- `is_deleted`, `deleted_at`, `location_shelf`, `quantity`, `action_taken` columns
- `user_profiles` table (RBAC roles: admin/staff/viewer)
- `audit_logs` table
- Updated RLS policies

**Show this SQL to your team before running against the live Supabase DB.**

---

## Project Structure

```
OCR new/
├── app.py                  # FastAPI backend (~2000 lines)
├── requirements.txt
├── .env                    # 🔒 Never commit
├── .gitignore
├── migrate_v2.sql          # Optional DB schema upgrade
├── README.md
│
├── src/                    # Modular frontend source
│   ├── main.js             # App bootstrap, router mount
│   ├── router.js           # Hash router (#/dashboard, #/scan…)
│   ├── state.js            # Reactive store
│   ├── api.js              # All backend API calls
│   ├── components/
│   │   ├── Sidebar.js      # Collapsible nav (Lucide icons)
│   │   ├── Topbar.js       # Search, status dot, theme, profile
│   │   ├── Toast.js        # Toast notifications with undo
│   │   └── DetailDrawer.js # Right-side detail drawer
│   ├── pages/
│   │   ├── DashboardPage.js
│   │   ├── ScanPage.js     # 3-step + bulk upload
│   │   ├── HistoryPage.js  # Sortable, paginated, URL search
│   │   ├── InventoryPage.js
│   │   ├── AlertsPage.js
│   │   ├── ReportsPage.js  # Date-range CSV + PDF
│   │   └── SettingsPage.js # Recall, Notifications, Danger Zone
│   ├── styles/
│   │   ├── tokens.css      # Design tokens (8px grid, radii, shadows)
│   │   ├── themes.css      # Dark + light theme variables
│   │   ├── layout.css      # Sidebar, topbar, app shell
│   │   └── components.css  # Tables, badges, drawers, toasts
│   └── utils/
│       ├── dateUtils.js    # parseDateSafe(), formatDateStandard()
│       ├── formatters.js   # renderStatusBadge(), escapeHtml()
│       └── icons.js        # Lucide icon helpers
│
├── dist/                   # Production build output (Vite)
├── static/                 # Legacy static files + APK
├── legacy/                 # Backup of original single-page app
└── android/                # Capacitor Android project
```

---

## Roles

| Role   | Permissions |
|--------|-------------|
| admin  | Full access — scan, edit, delete, configure, purge DB |
| staff  | Scan and view — no delete, no settings |
| viewer | Read-only — no scan, no edit, no export |

Enforced server-side via Supabase RLS. See `migrate_v2.sql` for policies.

---

## License

Internal use — BatchScan AI · v2.0.0

