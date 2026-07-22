begin;

alter table public.tenants
  add column legal_name text,
  add column document_type text check(document_type is null or document_type in('NIT','CC','CE','PASAPORTE')),
  add column document_number text,
  add column verification_digit text,
  add column billing_email text,
  add column phone text;

alter table public.branches
  add column address text,
  add column city text;

commit;
