# Finance Tracker — Android app

React Native (Expo SDK 57, Expo Router) client for the Finance Tracker API at
`https://finance.mypgmanager.com`. It is independent of the web frontend and
shares only the backend: the same accounts, the same JWT auth and the same
saved data.

## Run

```bash
npm install
npx expo run:android          # debug build on a connected device / emulator
npm run build:apk             # release APK → android/app/build/outputs/apk/release/app-release.apk
```

Point the app at another backend (e.g. a dev server on your LAN) with
`EXPO_PUBLIC_API_URL=http://192.168.1.10:3001 npx expo run:android`. The
default comes from `extra.apiUrl` in `app.json`.

Before committing: `npm run typecheck && npm run lint`.

## Structure

```
src/
  app/                      Expo Router routes (files = screens)
    _layout.tsx             providers, splash, auth guard (Stack.Protected)
    sign-in / sign-up / forgot-password
    (app)/                  signed-in area
      (tabs)/               Dashboard · Equity · Funds · More
      real-estate, loans, investments, expenses, fire, configuration
  auth/
    AuthProvider.tsx        session lifecycle (restore, sign in/out, expiry)
    tokenStorage.ts         SecureStore persistence
    jwt.ts                  reads token expiry
  api/
    client.ts               axios instance + interceptors
    errors.ts               ApiError (one error type for every failure)
    auth.ts, portfolio.ts   endpoint wrappers
  features/portfolio/
    calculations.ts         portfolio maths (mirrors the web dashboard)
    usePortfolio.ts         React Query hooks, derived data, useSaveUserData
  features/fire/fire.ts     FIRE maths (mirrors the web calculator)
  features/config/          module list + config defaults shared with the web
  components/               UI kit (Screen, Card, StatTile, ListRow, …)
  theme/, lib/, types/, config/
```

## Authentication

- `POST /api/auth/login` (or `register`) returns a 7-day JWT.
- The token and user are stored in **SecureStore** (Android Keystore,
  excluded from Android auto-backup) and kept in memory for signing requests.
- On launch an unexpired stored token signs the user in immediately (works
  offline); `GET /api/auth/me` then confirms it in the background.
- The app signs out automatically when:
  - the token's `exp` passes (a timer, plus a check whenever the app returns
    to the foreground, since timers pause in the background);
  - any signed request returns **401** (password changed, account removed,
    secret rotated).
- Signing out clears SecureStore, the in-memory token and every cached query,
  and the sign-in screen explains why the session ended.

## Data

All data comes from `GET /api/backup` (the user's `ft_*_<username>` keys),
enriched with live prices (`/api/quotes`), mutual fund NAVs (`/api/mf/nav`)
and the USD/INR rate (`/api/fx/usd-inr`). Pull down on any screen to refresh.

### Editing and sync

The app edits **Configuration** (demat account holders, tab visibility) and the
**FIRE Calculator** inputs. A save sends only the changed key
(`POST /api/backup` with one `ft_<name>_<username>` entry), applied
optimistically and rolled back if the server rejects it
(`useSaveUserData`).

The website syncs per key as well: it uploads only keys edited in that tab,
loads the server copy when it opens, and pulls in other devices' changes when
the tab regains focus. Edits on either side therefore don't overwrite each
other. If both sides edit the *same* key at the same time, the last save wins.

Holdings, funds, property, loans and expenses are view-only in the app; add or
edit them on the website.

## Release signing

`npm run build:apk` signs with the debug keystore, which is fine for
installing the APK directly. For the Play Store, create an upload key and
build an AAB with EAS (`npx eas-cli@latest build -p android`) or a local
keystore — never commit keystores.
