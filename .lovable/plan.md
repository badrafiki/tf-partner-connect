

# TF USA Partner Portal — Setup Plan

## Overview
Building a private B2B distributor portal for Total Filtration USA with full database schema, authentication, role-based routing, and layout shells.

## Brand & Design
- **Primary:** Navy `#1B3A6B`, **Accent:** Red `#CC2027`, **Background:** White/Light grey `#F8F9FA`
- **Font:** Inter (headings + body)
- Tailwind CSS variables updated to match brand

## Database (Supabase Migrations)
Create all 8 tables via migration:
- `user_roles` — role assignment (admin/partner)
- `partners` — distributor company records
- `applications` — public partner application submissions
- `products` — product catalog with cost/list pricing
- `enquiries` — partner price enquiries with line items
- `quotations` — formal quotes linked to enquiries
- `partner_favourites` — saved products per user
- `notifications` — partner notification inbox

Plus:
- `has_role()` security definer function
- Full RLS policies on all tables (admin full access, partners scoped to own data, public insert on applications)
- `products_partner_view` security barrier view (hides cost price from partners)

## Authentication
- Email/password only, no social providers
- `AuthContext` that loads user role + partner data on login
- Handles three states: no auth → login, auth but no role → pending, auth + role → portal/admin
- `ProtectedRoute` component with role-based access control
- Fully functional Login page, Reset Password page, and Pending Activation page

## Routing Structure
**Public routes:** `/login`, `/reset-password`, `/apply`, `/pending`

**Partner routes** (behind `PartnerLayout`): `/portal/dashboard`, `/portal/products`, `/portal/basket`, `/portal/quotations`, `/portal/account`

**Admin routes** (behind `AdminLayout`): `/admin/applications`, `/admin/distributors`, `/admin/products`, `/admin/enquiries`, `/admin/quotations`

Root `/` redirects to `/login`, `/portal` to `/portal/dashboard`, `/admin` to `/admin/applications`

## Layout Shells
**PartnerLayout** — Top nav bar (navy), logo + company name left, nav links center, notifications bell + account dropdown right. Mobile hamburger drawer.

**AdminLayout** — Left sidebar (white bg, navy accents), logo + "Admin" label, icon nav items with active state highlighting. Mobile collapsible sheet.

## Pages Built
- **LoginPage** — Centered card, logo, email/password, forgot password link, apply link
- **ResetPasswordPage** — Handles password reset flow from email links
- **PendingActivationPage** — Navy background, logo, "pending activation" message

All other pages will be placeholder stubs (title only) for prompts 2 and 3.

