import { useEffect } from "react";
import { LegalLayout } from "@/components/layouts/LegalLayout";

const sections = [
  {
    title: "1. Who We Are",
    content: `Total Filtration USA LLC ("TF USA", "we", "us") operates the TF USA Partner Portal at partners.total-filtration.com. We are a distributor of industrial filtration and air quality systems based in Winter Garden, Florida. This policy applies to all US and Canadian distributors and applicants who use the Partner Portal or submit a distributor application.`,
  },
  {
    title: "2. What Information We Collect",
    content: `**Information you provide when applying:**

• Business information: legal business name, DBA name, EIN, business type, business address
• Contact information: name, title, email address, phone number
• Financial information: requested credit limit, payment terms preference, bank name and account details (for ACH/wire payment setup), annual purchasing volume estimate
• Tax information: tax exemption status, resale certificate details, state(s) of resale
• Trade references: company names, contact names, email addresses and phone numbers of your trade references
• Distribution profile: geographic coverage, sales channels, industries served

**Information collected automatically:**

• Login activity and session data via our authentication system
• Enquiry and quotation history generated through your use of the portal`,
  },
  {
    title: "3. How We Use Your Information",
    content: `• To review and process your distributor account application
• To set up and manage your partner account
• To provide you with access to the TF USA product catalog and pricing
• To process enquiries and issue quotations
• To communicate with you about your account, orders and quotations
• To comply with legal and tax obligations
• To maintain records required for our business operations`,
  },
  {
    title: "4. Who We Share Your Information With",
    content: `**ModuSys ERP:** Your company and contact details are shared with our internal ERP system (ModuSys) to create and manage your customer record. This system is operated by TF USA and is not a third party.

**Zoho Books:** Basic customer information (company name, contact, address) is shared with Zoho Books for invoicing purposes. Zoho's privacy policy is available at zoho.com/privacy.

**Resend:** We use Resend to send transactional emails (account invitations, quotation notifications, order updates). Email addresses are shared with Resend for this purpose only. Resend's privacy policy is available at resend.com/privacy.

**Trade references:** Contact details you provide for trade references may be used to contact those references as part of our credit assessment process.

We do not sell, rent or share your personal information with any third parties for marketing purposes.`,
  },
  {
    title: "5. How We Store and Protect Your Information",
    content: `Your data is stored securely using industry-standard cloud database infrastructure. Data is encrypted in transit (TLS) and at rest. Access is restricted to authorised TF USA personnel only. Banking information is stored only for the purpose of account setup and is not shared beyond what is necessary for payment processing.`,
  },
  {
    title: "6. How Long We Keep Your Information",
    content: `• Active partner accounts: retained for the duration of the business relationship plus 7 years for tax and legal compliance
• Declined or withdrawn applications: retained for 12 months then deleted
• Enquiry and quotation records: retained for 7 years`,
  },
  {
    title: "7. Your Rights",
    content: `As a business user, you have the right to:

• Request access to the personal information we hold about you
• Request correction of inaccurate information
• Request deletion of your information (subject to legal retention requirements)
• Withdraw consent where processing is based on consent

Canadian applicants and partners may also have rights under Canada's Personal Information Protection and Electronic Documents Act (PIPEDA), including the right to access, correct, and challenge compliance with these principles. For more information on your rights under PIPEDA, visit the Office of the Privacy Commissioner of Canada at priv.gc.ca.

To exercise any of these rights, contact us at partners@total-filtration.com.`,
  },
  {
    title: "8. Cookies",
    content: `The partner portal uses essential cookies for authentication and session management, and Google Analytics 4 (GA4) to understand how partners use the portal. GA4 collects anonymised usage data including pages visited, features used and session duration. No personally identifiable information is sent to Google Analytics. You can opt out of Google Analytics tracking using the Google Analytics Opt-out Browser Add-on available at tools.google.com/dlpage/gaoptout.`,
  },
  {
    title: "9. Changes to This Policy",
    content: `We may update this privacy policy from time to time. We will notify active partners of material changes via email.`,
  },
  {
    title: "10. Contact Us",
    content: `Total Filtration USA LLC
Winter Garden, FL 34787
partners@total-filtration.com`,
  },
];

export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = "Privacy Policy — TF USA Partner Portal";
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex");
    return () => { meta?.remove(); };
  }, []);

  return (
    <LegalLayout>
      <h1 className="text-[28px] font-bold text-[#1B3A6B] mb-1">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: April 10, 2026</p>

      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold text-[#1B3A6B] border-l-[3px] border-[#CC2027] pl-4 mb-4">
              {s.title}
            </h2>
            <div className="text-[15px] text-[#333333] leading-[1.8] whitespace-pre-line">
              {s.content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                part.startsWith("**") && part.endsWith("**") ? (
                  <strong key={i}>{part.slice(2, -2)}</strong>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </div>
          </section>
        ))}
      </div>
    </LegalLayout>
  );
}
