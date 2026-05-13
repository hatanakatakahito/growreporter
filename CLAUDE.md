# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GrowReporter is a Japanese-language web analytics dashboard that integrates Google Analytics 4 (GA4) and Google Search Console (GSC) data with AI-powered insights. It's a React SPA with a Firebase serverless backend.

## Commands

### Frontend Development
- `npm run dev` — Start Vite dev server on port 3000
- `npm run build` — Production build to `dist/`
- `npm run lint` — ESLint check
- `npm run preview` — Preview production build locally

### Cloud Functions
- `cd functions && npm run serve` — Start Firebase emulators (functions + firestore)
- `cd functions && npm run deploy` — Deploy only Cloud Functions
- `cd functions && npm run logs` — View function logs

### Full Deploy
- `npm run deploy` — Build frontend + deploy everything to Firebase
- `npm run deploy:hosting` — Build + deploy only hosting

**Note:** No test framework is configured. There are no unit or integration tests.

## Architecture

### Frontend (src/)
- **React 19** + **React Router DOM 7** + **Vite 6** + **Tailwind CSS 3**
- **React Query** (`@tanstack/react-query`) for all server state and caching
- Path alias: `@/` maps to `src/`
- Pure JavaScript (no TypeScript)

**Context provider hierarchy** (App.jsx): `QueryClientProvider` > `AuthProvider` > `Router` > `SiteProvider` > `SidebarProvider`
- `AuthContext` — Firebase Auth state + user profile from Firestore
- `SiteContext` — Currently selected site, date range, admin mode toggle
- `SidebarContext` — Sidebar collapse state

**Routing** (App.jsx):
- Public routes: Login, Register, AcceptInvitation, OAuthCallback
- `<ProtectedRoute>` wraps all authenticated routes inside `<MainLayout>`
- `<AdminRoute>` + `<AdminLayout>` wraps admin-only routes under `/admin/*`

**Key page groups:**
- `pages/Analysis/` — 15+ analysis views (Day, Week, Hour, Users, Channels, Keywords, Pages, PageFlow, Conversions, etc.)
- `pages/Admin/` — Admin dashboard, user/site management, logs, settings
- `components/GrowReporter/SiteRegistration/` — Multi-step site setup wizard

**Custom hooks** (`src/hooks/`): 23 hooks, all using `useQuery` from React Query for data fetching. Pattern:
```js
import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export function useGA4Data(siteId, startDate, endDate, metrics, dimensions, ...) {
  return useQuery({
    queryKey: ['ga4-data', siteId, startDate, endDate, metrics, dimensions],
    queryFn: async () => {
      const fetchGA4 = httpsCallable(functions, 'fetchGA4Data');
      const result = await fetchGA4({ siteId, startDate, endDate, metrics, dimensions });
      return result.data;
    },
    enabled: !!siteId && !!startDate && !!endDate,
  });
}
```

**Firebase client config** (`src/config/firebase.js`): Exports `auth`, `db`, `storage`, `functions` (initialized with `asia-northeast1` region), `googleProvider`, `microsoftProvider`.

### Backend (functions/src/)
- **Firebase Cloud Functions v2** (Node 20, ESM modules, `asia-northeast1` region)
- All callable functions use a **lazy-loading pattern** via `lazyCallable()` in `index.js` to avoid deployment timeouts

**`lazyCallable` pattern** (functions/src/index.js):
```js
function lazyCallable(modulePath, exportName, opts = {}) {
  return onCall({ region: 'asia-northeast1', cors: true, ...opts }, async (req) => {
    const m = await import(modulePath);
    return m[exportName](req);
  });
}
// Usage:
export const fetchGA4Data = lazyCallable('./callable/fetchGA4Data.js', 'fetchGA4DataCallable', { memory: '512MiB', timeoutSeconds: 60 });
```
**Exception:** `fetchMetadata` and `refreshSiteMetadataAndScreenshots` use direct `onCall` with manual lazy imports because they need custom request shapes.

**Function categories:**
- `callable/` — HTTP callable functions (GA4/GSC data fetching, OAuth, AI, member management)
- `callable/admin/` — Admin-only callable functions
- `callable/consultant/` — Consultant-related functions
- `triggers/` — Firestore document triggers (onSiteCreated, onSiteChanged, onScrapingJobCreated)
- `scheduled/` — Cron jobs (weekly/monthly reports, cache cleanup, limit resets, alert checks)
- `utils/` — Shared utilities (tokenManager, cacheManager, aiCacheManager, planManager, emailSender)
- `prompts/templates.js` — Centralized AI prompt templates for all page types

**Key backend utilities:**
- `tokenManager.js` — OAuth token refresh with 5-minute buffer before expiry
- `cacheManager.js` — 1-hour TTL caching of GA4/GSC data in Firestore `api_cache` collection
- `aiCacheManager.js` — Separate cache for AI generation results
- `permissionHelper.js` — Checks if user can access sites
- `planManager.js` — Server-side plan limit enforcement

### Data Flow
1. Frontend calls Cloud Functions via `httpsCallable` (Firebase SDK, region: `asia-northeast1`)
2. Functions authenticate via Firebase Auth context, then fetch GA4/GSC APIs using stored OAuth tokens
3. OAuth refresh tokens are stored encrypted in Firestore `users/{uid}/oauth_tokens`
4. AI summaries/improvements/chat (Google Gemini — model via `GEMINI_MODEL`, default `gemini-2.5-flash` / `gemini-2.5-flash-lite`) are cached in Firestore with generation tracking

