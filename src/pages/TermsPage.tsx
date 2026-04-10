import { useEffect } from "react";
import { LegalLayout } from "@/components/layouts/LegalLayout";

const sections = [
  {
    title: "1. Agreement",
    content: `These Terms & Conditions govern your use of the TF USA Partner Portal (partners.total-filtration.com) operated by Total Filtration USA LLC ("TF USA"). By accessing the portal you agree to these terms.`,
  },
  {
    title: "2. Portal Access",
    content: `Access to the portal is by invitation only, following approval of a distributor account application. Your account is personal to your business and may not be shared or transferred. You are responsible for maintaining the confidentiality of your login credentials. TF USA reserves the right to suspend or terminate portal access at any time.`,
  },
  {
    title: "3. Product Catalog and Pricing",
    content: `Pricing displayed in the portal reflects your agreed distributor discount and is subject to change. Prices shown are in US dollars excluding applicable taxes and shipping. TF USA reserves the right to update pricing at any time — active partners will be notified of material price changes.`,
  },
  {
    title: "4. Enquiries and Quotations",
    content: `Submitting a basket enquiry through the portal does not constitute a purchase order or binding commitment. Enquiries are requests for quotation only. A formal quotation issued by TF USA constitutes an offer to supply at the stated price, valid until the expiry date shown. Accepting a quotation constitutes agreement to purchase the quoted products at the quoted price subject to these terms.`,
  },
  {
    title: "5. Orders and Fulfilment",
    content: `Accepted quotations are processed as sales orders through TF USA's operations team. Delivery timelines are estimates only and TF USA accepts no liability for delays caused by circumstances outside its reasonable control. Risk of loss passes to the distributor upon delivery.`,
  },
  {
    title: "6. Payment",
    content: `Payment terms are as agreed at account setup and shown in your account profile. TF USA reserves the right to suspend portal access for accounts with overdue balances.`,
  },
  {
    title: "7. Confidentiality",
    content: `Pricing, discount levels, product availability and any commercially sensitive information accessed through the portal is confidential to your business relationship with TF USA. You agree not to share portal pricing or account information with third parties.`,
  },
  {
    title: "8. Intellectual Property",
    content: `All product information, descriptions, pricing and content displayed in the portal is the property of TF USA or its manufacturer partners. You may not reproduce, distribute or use this content without written permission.`,
  },
  {
    title: "9. Limitation of Liability",
    content: `TF USA's liability to you in connection with your use of the portal shall not exceed the value of orders placed by you in the preceding 12 months. TF USA is not liable for indirect, consequential or incidental losses.`,
  },
  {
    title: "10. Governing Law",
    content: `These terms are governed by the laws of the State of Florida, United States. Any disputes shall be subject to the exclusive jurisdiction of the courts of Orange County, Florida.`,
  },
  {
    title: "11. Changes to These Terms",
    content: `TF USA may update these terms from time to time. Continued use of the portal following notification of changes constitutes acceptance of the updated terms.`,
  },
  {
    title: "12. Contact",
    content: `Total Filtration USA LLC
Winter Garden, FL 34787
partners@total-filtration.com`,
  },
];

export default function TermsPage() {
  useEffect(() => {
    document.title = "Terms & Conditions — TF USA Partner Portal";
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
      <h1 className="text-[28px] font-bold text-[#1B3A6B] mb-1">Partner Portal Terms & Conditions</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: April 10, 2026</p>

      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold text-[#1B3A6B] border-l-[3px] border-[#CC2027] pl-4 mb-4">
              {s.title}
            </h2>
            <p className="text-[15px] text-[#333333] leading-[1.8]">{s.content}</p>
          </section>
        ))}
      </div>
    </LegalLayout>
  );
}
