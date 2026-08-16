# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Type-check (tsc -b) then Vite build
npm run lint       # ESLint
npm run preview    # Preview production build
```

No test runner is configured.

## Architecture

React 19 + TypeScript SPA for insurance policy management, backed by a Go REST API. Deployed on Vercel (SPA rewrites all routes to `/index.html`).

**Entry flow:** `main.tsx` → `<BrowserRouter>` → `App.tsx` → `<ContextProvider>` → `<Routes>`

### State Management

All global state lives in `src/Context/`:
- `ContextConfig.ts` — context object definitions
- `ContextProvider.tsx` — single provider wrapping the whole app, handles session verification on mount and route changes

Contexts:
| Context | Purpose |
|---|---|
| `AuthContext` | `isAuthenticated`, `session` JWT, `userClaims` |
| `ThemeContext` | `"dark"` / `"light"` (persisted in `localStorage`) |
| `UserModeContext` | `"Asegurador"` / `"Admin"` / `"Demo"` |
| `AlertContext` | Modal alert state + `onConfirm` callback |
| `DataChangedContext` | Numeric counter incremented to trigger data re-fetches |
| `SubscriptionContext` | Subscription status |

Session JWT is stored in `localStorage` as `session_jwt`. On each route change, `ContextProvider` calls `GET /v1/auth/checkSession` with a Bearer token to validate the session. Public routes (home, auth/*, privacy, pricing, support) skip the auth redirect.

### Styling

Dual system: **styled-components** (primary, theme-aware) + **Tailwind CSS v4**.

- `src/styles/GlobalStyles.ts` — `createGlobalStyle` with CSS variables for dark/light themes
- `src/styles/CssComponents.ts` — shared styled-component utilities
- Theme colors are CSS variables: `--bg-color`, `--header-color`, etc.
- `UserModeContext` value affects color scheme (Asegurador / Admin / Demo each have distinct accent colors)

Path alias `@` maps to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`).

### API Integration

Backend URL from env var `VITE_API_SERVER_URL` (defaults to `http://127.0.0.1:3006` in both dev and prod `.env` files — update `.env.production` for real deployments).

All authenticated requests use `Authorization: Bearer <session_jwt>` header.

Key endpoints:
- `POST /v1/auth/checkSession` — session validation
- `GET /v1/scrapping/polizas` — paginated policy list
- `GET /v1/scrapping/details` — policy statistics

### Key Patterns

- **Data refresh:** increment `DataChangedContext` counter to trigger re-fetches in subscribed components
- **Alert modals:** use `useModalAlert` hook to set `AlertContext` state; `<ModalAlert>` renders globally in `App.tsx`
- **Route protection:** handled in `ContextProvider` via `useNavigate` — redirects unauthenticated users to `/home`
- **Stripe:** `@stripe/react-stripe-js` and `@stripe/stripe-js` are installed; integration in `src/components/Pricing.tsx`
