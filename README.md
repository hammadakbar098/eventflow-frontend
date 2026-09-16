# EventFlow

Public landing, login, signup, event discovery, public event details, and the organizer workspace (My events and Create event) for EventFlow. Built with Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Framer Motion, TanStack Query, React Hook Form, Zod, and one Axios client.

## Local development

Use Node.js 22 or newer.

```sh
npm ci
cp .env.example .env.local
```

Set `.env.local` to:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=EventFlow
```

Run the Nest backend on port 3000, then run `npm run dev`. Open [EventFlow on port 3001](http://localhost:3001). The frontend uses a separate port to avoid conflicting with the backend. Restart Next.js after changing environment variables. `.env.local` is ignored; `.env.example` is committed as a template.

Routes: `/`, `/login`, `/signup`, `/events`, `/events/[slug]`, `/dashboard/events`, `/dashboard/events/new`, `/dashboard/events/[slug]`, `/dashboard/events/[slug]/edit`, `/account`. No backend is needed to browse the landing page or validate forms locally. Authentication and live event discovery require the backend; missing configuration, network failures, and server failures render inline feedback.

## Shared architecture

The existing root `app/` convention is retained rather than moving the starter into `src/`.

```text
app/
  (public)/page.tsx          Landing route
  (auth)/layout.tsx          Shared auth shell
  (auth)/login/page.tsx
  (auth)/signup/page.tsx
  layout.tsx                Metadata, fonts, query/motion providers
  globals.css               Global tokens and shared styles
components/
  ui/                       Brand, buttons, form and password fields
  animation/                Reduced-motion-aware scroll reveal
features/
  landing/                  Sections, artwork, navigation, sample event data
  auth/
    components/             Shared shell, form feedback, login/signup forms
    hooks/                  TanStack mutations
    schemas/                Shared validation and response contracts
    services/               Explicit API payload mapping
    types/                  Payload and inferred response types
    utils/                  Safe error translation
lib/
  api/api-client.ts         Single Axios instance and memory-only token
  query/query-provider.tsx  Query lifetime and motion preferences
constants/                  Backend URL, endpoints, routes, app name
animations/                 Shared easing and reveal/stagger variants
utils/                      Class name composition
tests/                      Unit and browser integration tests
```

Foundation was established first, then three implementation agents built the landing, login, and signup routes in parallel. The final integration uses one design system and one API strategy.

## Authentication contract

```text
Form → mutation hook → auth service → Axios → Next.js proxy → Nest backend
```

The Axios client uses `/backend` in the browser and the configured backend URL on the server. `next.config.ts` forwards the known auth, event, organizer event, category, tag, and venue paths to `NEXT_PUBLIC_API_BASE_URL`. This lets the supplied backend work without CORS changes. Components never contain the upstream URL.

| Action | Backend endpoint          | Request fields                               | Verified response                     |
| ------ | ------------------------- | -------------------------------------------- | ------------------------------------- |
| Login  | `POST /api/auth/login`    | `email`, `password`                          | `accessToken`, `refreshToken`, `user` |
| Signup | `POST /api/auth/register` | `email`, `firstName`, `lastName`, `password` | `message`, `user`                     |

The response contract was inspected in the sibling `eventflow-nestjs` repository. Zod validates responses before success handlers run. Services allowlist request fields, so `confirmPassword` and extra properties cannot reach registration. Email is trimmed and lowercased; names are trimmed; passwords are preserved exactly. Both forms share password rules and show friendly validation messages.

Signup redirects to `/login?registered=1` with an account-created notice. Login continues to `/dashboard/events` through `AUTH_SUCCESS_REDIRECT` in `constants/routes.ts`.

Access and refresh tokens are kept in memory only (`lib/api/api-client.ts`), and the user is held in the query cache. Nothing is saved to localStorage/sessionStorage, so a full page reload ends the session. When a protected request returns 401, the client calls `POST /api/auth/refresh` once (concurrent failures share a single refresh), stores the rotated tokens and retries the request once; if refreshing fails, the session is cleared and protected pages return to Login. The header account menu logs out with `POST /api/auth/logout`, and `/account` offers `POST /api/auth/logout-all`; both clear the local session even if the server call fails. Password recovery is an explicit UI placeholder.

Mutations do not retry automatically. Forms prevent duplicate submissions, disable fields while pending, and keep entered values after failures. API errors expose only verified public messages or safe status-based descriptions. Forms wait for hydration before enabling submission and use POST as their native method.

## Design and motion

The seven requested blue palette colors are global CSS variables, with warm neutral surfaces and dark ink. Manrope and DM Sans are self-hosted through Fontsource packages; builds do not download Google Fonts. Photography lives in `public/images/` and uses Next.js image optimization. Source references are in `public/images/README.md`.

Focus follows one standard, set by Explore: the global `:focus-visible` rule in `app/globals.css` draws a 3px ink outline at a 5px offset on every control, including shared `FormField`, `SelectField`, and `TextareaField` inputs. Controls inside tight scroll lists, such as tag and venue options, use a 2px ink outline at a 3px offset. Don't add coloured focus rings. `tests/e2e/focus-style.spec.ts` compares form controls against Explore.

Framer Motion handles hero entrances, layered scroll movement, section reveals, and filtered event cards. The shared provider and individual motion components respect reduced-motion preferences. No GSAP or Zustand is needed for this scope. Landing-page sample cards are clearly labeled inspiration; Explore cards use live event data.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests use `http://localhost:3001` and reuse a running development server or start it automatically. They mock API responses and never create real accounts or events. Organizer tests sign in through the real login form, because sessions exist only in memory. Coverage includes authentication, exact payloads, validation, safe errors, discovery filters and pagination, debounced search, URL refresh/history, dialog keyboard behavior, public-detail privacy, timezone formatting, gallery order, loading/empty/error states, and reduced motion. Event pages are checked at 320/375/430/768/1024/1280/1440px; the original pages at 320/390/768/1024/1440px. An optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` environment variable allows an existing Chromium installation.

