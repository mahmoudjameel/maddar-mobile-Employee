# Maddar Mobile

Expo (React Native + Web) employee app for Maddar. The frontend is a single
Expo project (TypeScript, Expo Router) that renders to iOS, Android (via Expo
Go), and the web. There is no first-party backend in this repository — the
app talks to an external Maddar API via `lib/api.ts`.

## Stack

- Expo SDK 54 (React Native 0.81, React 19, new architecture, React Compiler)
- Expo Router for file-based navigation (`app/`)
- React Query for server state, AsyncStorage for persistence
- i18next + react-i18next (Arabic/English, RTL aware)
- Inter font via `@expo-google-fonts/inter`
- Web target via `react-native-web` + `react-dom`

## Project layout

- `app/` — file-based routes (`_layout.tsx`, `index.tsx`, `(tabs)/`, etc.)
- `components/`, `hooks/`, `constants/`, `lib/` — shared UI and utilities
- `locales/` — i18n JSON resources (`en.json`, `ar.json`)
- `assets/` — icons, splash, images
- `scripts/build.js` — production build that boots Metro and downloads the
  iOS/Android Expo Go bundles + manifests into `static-build/`
- `server/serve.js` — zero-dependency Node static server for the built bundles
  and manifests (used for production deployment)

## Replit setup

- Workflow `Start application` runs `PORT=5000 pnpm run dev`, which boots
  Expo Metro on port 5000. The web build is served at `/` for the preview
  pane; native clients connect via the Replit Expo proxy domain.
- `pnpm-workspace.yaml` declares this repo as a single-package workspace so
  `scripts/build.js` (which walks up looking for the workspace root) works.
- Deployment is configured as `autoscale`:
  - build: `pnpm run build` — produces `static-build/` with iOS/Android
    bundles + manifests for Expo Go
  - run: `pnpm run serve` — `node server/serve.js`, serves the landing page
    and platform manifests over HTTP on `$PORT`

## Client-side enhancements (no API changes)

Three feature batches added on top of the OpenAPI surface — all driven by
data from the existing endpoints:

### 1. Theming (light / dark / system)

- `constants/colors.ts` exposes `colors.light` and `colors.dark` palettes
  plus `colors.radius`.
- `lib/theme.tsx` provides `<ThemeProvider>` and `useThemeMode()`. The
  selected mode (`light` / `dark` / `system`) is persisted in AsyncStorage
  under `maddar.themeMode`. `system` follows `Appearance.getColorScheme()`
  and reacts to OS-level changes.
- `components/UI.tsx` keeps its long-standing `theme` and `styles`
  exports, but they are now JS Proxies forwarding to a mutable
  `_activePalette` and a regenerated StyleSheet. `_setActivePalette` is
  called from `ThemeProvider`. To make sure cached `style={[...]}` arrays
  re-read the new palette, `app/_layout.tsx` wraps `<RootLayoutNav />`
  inside a `<View key={resolved} />` so the whole tree remounts on flip.
  This avoids touching the ~20 screens that import `theme`/`styles`
  directly.
- `app/settings.tsx` shows an Appearance picker (System / Light / Dark)
  with full Arabic labels (`settings.themeSystem|themeLight|themeDark`).
- The status bar style and Android navigation bar colors follow the
  resolved scheme.

### 2. Search & filters across lists

Reusable building blocks:

- `components/SearchBar.tsx` — input with search icon, RTL-aware, with a
  clear (×) action when populated.
- `components/FilterChips.tsx` — pill-style filter chips, RTL-aware,
  generic over the filter value type.

Applied client-side (no new API calls) to:

- `app/(tabs)/tasks.tsx` — search by title/description, filter by
  Open / In Progress / Completed.
- `app/(tabs)/requests.tsx` — search by type/id, filter by Pending /
  Approved / Rejected, scoped to the active tab (`mine`/`inbox`).
- `app/notifications.tsx` — search title/body, filter All / Unread /
  Read.
- `app/announcements.tsx` — search title/body/author, filter All /
  Pinned / Unread.
- `app/team.tsx` — search by name / job title / department.

Each list shows the same `EmptyState` component for "no results" when a
search/filter yields nothing.

### 3. Personal analytics dashboard

`app/reports.tsx` was rewritten as a dashboard built from existing
endpoints (`/reports`, `/attendance?year=&month=`, `/tasks`,
`/requests`):

- Lightweight SVG chart components (no new dependencies; uses the
  already-installed `react-native-svg`):
  - `components/charts/DonutChart.tsx`
  - `components/charts/BarChart.tsx`
- Sections rendered:
  - Stat-card grid (approved / pending / tasks / attendance).
  - Tasks donut with completion-rate center label.
  - Requests distribution donut (approved / in-review / rejected).
  - Weekly working hours bar chart, aggregated from `workedMinutes` per
    weekday in the current week.
  - Achievements: client-side badges (Perfect Attendance, Task Master,
    Always On Time, Productive Week) computed from the same data.
- Pull-to-refresh re-fetches all four queries in parallel.

## Notes

- `package.json` previously declared a `@workspace/api-client-react` workspace
  dependency pointing at `../../lib/api-client-react`, which only exists in
  the original monorepo. That dependency is unused in source, so it was
  removed to allow `pnpm install` to succeed in this standalone clone. The
  matching TypeScript project reference was removed from `tsconfig.json`.
