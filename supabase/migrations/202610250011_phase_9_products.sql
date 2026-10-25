create table public.product_details (food_id uuid primary key references public.foods(id) on delete cascade, brand text, pack_size numeric, pack_unit text, ingredients text, allergens text, provider text, provider_record_id text, last_lookup timestamptz, lookup_status text);
create table public.product_barcodes (barcode text not null, food_id uuid not null references public.foods(id) on delete cascade, owner_id uuid references auth.users(id) on delete cascade, primary key(barcode, food_id));
create unique index product_barcode_shared_unique on public.product_barcodes(barcode) where owner_id is null;
create unique index product_barcode_private_unique on public.product_barcodes(owner_id, barcode) where owner_id is not null;
alter table public.product_details enable row level security; alter table public.product_barcodes enable row level security;
create policy "visible product details" on public.product_details for select using (exists(select 1 from public.foods f where f.id=food_id and (f.owner_id is null or f.owner_id=auth.uid())));
create policy "visible product barcodes" on public.product_barcodes for select using (owner_id is null or owner_id=auth.uid());
