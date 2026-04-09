-- Table: user_roles (create FIRST so has_role can reference it)
create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'partner')),
  created_at timestamptz default now(),
  unique(user_id)
);

-- has_role() security definer function
create or replace function has_role(uid uuid, r text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles
    where user_id = uid and role = r
  );
$$;

alter table user_roles enable row level security;
create policy "Admin full access" on user_roles
  for all using (has_role(auth.uid(), 'admin'));
create policy "Users read own role" on user_roles
  for select using (user_id = auth.uid());

-- Table: partners
create table partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  company_name text not null,
  company_logo_url text,
  contact_name text not null,
  contact_email text not null,
  phone text,
  state text,
  ein text,
  discount_percentage numeric(5,2) not null default 0,
  tier_label text not null default 'Bronze',
  assigned_rep text,
  active boolean not null default false,
  created_at timestamptz default now()
);

alter table partners enable row level security;
create policy "Admin full access" on partners
  for all using (has_role(auth.uid(), 'admin'));
create policy "Partner reads own record" on partners
  for select using (user_id = auth.uid());

-- Table: applications
create table applications (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'info_requested')),
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewer_notes text,
  legal_business_name text not null,
  trading_name text,
  date_established text,
  ein text,
  business_type text,
  reg_address_street text,
  reg_address_city text,
  reg_address_state text,
  reg_address_zip text,
  primary_address_street text,
  primary_address_city text,
  primary_address_state text,
  primary_address_zip text,
  website text,
  years_in_business text,
  primary_phone text,
  general_email text,
  contact_first_name text not null,
  contact_last_name text not null,
  contact_title text,
  contact_department text,
  contact_direct_phone text,
  contact_mobile text,
  contact_email text not null,
  ap_same_as_primary boolean default false,
  ap_first_name text,
  ap_last_name text,
  ap_title text,
  ap_phone text,
  ap_email text,
  ship_same_as_business boolean default false,
  ship_address_street text,
  ship_address_city text,
  ship_address_state text,
  ship_address_zip text,
  ship_additional_locations boolean default false,
  ship_preferred_method text,
  ship_carrier_name text,
  ship_carrier_account text,
  ship_special_instructions text,
  requested_credit_limit text,
  requested_payment_terms text,
  preferred_payment_method text,
  bank_name text,
  bank_account_name text,
  bank_account_type text,
  bank_routing_number text,
  bank_account_number text,
  annual_volume_estimate text,
  tax_exempt boolean default false,
  resale_certificate_status text,
  resale_states text,
  trade_references jsonb,
  geographic_coverage text,
  sales_channels text,
  industries_served text,
  monthly_order_frequency text,
  how_heard text
);

alter table applications enable row level security;
create policy "Admin full access" on applications
  for all using (has_role(auth.uid(), 'admin'));
create policy "Anyone can insert" on applications
  for insert with check (true);

-- Table: products
create table products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  description text,
  category text,
  family text,
  list_price_usd numeric(10,2) not null,
  cost_price_usd numeric(10,2),
  stock_qty integer default 0,
  hidden boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table products enable row level security;
create policy "Admin full access" on products
  for all using (has_role(auth.uid(), 'admin'));
create policy "Partners view non-hidden products" on products
  for select using (
    has_role(auth.uid(), 'partner') and hidden = false
  );

-- Table: enquiries
create table enquiries (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  line_items jsonb not null,
  total_list_usd numeric(10,2),
  total_partner_usd numeric(10,2),
  status text not null default 'submitted' check (status in ('submitted', 'reviewed', 'quoted', 'closed')),
  notes text,
  submitted_at timestamptz default now()
);

alter table enquiries enable row level security;
create policy "Admin full access" on enquiries
  for all using (has_role(auth.uid(), 'admin'));
create policy "Partner reads own enquiries" on enquiries
  for select using (
    partner_id in (select id from partners where user_id = auth.uid())
  );
create policy "Partner inserts own enquiries" on enquiries
  for insert with check (
    partner_id in (select id from partners where user_id = auth.uid())
  );

-- Table: quotations
create table quotations (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid references enquiries(id) on delete set null,
  partner_id uuid not null references partners(id) on delete cascade,
  pdf_url text,
  issued_at timestamptz default now(),
  expires_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  notes text
);

alter table quotations enable row level security;
create policy "Admin full access" on quotations
  for all using (has_role(auth.uid(), 'admin'));
create policy "Partner reads own quotations" on quotations
  for select using (
    partner_id in (select id from partners where user_id = auth.uid())
  );
create policy "Partner updates own quotation status" on quotations
  for update using (
    partner_id in (select id from partners where user_id = auth.uid())
  ) with check (status in ('accepted', 'declined'));

-- Table: partner_favourites
create table partner_favourites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

alter table partner_favourites enable row level security;
create policy "Admin full access" on partner_favourites
  for all using (has_role(auth.uid(), 'admin'));
create policy "Partner manages own favourites" on partner_favourites
  for all using (user_id = auth.uid());

-- Table: notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  type text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz default now()
);

alter table notifications enable row level security;
create policy "Admin full access" on notifications
  for all using (has_role(auth.uid(), 'admin'));
create policy "Partner reads own notifications" on notifications
  for select using (
    partner_id in (select id from partners where user_id = auth.uid())
  );
create policy "Partner marks own notifications read" on notifications
  for update using (
    partner_id in (select id from partners where user_id = auth.uid())
  );

-- Security barrier view for partners
create or replace view products_partner_view
  with (security_invoker = true, security_barrier = true)
as
  select
    id, sku, name, description, category, family,
    list_price_usd, stock_qty, hidden, created_at, updated_at
  from products
  where hidden = false;