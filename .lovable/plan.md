

## Remaining Gaps from the Original Spec

After a thorough review of every file against the original instruction set, here are the items that were missed or incorrectly implemented:

### 1. Apply page — Progress indicator colors are inverted
**Spec**: Complete = navy background, white number. Active/current = white background, navy border, navy number.
**Current**: Complete = `bg-white text-primary` (white bg, navy text — backwards). Active = `bg-white/20 text-white` (translucent, not white with navy border).

**Fix**: Swap the complete state to `bg-primary text-white` (navy bg, white text). Change active to `bg-white text-primary border border-white` on the navy bar.

### 2. Apply page — Missing footer
**Spec**: Simple centred footer: "© 2026 Total Filtration USA LLC | Privacy Policy | Terms & Conditions". All 12px grey.
**Current**: No footer exists on the /apply page at all.

**Fix**: Add a centred footer below the form with the three items separated by pipes.

### 3. Apply page — Submit button text and weight
**Spec**: "Submit Application →" (with arrow), font-weight 500.
**Current**: "Submit Application" (no arrow), font-weight 600 (`font-semibold`).

**Fix**: Add the arrow and change to `font-medium` (500).

### 4. Apply page — InfoBox left-border-only styling
**Spec**: Light blue background (#EFF6FF), blue left border (3px) only, 12px blue text.
**Current**: `bg-blue-50 border border-blue-200` — has borders on all four sides.

**Fix**: Change to `border-l-[3px] border-l-blue-400 border-0` (left border only).

### 5. Dashboard — Tier badge colors don't match spec
**Spec**: Silver #9CA3AF, Gold #F59E0B, Platinum #6366F1, Diamond #06B6D4 — all with white text.
**Current**: Silver #C0C0C0, Gold #FFD700, Platinum #E5E4E2, Diamond #B9F2FF — with navy text.

**Fix**: Update to exact spec values with white text for all tiers.

### 6. Login page — Tagline opacity
**Spec**: "white 50% opacity" for the bottom tagline.
**Current**: `text-white/40` (40%).

**Fix**: Change to `text-white/50`.

### Files to edit
- `src/pages/ApplicationPage.tsx` — fixes 1, 2, 3, 4
- `src/pages/portal/PortalDashboard.tsx` — fix 5
- `src/pages/LoginPage.tsx` — fix 6

All changes are visual only — no functional or logic changes.