### Plan System (2-tier、旧 standard/premium は business に正規化)
Defined in `src/constants/plans.js`, enforced dual-layer: client-side via `usePlan` hook, server-side via `functions/src/utils/planManager.js`:
- **Free**: 1 site、AI 機能(サマリ・改善・チャット・診断)＆エクスポート(Excel/PPTX)はすべて 0、**メンバー招待は最大 3 人**
- **Business**: 3 sites、AI/エクスポートすべて無制限、メンバー招待は実質無制限
- 旧プラン (`standard` / `premium` / `paid`) は backend (`planManager.normalizePlan`) で `business` と同等扱いに正規化される
- Admin can override per-user via `customLimits` collection

### Firestore Collections
- `users/{uid}` + sub-collection `oauth_tokens` — User profiles and OAuth credentials
- `sites/{siteId}` + sub-collections (`alerts`, `improvements`, `pageNotes`, `pageScrapingData`, etc.)
- `accountMembers/{id}` — Multi-user account membership
- `invitations/{id}` — Member invitations (7-day expiry)
- `adminUsers/{uid}` — Admin roles (admin/editor/viewer)
- `plans/{id}`, `customLimits/{id}` — Plan configuration and overrides

### Security
- Firestore security rules in `firestore.rules` (~490 lines) implement RBAC
- Helper functions: `isAdminUser()`, `isEditorOrAdmin()`, `isGrowStaff()`, `isAccountMember()`, `getMemberRole()`, `isOwnerOrEditor()`, `memberCanReadSite()` / `viewerCanReadSite()`, `isSafeSelfUpdate()`, `isSiteOwner()`
- Member roles: owner, editor, viewer (at account level)
- **viewer は `users.allowedSiteIds` 配列に含まれるサイトのみ閲覧可**（`firestore.rules` 内 `viewerCanReadSite(siteId)` で強制）。owner/editor は無条件で全サイト読取可
- viewer の AI 生成・Excel/PPTX エクスポートはオーナーのプラン枠を消費して実行可能
- viewer の手動編集（改善案/メモ等）は不可（既存 `isOwnerOrEditor` ガードで自動的に拒否）
- **重要**: `isSafeSelfUpdate` の allowlist に `allowedSiteIds` を追加してはならない。書込は Cloud Function `updateViewerAllowedSites`（Admin SDK）経由のみ。同様に `memberRole` / `accountOwnerId` / `memberships` も allowlist 外で維持
- viewer/editor の閲覧サイト管理 UI: `Members.jsx` →「ロール管理」ボタン → `RoleManagementModal.jsx`（`SiteCheckboxList.jsx` でサイト割当）
- サイト削除時は `onSiteDeleted` トリガーで全 viewer の `allowedSiteIds` から自動除去
- Admin roles: admin, editor, viewer (at platform level)
- Two-tier identity: users can be both account owners AND members of other accounts via `memberships` map

## Code Conventions

- **Language**: All UI text and code comments are in Japanese
- **ESLint**: Flat config (`eslint.config.js`), unused vars allowed if capitalized or prefixed with `_`
- **Prettier**: Uses `prettier-plugin-tailwindcss` for class sorting
- **Charting**: Recharts (primary); `d3` / `d3-sankey` for the user-journey Sankey diagram
- **Notifications**: `react-hot-toast`
- **Icons**: `@heroicons/react` and `lucide-react`
- **UI primitives**: `@headlessui/react` for dialogs, menus, transitions
- **Date handling**: `date-fns` (both frontend and backend)
- **Excel export**: `xlsx-js-style`
- **Cloud Functions**: Always use the `lazyCallable()` pattern in `index.js` for new callable functions. Direct `onCall` is used only for functions needing custom request shape (e.g., `fetchMetadata`, `scrapeTop100Pages`)
- **Tailwind custom colors**: `primary` (#3758F9), `secondary` (#13C296 green), `dark` scale (dark → dark-8). Gradients: `bg-gradient-primary` (blue→purple, onboarding only), `bg-gradient-ai` (blue→purple→pink 3-color, AI features), `bg-gradient-business` (red→pink, plan upgrade)
- **Button regulation**: Always use `<Button variant="...">` from `src/components/ui/button.jsx`. Available variants: `primary` / `secondary` / `ghost` / `success` / `danger` / `danger-outline` / `ai` / `upgrade`. **Do NOT** inline `bg-blue-*`, `bg-green-*`, `bg-red-*`, `bg-primary`, or `from-* to-*` gradients on `<button>` elements. Full spec: [docs/UI_BUTTON_REGULATION.md](docs/UI_BUTTON_REGULATION.md). AI gradient = `bg-gradient-ai` (blue→purple→pink, 3-color), Upgrade gradient = `bg-gradient-business` (red→pink, matches Business plan badge).

## Environment Variables

Frontend (`.env`, `VITE_` prefix):
- Firebase config: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
- Google OAuth: `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_SECRET`, `VITE_GCP_PROJECT_ID`
- AI: `VITE_GEMINI_API_KEY`, `VITE_GEMINI_MODEL`

Backend: Uses Firebase Secret Manager for `GEMINI_API_KEY`
