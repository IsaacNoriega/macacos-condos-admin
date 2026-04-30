# Frontend Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the entire Angular frontend while preserving 100% of the existing functionality — only visual and UX improvements.

**Architecture:** The app is Angular 21 standalone components with CSS custom properties, glass morphism design system, and light/dark mode. Changes are pure CSS + HTML template updates; TypeScript logic stays untouched unless a new UI element requires it.

**Tech Stack:** Angular 21, TypeScript, pure CSS (no UI lib), Google Fonts (Outfit), FullCalendar (reservations)

---

## Files to create / modify

| File | Action | Change |
|---|---|---|
| `frontend/src/styles.css` | Modify | Add toast, modal, skeleton, empty-state global styles |
| `frontend/src/app/features/auth/login/login.page.html` | Modify | Split layout: brand panel + form panel |
| `frontend/src/app/features/auth/login/login.page.css` | Modify | Split layout, brand panel, link-based nav between panels |
| `frontend/src/app/features/layout/shell/shell.page.html` | Modify | Topbar in main area, hamburger icon, improved mobile toggle |
| `frontend/src/app/features/layout/shell/shell.page.css` | Modify | Active nav left-border accent, topbar, better mobile toggle |
| `frontend/src/app/features/layout/shell/shell.page.ts` | Modify | Computed property for active page title |
| `frontend/src/app/features/dashboard/dashboard.page.html` | Modify | Page header with greeting + quick actions, icon-based KPI cards |
| `frontend/src/app/features/dashboard/dashboard.page.css` | Modify | Header styles, icon KPI, quick actions strip |
| `frontend/src/app/features/dashboard/dashboard.page.ts` | Modify | Quick action routes, KPI icon mapping |
| `frontend/src/app/features/shared/crud/crud-page.component.html` | Modify | Skeleton loader state, better empty state, improved table |
| `frontend/src/app/features/shared/crud/crud-page.component.css` | Modify | Skeleton, empty state, table improvements |
| `frontend/src/app/features/pages/residents/*` | Modify | Polished resident cards, status toggle look |
| `frontend/src/app/features/pages/units/*` | Modify | Property-style cards with occupancy indicator |
| `frontend/src/app/features/pages/charges/*` | Modify | Card list with prominent status, date countdown |
| `frontend/src/app/features/pages/payments/*` | Modify | Invoice cards for residents, better history table |
| `frontend/src/app/features/pages/maintenance/*` | Modify | Ticket-style cards with priority border |
| `frontend/src/app/features/pages/reservations/*` | Modify | Better calendar styling (existing FullCalendar) |
| `frontend/src/app/features/pages/amenities/*` | Modify | Amenity grid cards |
| `frontend/src/app/features/pages/tenants/*` | Modify | Condo summary cards |
| `frontend/src/app/features/pages/users/*` | Modify | User table with avatars |

---

## Phase 1 — Global design system additions

**Files:** `frontend/src/styles.css`

- [ ] Add toast notification container + toast styles (success, error, info)
- [ ] Add modal overlay + modal-card styles
- [ ] Add skeleton loader animation + `.skeleton`, `.skeleton-text` classes
- [ ] Add `.empty-state` styles (centered, muted, illustration placeholder)
- [ ] Add `.page-header` utility (title + subtitle row with optional actions slot)
- [ ] Add `.status-badge` utility variants: paid, pending, overdue, active, inactive, cancelled, in-progress
- [ ] Commit: `style: add global utilities — toast, modal, skeleton, empty-state, status badges`

---

## Phase 2 — Login page + Shell

**Login files:** `login.page.html`, `login.page.css`

- [ ] HTML: Convert from centered card to 2-column split (`login-split` grid)
  - Left `.brand-panel`: gradient bg, logo icon SVG, title, tagline, 3 feature bullets
  - Right `.form-panel`: glass card, form content only (no brand)
  - Replace `<div class="tabs">` with inline link `<button class="text-link">` inside form footer
- [ ] CSS: `.login-split` at 768px+, single column on mobile (brand panel hidden)
- [ ] Commit: `style: login — split layout with brand panel`

**Shell files:** `shell.page.html`, `shell.page.css`, `shell.page.ts`

