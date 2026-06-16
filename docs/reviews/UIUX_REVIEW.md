# UnifyDesk UI/UX Review — Frontend (`apps/web`)

**Date:** 2026-05-21  
**Scope:** Read-only review of `apps/web` and shared UI in `packages/ui` used by the React frontend.  
**Standard:** Enterprise-professional SaaS — visual consistency, accessibility (WCAG-oriented), resilient async UX, responsive layouts, clear navigation, and polished forms.  
**Context:** Post Phase 7 (KB); ticket queue layout recently widened (`max-w-[1600px]`) with denser filters and sidebar.

---

## Executive summary

The frontend has a coherent design language rooted in `usdColors`, Shadcn-adjacent Tailwind patterns, and reusable primitives (`Badge`, `Pill`, `StatCard`, `Overlay`, `SlaBar`). Core flows — login, ticket queue, full-page detail, manager dashboards — are functional and reasonably dense for support operations.

**Strengths**

- Ticket queue: list/grid toggle with `aria-pressed`, search `aria-label`, pagination `aria-label`, refetch overlay, and mobile activity panel with `aria-expanded` / `aria-controls`.
- `Overlay` exposes `role="dialog"`, `aria-modal`, titled via `aria-labelledby`, and a labeled close control.
- `TicketCard` detail regions support Enter/Space activation; conversation thread rows use `aria-expanded` / `aria-controls`.
- Login form: Zod validation, `role="alert"` on errors, `disabled` + label change during submit.

**Primary gaps for enterprise polish**

1. **Modals lack focus trap and Escape handling** — keyboard and screen-reader users can tab behind dialogs; accidental backdrop dismiss loses draft text.
2. **Comment/reply failures are silent** — `CommentModal` and `TicketDetailContent` post mutations have no `.catch` or `isError` UI.
3. **App header breaks on narrow viewports** — fixed horizontal nav + user block overflows without collapse or menu.
4. **Activity feed is read-only** — entries do not navigate to tickets; technician subtitle implies scoped feed but WebSocket events are org-wide.
5. **Inconsistent loading/error patterns** — plain text spinners predominate; `PanelSkeleton` / `EmptyStatePanel` rarely used; several views omit `isError` handling entirely.
6. **Auth secondary forms** — forgot/reset/invite lack submit locking and consistent validation feedback.
7. **Admin Integrations tab** — perpetual skeleton placeholders read as a broken page, not “coming soon.”

---

## Findings by priority

### HIGH

#### H-1 — Modal focus management and keyboard dismissal

| | |
|---|---|
| **Location** | `packages/ui/src/Overlay.tsx`; consumers: `CommentModal.tsx`, any future overlays |
| **Issue** | Dialog sets `role="dialog"` and `aria-modal` but does not move focus into the panel, trap tab order, restore focus on close, or listen for `Escape`. Backdrop click always calls `onClose`, which can discard in-progress comment/KB drafts without confirmation. |
| **Impact** | WCAG 2.4.3 (Focus Order), 2.1.1 (Keyboard), 2.4.11 (Focus Not Obscured). Power users and assistive-tech users lose context; accidental dismiss is common on trackpads. |
| **Fix** | Add a small `useFocusTrap` hook (or Radix/shadcn `Dialog`). On open: focus first focusable element (or title close button). Trap Tab/Shift+Tab inside panel. `Escape` → `onClose`. Optionally confirm close when `textarea` has content. Disable backdrop click-to-close when form is dirty. |

#### H-2 — Silent failure on comment/reply post

| | |
|---|---|
| **Location** | `CommentModal.tsx` (`send`, lines 47–56); `TicketDetailContent.tsx` (`submitReply`, lines 282–302) |
| **Issue** | `postComment.mutateAsync(...).then(onClose)` / `post.then(...)` with no `.catch`. `usePostTicketComment` exposes `isError` but it is never read. Network or permission errors leave the user with no feedback; modal may stay open with no explanation. |
| **Impact** | Support staff may believe a customer reply was sent when it was not — operational and trust risk. |
| **Fix** | Surface `postComment.isError` with `role="alert"` and a actionable message (“Could not post — check permissions or try again”). Keep modal open on failure. Mirror pattern from `CommentModal` AI draft error block. |

#### H-3 — App header not responsive

