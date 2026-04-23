

# Fix Partner Invitation Flow & Email Deliverability

## What's happening today (answers to your questions)

**1. What happens after you approve in admin?**
The "Approve & Invite" button does four things:
1. Creates a `partners` row (company, contact, tier, discount).
2. Tries to create a customer record in ModuSys (ERP).
3. Calls `invite-partner` which uses Supabase's built-in `inviteUserByEmail` — this sends a generic Supabase invite email containing a magic link to `/reset-password` where the partner sets their own password.
4. Marks the application as `approved`.

**No password is auto-generated.** The partner is expected to click the invite link and set their own.

**2. Why doesn't Vertica know their login?**
Vertica was approved on Apr 14. A partner row + auth user were created. The `inviteUserByEmail` call was made — but:
- It uses Supabase's **default sender** (not your branded `notify.modusys.io` / `total-filtration.com` domain), which has terrible deliverability and almost always lands in spam.
- The email is the plain Supabase invite template — easy to miss or distrust.
- There is no separate "You've been approved!" notification confirming what to do next.

So Shane at Vertica likely received an unbranded email from a Supabase address that he ignored or never saw.

**3. Why are emails hitting junk?**
Two problems:
- **Auth/invite emails** go through Supabase's default sender — no SPF/DKIM alignment with your domain. These are the worst offenders.
- **Notification emails** (`notify-new-application`, `notify-rejection`, etc.) send from `notifications@total-filtration.com` via Resend, but your project's verified Lovable email domain is `notify.modusys.io`. If `total-filtration.com` isn't fully DKIM/SPF-verified in Resend, those go to spam too.

---

## Proposed fix

### 1. Branded auth emails (fixes invites + spam)

Set up Lovable's auth email hook so all Supabase auth emails (invites, password resets, email change confirmations) are sent from your verified domain `notify.modusys.io` — or set up `notify.total-filtration.com` instead so the sender matches your brand. I recommend `notify.total-filtration.com` since partners know that domain.

This will:
- Replace the generic Supabase invite with a branded TF USA "You're approved — set your password" email.
- Send from a verified domain with proper SPF/DKIM/DMARC, dramatically improving inbox placement.
- Use your existing brand styling (navy #1B3A6B, red accent, Inter font, TF USA logo).

### 2. Dedicated "Application Approved" notification

Add a separate transactional email sent at approval time to `contact_email` that says clearly:
- "Your application has been approved"
- Company name, tier, discount
- A button: "Set your password and sign in" → links to `/reset-password` with a fresh recovery link
- Brief "what's next" guidance + support contact

This way even if the auth invite email is missed, the partner gets an obvious branded message they recognize.

### 3. Resend Vertica's invite

After the email infrastructure is in place, regenerate a fresh recovery link for `shane@verticasupply.com` so they can finally activate. (Do this from the Distributors page → Vertica → "Resend invite" button which already exists, or I can trigger it once.)

### 4. Switch existing notification emails to the verified domain

Change all the `notify-*` and `submit-enquiry` etc. functions to send from the verified Lovable domain (so SPF/DKIM are aligned), instead of `total-filtration.com` which may not be properly authenticated in your Resend account.

---

## Technical changes

- Run `email_domain--scaffold_auth_email_templates` to generate `auth-email-hook` + 6 React Email templates (signup, recovery, invite, magic-link, email-change, reauth).
- Apply TF USA branding (navy header, Inter font, logo, white body) to all 6 templates.
- Deploy `auth-email-hook`.
- Run `email_domain--scaffold_transactional_email` so we can send the new "Application Approved" email through Lovable's queued sender (better retry + suppression handling than direct Resend calls).
- Create one new template `application-approved.tsx` and call it from `ApplicationDetailSheet.handleApprove` after `invite-partner` succeeds.
- Update existing `notify-*` functions' `from:` address to `noreply@notify.modusys.io` (or `noreply@notify.total-filtration.com` once that subdomain is set up — recommended).
- For Vertica specifically: trigger a new recovery email from the admin Distributors page.

## Decisions needed before I implement

1. **Sender domain**: stay on `notify.modusys.io`, or set up `notify.total-filtration.com` (recommended — partners trust the TF brand). The latter requires you to add 2 NS records at your domain registrar.
2. **Approval email content tone**: formal ("Your application has been approved") or warmer ("Welcome to TF USA")?

