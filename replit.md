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

## Notes

- `package.json` previously declared a `@workspace/api-client-react` workspace
  dependency pointing at `../../lib/api-client-react`, which only exists in
  the original monorepo. That dependency is unused in source, so it was
  removed to allow `pnpm install` to succeed in this standalone clone. The
  matching TypeScript project reference was removed from `tsconfig.json`.