| | |
|---|---|
| **Location** | `AppHeader.tsx` |
| **Issue** | Single-row layout: logo block + inline `nav` (`ml-8`) + user email, role, avatar, logout (`ml-auto`). No hamburger, no truncation strategy, no `overflow` handling. On phones/tablets, nav links and user info clip or wrap awkwardly beside a 52px sticky bar. |
| **Impact** | Primary navigation may be unreachable or require horizontal scroll; unprofessional on mobile demos. |
| **Fix** | Below `md`/`lg`: collapse nav into a `Sheet`/`Drawer` or icon menu; shorten user block to avatar + menu; keep Tickets as primary visible link. Add `aria-expanded` on menu trigger. |

#### H-4 — Activity feed entries are not actionable

| | |
|---|---|
| **Location** | `ActivitySidebar.tsx` (`ActivityFeedEntry`, lines 35–77) |
| **Issue** | Feed rows render ticket ID, summary, and badges but are static `<li>` elements — no click, no `router` navigation, no keyboard handler. Users see “Action required” items with no one-click path to the ticket. |
| **Impact** | Extra friction: copy ID → search queue. Undermines the sidebar’s purpose for triage. |
| **Fix** | Wrap each entry in `<button>` or `<Link to={/tickets/${event.ticketId}}>` when `ticketId` present. Add `aria-label` (“Open ticket SCRUM-42: …”). On mobile panel, navigate and call `onClose()`. |

#### H-5 — Technician activity subtitle vs. actual data scope

| | |
|---|---|
| **Location** | `ActivitySidebar.tsx` (`technicianScoped` subtitle, lines 100–105); `useWebSocket.ts` + notifications store |
| **Issue** | UI copy says “Updates on your tickets” for technician-only roles, but the feed displays all org WebSocket events — only Jira/ME source pills filter client-side, not assignee. REST seed (`fetchRecentActivity`) may be scoped server-side, but live WS events are not filtered in UI. |
| **Impact** | Misleading UX; technicians see peers’ ticket activity while copy promises personal scope (also noted in security review). |
| **Fix** | Client-filter events by `assigneeId` matching current user when `technicianScoped`; or change copy to “Recent org updates” until backend WS scoping ships. Prefer server-side WS room per role. |

#### H-6 — `TicketDetailView` back navigation uses `navigate(-1)`

| | |
|---|---|
| **Location** | `TicketDetailView.tsx` (lines 18–25) |
| **Issue** | “← Back to tickets” calls `navigate(-1)`. Deep links (email, manager dashboard, KB cross-ref) send users to external history entries or blank history — not reliably to `/tickets`. |
| **Impact** | Dead-end navigation; users stranded after opening a ticket from another tab. |
| **Fix** | Use `navigate('/tickets')` or `Link to="/tickets"`. Optionally preserve query params via location state when coming from queue. |

---

### MEDIUM

#### M-1 — Inconsistent page title and heading scale

| | |
|---|---|
| **Location** | `TechnicianTicketsView.tsx` (`text-[22px]`); `ManagerDashboardView.tsx`, `AdminPanelView.tsx`, `KnowledgeBaseView.tsx` (`text-[26px]`) |
| **Issue** | Primary `h1` sizes differ by 4px with no semantic reason; technician queue feels subordinate to manager/admin despite being the main daily workspace. |
| **Fix** | Standardize on one page-title token (e.g. `text-2xl font-extrabold`) in a shared `PageHeader` component with optional subtitle slot. |

#### M-2 — Filter pill active state inconsistency

| | |
|---|---|
| **Location** | `packages/ui/src/Pill.tsx` (active = `bg-gray-900`); `ViewModeToggle.tsx` (active = `bg-usd-indigo`) |
| **Issue** | Two “selected” visual languages on the same ticket queue screen — filters look like neutral chips; view mode uses brand indigo. |
| **Fix** | Unify: either indigo for all primary selections or gray-900 for all; document in design tokens. Add `aria-pressed={active}` to `Pill`. |

#### M-3 — Loading and skeleton patterns underused