- [ ] HTML: Replace "Menu" text button with hamburger SVG icon button
- [ ] HTML: Add `<header class="shell-topbar">` inside `.shell-main` with page title (from computed signal) + theme toggle moved here on desktop
- [ ] TS: Add `activePage` computed signal from router URL → readable page name
- [ ] CSS: Active nav item gets `border-left: 3px solid var(--color-primary)` + stronger bg
- [ ] CSS: `.shell-topbar` sticky header for main content area
- [ ] CSS: Better hamburger button styling
- [ ] Commit: `style: shell — topbar, active nav accent, hamburger icon`

---

## Phase 3 — Dashboard

**Files:** `dashboard.page.html`, `dashboard.page.css`, `dashboard.page.ts`

- [ ] HTML: Add `.dashboard-header` section: greeting (user name) + date + quick-action buttons (Nuevo cargo, Ver pagos, Ver reportes)
- [ ] HTML: Replace `.kpi-dot` with `.kpi-icon` (SVG icon per KPI category)
- [ ] TS: Add `quickActions` array with label + route + icon; add `kpiIcons` mapping
- [ ] CSS: `.dashboard-header` flex row; `.kpi-icon` sizing and color tinting
- [ ] CSS: Quick action buttons — secondary pill style
- [ ] Commit: `style: dashboard — header with greeting, KPI icons, quick actions`

---

## Phase 4 — CRUD generic + Residents + Units

**CRUD files:** `crud-page.component.html`, `crud-page.component.css`

- [ ] HTML: Add skeleton rows (5 placeholder rows) shown while `loading` is true
- [ ] HTML: Add `.empty-state` block when `items.length === 0` and not loading
- [ ] CSS: Skeleton shimmer animation + empty state styles
- [ ] Commit: `style: crud — skeleton loader and empty state`

**Residents files:** `residents/residents.page.html`, `residents/residents.page.css`

- [ ] HTML: Add status dot next to avatar in card (active = green, inactive = gray)
- [ ] HTML: Add unit badge with building icon
- [ ] CSS: `.resident-card` hover: box-shadow lift + subtle scale
- [ ] CSS: `.status-dot` positioning on avatar (bottom-right, 10px circle)
- [ ] Commit: `style: residents — status dot on avatar, card hover lift`

**Units files:** `units/units.page.html`, `units/units.page.css`

- [ ] HTML: Add colored top band per type (Departamento=blue, Casa=green)
- [ ] HTML: Add occupancy indicator `X/5 residentes`
- [ ] CSS: `.unit-card-band` 4px top border per type; `.occupancy-bar` mini progress
- [ ] Commit: `style: units — type band, occupancy indicator`

---

## Phase 5 — Charges + Payments

**Charges:** `charges/charges.page.ts` (or html/css)

- [ ] Verify which files exist, read current structure
- [ ] Add prominent status badge (paid/pending/overdue) above amount
- [ ] Add due-date countdown label ("Vence en X días" / "Vencido hace X días")
- [ ] Commit: `style: charges — status badge, due-date countdown`

**Payments:** `payments/payments.page.html`, `payments/payments.page.css`

- [ ] Resident view: convert charge list items to invoice-card style with large amount, CTA buttons
- [ ] Admin view: timeline-style feed header per payment row
- [ ] Upload zone: add drag-and-drop styled area (`.drop-zone`)
- [ ] Commit: `style: payments — invoice cards, drop-zone upload`

---

## Phase 6 — Maintenance + Reservations + Amenities

**Maintenance:**

- [ ] Add priority border-left color coding (alta=red, media=amber, baja=gray)
- [ ] Add status progress dots (Abierto → En progreso → Resuelto)
- [ ] Commit: `style: maintenance — priority borders, status progress`

**Reservations:**

- [ ] Improve FullCalendar event styles (via `::ng-deep`)
- [ ] Better summary cards in insight-rail
- [ ] Commit: `style: reservations — calendar event styling`

**Amenities:**

- [ ] Convert table to amenity grid cards with icon placeholder
- [ ] Commit: `style: amenities — card grid`

---

## Phase 7 — Tenants + Users

**Tenants:**

- [ ] Card with condo name, status badge, unit count badge
- [ ] Active/inactive toggle styling
- [ ] Commit: `style: tenants — condo summary cards`

**Users:**

- [ ] Table rows: avatar initials column, role badge, last-seen
- [ ] Commit: `style: users — avatar column, role badge`

---

## Phase 8 — Compile + verify

- [ ] Run `ng build` in frontend directory, fix any TS/template errors
- [ ] Verify dark mode still works on each page
- [ ] Commit: `chore: verify build passes after frontend redesign`