## Production and Docker

`NEXT_PUBLIC_*` values and the proxy destination are established at build time. Supply the backend URL before `npm run build`; changing it later requires rebuilding. The URL must be reachable from the Next.js server/container. A localhost URL inside a container refers to that container, not a separate backend container.

The Dockerfile accepts `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_NAME`, and optional `NEXT_PUBLIC_MEDIA_BASE_URL` build arguments. The existing GitHub Actions deployment passes the repository variables for the API and media hosts into the build. Configure the API variable with the deployment's backend origin before deploying. No deployment or repository variable was changed externally as part of implementation.

The existing standalone Docker runtime remains on container port 3000. For a local production server alongside the backend, use `npm run start -- --port 3001` after building.

## Public event discovery

`features/events/` owns public response schemas/types, the events service, centralized query keys, query hooks, shared display components, filter normalization, date formatting, and the two page interfaces. Explore and Details were implemented by separate agents after this shared foundation was established; the landing navigation, footer, fonts, buttons, colors, and motion utilities remain shared.

The service uses the real public endpoints:

- `GET /api/events` → `{ data, pagination: { page, limit, total, totalPages } }`
- `GET /api/events/:slug` → public event detail
- `GET /api/event-categories` → category array
- `GET /api/tags?search=...` → tag array

Explore state lives in the URL. Filters include debounced text search, API-backed category and tags, format, city, two-letter country code, dates, and server pagination. Requests normalize positive page/limit values, known formats, UUID references, empty strings, and ISO dates. Multiple tags are serialized as a comma-separated `tagIds` value; backend matching is ANY selected tag. A filter change resets page to 1. Date-only inputs become UTC boundaries; the backend applies a strict `startAt > startFrom` lower bound and inclusive `startAt <= startTo` upper bound. Pagination uses API metadata, with previous data retained while updates load.

Lists remain fresh for 30 seconds, details for one minute, categories for ten minutes, and searched tags for five minutes. Requests accept cancellation signals; public calls do not attach the in-memory auth token. Invalid responses and private unknown properties are rejected or stripped through Zod before entering the query cache. In particular, public `onlineDetails` permits only `platform`. No private meeting URLs, codes, or instructions are rendered. Descriptions are plain text, preserving line breaks without executing HTML.

Dates use the event timezone with a UTC fallback for invalid timezone data. Gallery items are ordered by `sortOrder`; missing sections are omitted. Ticketing and reservations have no invented API or purchasing action.

### Media hosting

The backend currently returns `storageKey` metadata and has no public media-serving contract. Branded placeholders are used until a media host is ready, as requested. Set optional `NEXT_PUBLIC_MEDIA_BASE_URL` to the public CDN/storage prefix when available, then rebuild. Opaque keys resolve against that prefix; cross-host URLs and remote query strings are not accepted, matching the Next.js image allowlist. Already-addressable root-relative assets use Next.js Image directly. Missing or failed images retain their aspect ratio and fall back to the same shared placeholder. No backend upload URL is guessed.

### Build environment note

If Turbopack cannot bind its internal worker port in a restricted environment, the supported alternative is `npm run build -- --webpack`. This does not change the application architecture or default build command.

## Organizer workspace

`/dashboard/events` and `/dashboard/events/new` share the public navigation, footer, typography, card anatomy, and motion. `SessionGate` in `features/auth/` renders a log-in state whenever no in-memory token exists, including after a full page reload, so private requests are never sent without a session. The navigation replaces Log in / Get started with My events while a session exists. Tokens expire after 15 minutes and there is no refresh contract, so a `401` shows a session-ended state; Create event keeps the entered values and offers Log in again.

Organizer requests use the same central client, schemas, service, query keys, and hooks as public discovery:

- `GET /api/events/mine?page&limit&search&status&format` (authenticated) → paginated organizer summaries with `status`
- `GET /api/venues?page&limit&search` → paginated venues
- `POST /api/venues` (authenticated) → created venue, invalidates venue queries and is selected automatically
- `POST /api/events` (authenticated) → created draft; only `id`, `slug`, and `status` are kept, organizer lists are invalidated, and the app opens `/dashboard/events/[slug]` using the returned slug

My events stores search, status (`DRAFT`, `SCHEDULED`, `PUBLISHED`, `SOLD_OUT`, `CANCELLED`, `POSTPONED`, `COMPLETED`), format, and page in the URL through the same `useUrlFilters` hook as Explore. Changing a filter resets the page, and first-time and filtered empty states are distinct. Organizer queries are marked `requiresSession` and are removed from the cache whenever the token changes.

`EventForm` takes `mode="create" | "edit"`, optional `defaultValues`, `initialVenue`, `initialTags`, and an `onSubmit(payload)` callback, so the future Edit page can reuse it. React Hook Form and Zod validate every field against the Nest DTO limits, including cross-field format rules. Times are entered in the selected IANA timezone and converted to UTC, with non-existent daylight-saving times rejected. `toEventPayload` omits `venueId` for online events and `onlineDetails` for in-person events, even when hidden sections still hold values. Nest validation and service errors are mapped to field-level messages; raw backend text is never shown.

The Manage event page (`/dashboard/events/[slug]`) is not implemented yet. Until it exists, Manage links and the post-create redirect load Next.js's not-found page, and that full page load ends the in-memory session.