| | |
|---|---|
| **Location** | `TechnicianTicketsView.tsx`, `TicketDetailView.tsx`, `ManagerDashboardView.tsx`, `KnowledgeBaseView.tsx`, `KbArticleView.tsx` vs. `PanelSkeleton.tsx`, `EmptyStatePanel.tsx` (only `AdminHealthTab`, `AdminIntegrationsTab`, `ManagerInsightsTab`) |
| **Issue** | Most views use a single line (“Loading tickets…”) or a lone spinner. No layout-preserving skeleton for queue, detail, or KB list. Perceived performance and visual jump on load. |
| **Fix** | Add `TicketListSkeleton`, `TicketDetailSkeleton`, reuse `PanelSkeleton` for manager/admin cards. Pair with `aria-busy` on loading regions. |

#### M-4 — Missing error states on several data views

| | |
|---|---|
| **Location** | `ManagerDashboardView.tsx` (no `isError` on `useTicketsList`); `KnowledgeBaseView.tsx` (no `query.isError`); `KbArticleView.tsx` (treats error same as not found); `ManagerReportingTab.tsx` (error without `role="alert"`) |
| **Issue** | API failures show empty dashboards, “not found,” or gray text — indistinguishable from legitimate empty data. |
| **Fix** | Dedicated error panels with retry button (`refetch()`), `role="alert"`, and support-appropriate copy. Distinguish 404 vs. 500 in KB article view. |

#### M-5 — Auth secondary forms: no double-submit protection

| | |
|---|---|
| **Location** | `ForgotPasswordView.tsx`, `ResetPasswordView.tsx`, `AcceptInviteView.tsx` |
| **Issue** | Submit buttons never `disabled` during async work; no “Sending…” label. Users can double-click and fire duplicate emails/API calls. Field-level validation is HTML `required` / `minLength` only — no inline Zod messages like login. |
| **Fix** | Mirror `LoginView`: `isSubmitting` state, `disabled` button, `role="alert"` errors, optional `react-hook-form` + shared schemas. |

#### M-6 — `KbDraftForm` save failures silent; weak validation

| | |
|---|---|
| **Location** | `KbDraftForm.tsx` (`saveDraft`, lines 28–44) |
| **Issue** | `createKb.mutateAsync` has no `.catch`; `createKb.isError` unused. Empty title/problem can be submitted (trimmed empty strings). No `role="alert"` on failure. |
| **Fix** | Disable save when required fields empty; show API error; use `role="status"` on success (already partial). Consider Zod schema from shared-types. |

#### M-7 — AI draft errors missing on full ticket detail

| | |
|---|---|
| **Location** | `TicketDetailContent.tsx` (`draftCommentAi`, triage suggest) vs. `CommentModal.tsx` (has `ai.isError`) |
| **Issue** | Inline “AI: draft comment” and triage suggest do not surface `ai.isError` or degraded states consistently. User clicks generate and nothing happens visually on failure. |
| **Fix** | Reuse CommentModal pattern: `role="alert"` under AI buttons; show degraded badge when `degraded === true` on triage response. |

#### M-8 — Notification bell: emoji icon, dropdown a11y gaps

| | |
|---|---|
| **Location** | `NotificationBell.tsx` |
| **Issue** | Uses literal 🔔 (inconsistent rendering across OS; not a proper icon component). Dropdown lacks `aria-expanded`, focus trap, Escape to close, arrow-key navigation. Items only “mark read” — no deep link to related ticket. |
| **Fix** | Replace with `lucide-react` `Bell`; add `aria-expanded`; trap focus in panel; optional `Link` per notification when `ticketId` in payload. |

#### M-9 — Tab interfaces lack ARIA tab pattern

| | |
|---|---|
| **Location** | `ManagerDashboardView.tsx`, `AdminPanelView.tsx` |
| **Issue** | Tab buttons are plain `<button>` without `role="tablist"` / `role="tab"` / `aria-selected` / `aria-controls` / keyboard Left/Right. |
| **Fix** | Implement WAI-ARIA tabs or use a headless tab primitive. Associate each tab panel with `id` + `tabIndex={0}` on active panel only. |

#### M-10 — `TicketCard` interactive region missing accessible name

| | |
|---|---|
| **Location** | `TicketCard.tsx` (grid/list detail `role="button"` regions, lines 151–157, 207–212) |
| **Issue** | Focusable regions have no `aria-label` describing ticket ID + summary. Screen readers announce “button” without context. |
| **Fix** | `aria-label={`Open ticket ${formatTicketDisplayId(ticket)}: ${ticket.summary}`}`. Ensure nested action buttons remain outside the labeled region (current structure is OK). |

