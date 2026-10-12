-- CartWise optional shopper reports (Supabase free tier). Run in Supabase -> SQL Editor.
create table if not exists price_reports (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('gas','menu','grocery')),
  place text not null,            -- station / restaurant / store name
  item text,                      -- 'regular' for gas, menu item, or grocery item
  price numeric(8,3) not null check (price > 0),
  unit text,
  zip text not null check (zip ~ '^\d{5}$'),
  zip3 text not null,
  source text not null default 'shopper_report',
  ip_hash text,                   -- salted hash, for rate limiting only
  approved boolean not null default true,  -- set false to hide spam
  created_at timestamptz not null default now()
);
create index if not exists price_reports_lookup on price_reports (kind, zip3, created_at desc);
alter table price_reports enable row level security;  -- no public policies: only the Netlify Function (service role) reads and writes
