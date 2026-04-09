import { z } from "zod";

export const applicationSchema = z.object({
  // Section 1 — Business Information
  legal_business_name: z.string().min(1, "Legal business name is required"),
  trading_name: z.string().optional().default(""),
  date_established: z.string().optional().default(""),
  ein: z.string().optional().default(""),
  business_type: z.string().optional().default(""),
  reg_address_street: z.string().optional().default(""),
  reg_address_city: z.string().optional().default(""),
  reg_address_state: z.string().optional().default(""),
  reg_address_zip: z.string().optional().default(""),
  primary_same_as_reg: z.boolean().default(false),
  primary_address_street: z.string().optional().default(""),
  primary_address_city: z.string().optional().default(""),
  primary_address_state: z.string().optional().default(""),
  primary_address_zip: z.string().optional().default(""),
  website: z.string().optional().default(""),
  years_in_business: z.string().optional().default(""),
  primary_phone: z.string().optional().default(""),
  general_email: z.string().email("Invalid email").or(z.literal("")).optional().default(""),

  // Section 2 — Primary Contact
  contact_first_name: z.string().min(1, "First name is required"),
  contact_last_name: z.string().min(1, "Last name is required"),
  contact_title: z.string().optional().default(""),
  contact_department: z.string().optional().default(""),
  contact_direct_phone: z.string().optional().default(""),
  contact_mobile: z.string().optional().default(""),
  contact_email: z.string().email("Valid email is required"),

  // Section 3 — Accounts Payable
  ap_same_as_primary: z.boolean().default(false),
  ap_first_name: z.string().optional().default(""),
  ap_last_name: z.string().optional().default(""),
  ap_title: z.string().optional().default(""),
  ap_phone: z.string().optional().default(""),
  ap_email: z.string().email("Invalid email").or(z.literal("")).optional().default(""),

  // Section 4 — Shipping
  ship_same_as_business: z.boolean().default(false),
  ship_address_street: z.string().optional().default(""),
  ship_address_city: z.string().optional().default(""),
  ship_address_state: z.string().optional().default(""),
  ship_address_zip: z.string().optional().default(""),
  ship_additional_locations: z.boolean().default(false),
  ship_preferred_method: z.string().optional().default(""),
  ship_carrier_name: z.string().optional().default(""),
  ship_carrier_account: z.string().optional().default(""),
  ship_special_instructions: z.string().optional().default(""),

  // Section 5 — Credit & Payment
  requested_credit_limit: z.string().optional().default(""),
  requested_payment_terms: z.string().optional().default(""),
  preferred_payment_method: z.string().optional().default(""),
  bank_name: z.string().optional().default(""),
  bank_account_name: z.string().optional().default(""),
  bank_account_type: z.string().optional().default(""),
  bank_routing_number: z.string().regex(/^\d{9}$/, "Must be 9 digits").or(z.literal("")).optional().default(""),
  bank_account_number: z.string().regex(/^\d+$/, "Must be numeric").or(z.literal("")).optional().default(""),
  annual_volume_estimate: z.string().optional().default(""),

  // Section 6 — Tax & Compliance
  tax_exempt: z.boolean().default(false),
  resale_certificate_status: z.string().optional().default(""),
  resale_states: z.string().optional().default(""),

  // Section 7 — Distribution Profile
  geographic_coverage: z.string().optional().default(""),
  sales_channels: z.string().optional().default(""),
  industries_served: z.string().optional().default(""),
  monthly_order_frequency: z.string().optional().default(""),
  how_heard: z.string().optional().default(""),
});

export type ApplicationFormValues = z.infer<typeof applicationSchema>;