#### M-11 — Admin Integrations tab appears permanently loading

| | |
|---|---|
| **Location** | `AdminIntegrationsTab.tsx` |
| **Issue** | Renders only `PanelSkeleton` with no “Coming soon” copy, no empty state, no CTA. Admins perceive broken integrations or hung network. |
| **Fix** | Replace with `EmptyStatePanel`: title, explanation, link to env-based setup docs or “Contact admin.” Remove shimmer skeleton unless actually fetching. |

#### M-12 — 403 page is a dead end

| | |
|---|---|
| **Location** | `router.tsx` (`Forbidden`, lines 17–22) |
| **Issue** | Plain text “403 — insufficient permissions.” inside `AppShell` with no link to `/tickets` or logout guidance. |
| **Fix** | Branded empty state: explanation, “Go to tickets” button, optional “Sign out.” `role="alert"` on heading. |

---

### LOW

#### L-1 — Hardcoded hex colors beside design tokens

| | |
|---|---|
| **Location** | `TicketCard.tsx` (Jira/ME link backgrounds `#eff6ff`, `#f5f3ff`); `AppShell.tsx`, `LoginView.tsx` (`bg-[#f9fafb]`) |
| **Issue** | Bypasses `usdColors` / Tailwind theme extension; harder to theme or dark-mode later. |
| **Fix** | Map to Tailwind utilities (`bg-blue-50`, `bg-gray-50`) or extend `usdColors` in `packages/ui`. |

#### L-2 — Login password toggle lacks accessible name

| | |
|---|---|
| **Location** | `LoginView.tsx` (Show/Hide button, lines 100–106) |
| **Issue** | Button has no `aria-label` (“Show password” / “Hide password”); not announced meaningfully. |
| **Fix** | `aria-label={showPass ? 'Hide password' : 'Show password'}`; `aria-pressed` optional. |

#### L-3 — Collapsible thread rows use decorative Unicode arrows

| | |
|---|---|
| **Location** | `TicketDetailContent.tsx` (`CollapsibleThreadRow`, lines 87–88) |
| **Issue** | `▶` / `▼` marked `aria-hidden` but no visible text alternative for expand state beyond `aria-expanded`. |
| **Fix** | Acceptable if `aria-expanded` is reliable; optionally add visually hidden “Expand conversation” text or lucide chevron with `aria-hidden`. |

#### L-4 — List view hides assignee/status on smaller breakpoints

| | |
|---|---|
| **Location** | `TicketCard.tsx` (list layout: `hidden md:inline`, `hidden lg:inline`, `hidden sm:block` on SLA) |
| **Issue** | Mobile list rows show only ID + title + triage ring — assignee and SLA dropped without an alternative. |
| **Fix** | Show compact second line on `sm` with assignee + SLA dot, or expose via grid mode default on mobile. |

#### L-5 — Manager briefing rendered in `<pre>`

| | |
|---|---|
| **Location** | `ManagerOverviewTab.tsx`, `ManagerSentimentTab.tsx` |
| **Issue** | AI briefing uses monospace `pre` — feels like debug output, not executive summary. |
| **Fix** | Render as `div` with `prose` / `whitespace-pre-wrap` and normal sans-serif. |

#### L-6 — Placeholder metric undermines trust

| | |
|---|---|
| **Location** | `ManagerDashboardView.tsx` — StatCard “SLA breach risk” value `"—"` |
| **Issue** | Looks unfinished next to live metrics. |
| **Fix** | Hide until reporting API wired, or compute from ticket list; add tooltip “Available in Reporting tab.” |

#### L-7 — Developer-facing API hint in manager UI

| | |
|---|---|
| **Location** | `ManagerReportingTab.tsx` (line 37–38) |
| **Issue** | Shows raw `GET /api/reports/volume?format=csv` to end users. |
| **Fix** | Replace with “Export CSV” button calling the API, or remove until implemented. |

#### L-8 — Refetch overlay not announced to screen readers

| | |
|---|---|
| **Location** | `TechnicianTicketsView.tsx` (lines 179–186) |
| **Issue** | Pagination/filter refetch shows spinner with `aria-hidden` on overlay — no `aria-live` “Updating tickets.” |
| **Fix** | Add `aria-live="polite"` region tied to `isFetching`; keep overlay `pointer-events-none` (good). |

#### L-9 — `InviteUserForm` styling and validation below login bar

| | |
|---|---|
| **Location** | `InviteUserForm.tsx` |
| **Issue** | Basic inputs, no `disabled` on submit during pending, success/error as plain text without `role`. |
| **Fix** | Align with login form patterns; disable submit when `invite.isPending`. |

#### L-10 — External system links lack descriptive labels

| | |
|---|---|
| **Location** | `TicketCard.tsx` (“Jira” / “ME”); `CommentModal.tsx` (“Open in Jira”) |
| **Issue** | Short labels may be ambiguous for screen readers out of context. |
| **Fix** | `aria-label={`Open ${ticket.externalId} in Jira`}` on anchors. |

#### L-11 — Knowledge base browse: no empty-vs-error distinction

| | |
|---|---|
| **Location** | `KbArticleList.tsx`, `KnowledgeBaseView.tsx` |
| **Issue** | Empty search shows “No published articles found” — same as failed load if error handling added later without care. |
| **Fix** | When implementing M-4, use different copy and iconography for error vs. zero results. |

#### L-12 — Ticket detail duplicate loading gates

| | |
|---|---|
| **Location** | `TicketDetailView.tsx` and `TicketDetailContent.tsx` both call `useTicketDetail` and show loading |
| **Issue** | Redundant fetch (React Query dedupes network, but duplicate loading UI logic). Brief flash possible if parent passes before child mounts. |
| **Fix** | Single loading owner: view handles shell + back link; content assumes ticket exists or receives props. |

---

## Category cross-reference

| Category | Highest-severity items |
|----------|------------------------|
| **1. Visual consistency** | M-1, M-2, L-1, L-5 |
| **2. Accessibility** | H-1, M-8, M-9, M-10, L-2, L-3, L-8 |
| **3. Loading / empty / error** | M-3, M-4, M-7, M-11, L-8, L-11 |
| **4. Responsive** | H-3, L-4; ticket filters (`TicketFilters.tsx`) wrap adequately at `xl`; activity panel `w-[min(100%,20rem)]` is solid |
| **5. UX flow** | H-4, H-5, H-6, M-12, L-7 |
| **6. Information density & professionalism** | M-11, L-5, L-6, L-7, H-5 |
| **7. Form UX** | H-2, M-5, M-6, L-9; **Login** is reference implementation |

---

## Positive patterns to preserve

- **`ViewModeToggle`** — `role="group"`, `aria-pressed`, lucide icons, indigo active state.
- **`TicketFilters`** — labeled filter groups, compact pills, search `aria-label`, debounced search in parent.
- **`TicketPagination`** — accessible control (per tests and component design).
- **`LoginView`** — `react-hook-form` + Zod, root error `role="alert"`, submit disabled state, demo hints gated by env.
- **Activity mobile panel** — backdrop, `id="activity-panel"`, `aria-label` on aside, close control.
- **Sentiment / reporting charts** — structured sections with headings; sentiment tab documents ME-only scope.

---

## Suggested remediation order

1. **H-2** — Comment post error surfacing (low effort, high operational value).  
2. **H-1** — Modal focus trap + Escape (shared `Overlay` fix benefits all modals).  
3. **H-6** — Deterministic back link on ticket detail.  
4. **H-4** — Clickable activity feed entries.  
5. **H-3** — Responsive header.  
6. **H-5** — Align technician feed copy or filtering with data scope.  
7. **M-3 / M-4** — Standardize loading/error components across views.  
8. **M-5 / M-6** — Auth + KB form parity with login.

---

## Test coverage notes

Existing RTL tests cover many happy paths (`TicketCard`, `ActivitySidebar`, `TicketDetailView`, `LoginView`). Gaps useful for UX hardening:

- Overlay: focus trap and Escape (unit test on hook).  
- `CommentModal`: assert error message when `mutateAsync` rejects.  
- `TicketDetailView`: back link targets `/tickets` not `history -1`.  
- `AppHeader`: snapshot or viewport test at 375px width.

---

*Review performed without code changes. Re-run after major UI phases (Phase 8 notifications, Phase 9 admin hardening) or when integrating a component library dialog primitive.*
