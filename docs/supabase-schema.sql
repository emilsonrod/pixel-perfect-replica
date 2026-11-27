-- =====================================================================
-- Casa Luma · Catálogo Digital · Esquema Supabase
-- Ejecutar en el SQL Editor de Supabase (PostgreSQL 15+)
-- =====================================================================

-- ---------- 0. Extensiones ----------
create extension if not exists pg_trgm  with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------- 1. Tipos ENUM ----------
create type public.business_role   as enum ('owner', 'admin');
create type public.payment_status  as enum ('pending', 'paid');
create type public.payment_source  as enum ('admin', 'customer');

-- ---------- 2. Funciones auxiliares independientes ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Envoltorio inmutable para poder usar unaccent en columnas generadas e índices.
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

-- ---------- 3. Tablas ----------
create table public.businesses (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique
                check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name          varchar(100) not null check (btrim(name) <> ''),
  tagline       varchar(160),
  footer_text   varchar(160),
  currency_code char(3) not null default 'BOB' check (currency_code ~ '^[A-Z]{3}$'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id     uuid not null references auth.users(id)        on delete cascade,
  role        public.business_role not null default 'admin',
  created_at  timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index business_members_user_idx on public.business_members (user_id);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        varchar(50) not null check (btrim(name) <> ''),
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now(),
  unique (business_id, name),
  unique (id, business_id)
);

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid not null,
  slug        text check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        varchar(100) not null check (btrim(name) <> ''),
  description text not null
              check (char_length(btrim(description)) between 1 and 1500),
  price       numeric(8,2) not null check (price >= 0 and price <= 999999.99),
  published   boolean not null default true,
  name_search text generated always as (public.f_unaccent(lower(name))) stored,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (business_id, slug),
  unique (id, business_id),
  foreign key (category_id, business_id)
    references public.categories (id, business_id) on delete restrict
);
create index products_business_pub_cat_idx
  on public.products (business_id, published, category_id);
create index products_category_idx on public.products (category_id, business_id);
create index products_name_search_trgm_idx
  on public.products using gin (name_search extensions.gin_trgm_ops);

create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  position   smallint not null check (position between 0 and 2),
  image_ref  text not null check (
       image_ref ~ '^/__l5e/assets-v1/[a-zA-Z0-9/-]+\.(webp|png|jpg|jpeg)$'
    or image_ref ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+\.(webp|png|jpg|jpeg)$'
  ),
  created_at timestamptz not null default now(),
  unique (product_id, position)
);

create table public.payment_qr_configs (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  image_path  text not null
              check (image_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+\.(webp|png|jpg|jpeg)$'),
  recipient   varchar(100) not null check (btrim(recipient) <> ''),
  is_active   boolean not null default true,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (id, business_id)
);
-- Un único QR activo por negocio.
create unique index payment_qr_one_active_idx
  on public.payment_qr_configs (business_id) where is_active;

create table public.payment_requests (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  product_id        uuid,
  product_name      varchar(100) not null check (btrim(product_name) <> ''),
  product_image_ref text not null check (
       product_image_ref ~ '^/__l5e/assets-v1/[a-zA-Z0-9/-]+\.(webp|png|jpg|jpeg)$'
    or product_image_ref ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+\.(webp|png|jpg|jpeg)$'
  ),
  customer_name     varchar(100) not null check (btrim(customer_name) <> ''),
  amount            numeric(8,2) not null check (amount > 0 and amount <= 999999.99),
  qr_config_id      uuid not null,
  status            public.payment_status not null default 'pending',
  source            public.payment_source not null,
  receipt_path      text check (
    receipt_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+\.(webp|png|jpg|jpeg)$'
  ),
  confirmed_at      timestamptz,
  confirmed_by      uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Replica la unión discriminada de paymentRequestSchema.
  check ((status = 'paid') = (confirmed_at is not null)),
  -- El producto puede borrarse: solo product_id pasa a NULL (PostgreSQL 15+).
  foreign key (product_id, business_id)
    references public.products (id, business_id) on delete set null (product_id),
  foreign key (qr_config_id, business_id)
    references public.payment_qr_configs (id, business_id) on delete restrict
);
create index payment_requests_list_idx
  on public.payment_requests (business_id, status, created_at desc);
create index payment_requests_product_idx on public.payment_requests (product_id);
create index payment_requests_qr_idx on public.payment_requests (qr_config_id, business_id);
create index payment_requests_confirmed_by_idx on public.payment_requests (confirmed_by);

-- ---------- 4. Triggers ----------
create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger payment_requests_updated_at before update on public.payment_requests
  for each row execute function public.set_updated_at();

create or replace function public.payment_requests_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id           is distinct from old.id
  or new.business_id  is distinct from old.business_id
  or new.qr_config_id is distinct from old.qr_config_id
  or new.customer_name is distinct from old.customer_name
  or new.product_name is distinct from old.product_name
  or new.product_image_ref is distinct from old.product_image_ref
  or new.amount       is distinct from old.amount
  or new.source       is distinct from old.source
  or new.created_at   is distinct from old.created_at then
    raise exception 'Los datos de una solicitud de pago no se pueden modificar.'
      using errcode = '23514';
  end if;

  -- product_id solo puede pasar a NULL (borrado del producto).
  if new.product_id is distinct from old.product_id and new.product_id is not null then
    raise exception 'El producto de una solicitud no se puede cambiar.' using errcode = '23514';
  end if;

  if old.status = 'paid' and (
       new.status       is distinct from old.status
    or new.confirmed_at is distinct from old.confirmed_at
    or new.receipt_path is distinct from old.receipt_path
    or (new.confirmed_by is distinct from old.confirmed_by and new.confirmed_by is not null)
  ) then
    raise exception 'Este pago ya fue confirmado.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger payment_requests_guard_trg before update on public.payment_requests
  for each row execute function public.payment_requests_guard();

-- ---------- 5. Funciones de autorización (dependen de las tablas) ----------
create or replace function public.is_business_member(p_business uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = p_business and m.user_id = (select auth.uid())
  )
$$;

create or replace function public.is_business_owner(p_business uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = p_business and m.user_id = (select auth.uid())
      and m.role = 'owner'
  )
$$;

-- Primera carpeta de una ruta de Storage como uuid (NULL si no es válida).
create or replace function public.path_uuid(p_name text)
returns uuid
language plpgsql immutable
set search_path = ''
as $$
begin
  return (string_to_array(p_name, '/'))[1]::uuid;
exception when others then
  return null;
end;
$$;

-- ¿Existe una solicitud pendiente con ese id? (para subir comprobantes)
create or replace function public.pending_request_exists(p_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$ select exists (select 1 from public.payment_requests r where r.id = p_id and r.status = 'pending') $$;

create or replace function public.request_exists(p_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$ select exists (select 1 from public.payment_requests r where r.id = p_id) $$;

create or replace function public.is_request_member(p_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.payment_requests r
    where r.id = p_id and public.is_business_member(r.business_id)
  )
$$;

-- ---------- 6. Funciones de negocio (RPC) ----------
create or replace function public.create_payment_request(
  p_product_id uuid,
  p_customer   text,
  p_amount     numeric default null
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_product  record;
  v_qr_id    uuid;
  v_cover    text;
  v_customer text := btrim(coalesce(p_customer, ''));
  v_amount   numeric;
  v_source   public.payment_source;
  v_id       uuid;
begin
  select p.id, p.business_id, p.name, p.price, p.published
    into v_product
    from public.products p where p.id = p_product_id;
  if not found then
    raise exception 'Este producto no está disponible.' using errcode = 'P0001';
  end if;

  if char_length(v_customer) not between 1 and 100 then
    raise exception 'El nombre del cliente es obligatorio.' using errcode = 'P0001';
  end if;

  if public.is_business_member(v_product.business_id) then
    v_source := 'admin';
    v_amount := coalesce(p_amount, v_product.price);
  else
    if not v_product.published then
      raise exception 'Este producto no está disponible.' using errcode = 'P0001';
    end if;
    v_source := 'customer';
    -- Un cliente paga el precio del producto, nunca un importe enviado por el navegador.
    if p_amount is not null and p_amount <> v_product.price then
      raise exception 'El importe debe coincidir con el precio del producto.' using errcode = 'P0001';
    end if;
    v_amount := v_product.price;
  end if;

  if v_amount is null or v_amount <= 0 then
    raise exception 'El importe debe ser mayor que cero.' using errcode = 'P0001';
  end if;
  if v_amount > 999999.99 then
    raise exception 'El importe es demasiado alto.' using errcode = 'P0001';
  end if;
  if v_amount <> round(v_amount, 2) then
    raise exception 'Usa un máximo de dos decimales.' using errcode = 'P0001';
  end if;

  select q.id into v_qr_id
    from public.payment_qr_configs q
    where q.business_id = v_product.business_id and q.is_active;
  if v_qr_id is null then
    raise exception 'El QR de pago no está configurado.' using errcode = 'P0001';
  end if;

  select i.image_ref into v_cover
    from public.product_images i
    where i.product_id = v_product.id and i.position = 0;
  if v_cover is null then
    raise exception 'Este producto no tiene fotografía.' using errcode = 'P0001';
  end if;

  insert into public.payment_requests
    (business_id, product_id, product_name, product_image_ref,
     customer_name, amount, qr_config_id, source)
  values
    (v_product.business_id, v_product.id, v_product.name, v_cover,
     v_customer, v_amount, v_qr_id, v_source)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.get_payment_request(p_id uuid)
returns table (
  id uuid, business_name text, customer_name text, product_name text,
  product_image_ref text, amount numeric, status public.payment_status,
  created_at timestamptz, confirmed_at timestamptz, receipt_path text,
  qr_image_path text, qr_recipient text
)
language sql stable security definer
set search_path = ''
as $$
  select r.id, b.name::text, r.customer_name::text, r.product_name::text,
         r.product_image_ref, r.amount, r.status, r.created_at, r.confirmed_at,
         r.receipt_path, q.image_path, q.recipient::text
  from public.payment_requests r
  join public.businesses b on b.id = r.business_id
  join public.payment_qr_configs q on q.id = r.qr_config_id
  where r.id = p_id
$$;

create or replace function public.attach_receipt(p_id uuid, p_path text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_status public.payment_status;
begin
  select status into v_status from public.payment_requests where id = p_id;
  if not found then
    raise exception 'La solicitud ya no existe.' using errcode = 'P0001';
  end if;
  if v_status = 'paid' then
    raise exception 'Este pago ya fue confirmado.' using errcode = 'P0001';
  end if;
  if p_path is null or split_part(p_path, '/', 1) <> p_id::text then
    raise exception 'Ruta de comprobante no válida.' using errcode = 'P0001';
  end if;
  -- Un comprobante nunca marca el pago como recibido.
  update public.payment_requests set receipt_path = p_path where id = p_id;
end;
$$;

create or replace function public.confirm_payment_request(p_id uuid, p_bank_verified boolean)
returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare v_req record; v_now timestamptz := now();
begin
  select business_id, status, confirmed_at into v_req
    from public.payment_requests where id = p_id for update;
  if not found then
    raise exception 'La solicitud ya no existe.' using errcode = 'P0001';
  end if;
  if not public.is_business_member(v_req.business_id) then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;
  if v_req.status = 'paid' then
    return v_req.confirmed_at;               -- idempotente: conserva la fecha original
  end if;
  if p_bank_verified is distinct from true then
    raise exception 'Confirma que verificaste el ingreso en tu banco.' using errcode = 'P0001';
  end if;
  update public.payment_requests
     set status = 'paid', confirmed_at = v_now, confirmed_by = (select auth.uid())
   where id = p_id;
  return v_now;
end;
$$;

create or replace function public.set_qr_config(
  p_business uuid, p_image_path text, p_recipient text
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if not public.is_business_member(p_business) then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;
  update public.payment_qr_configs set is_active = false
   where business_id = p_business and is_active;
  insert into public.payment_qr_configs (business_id, image_path, recipient, created_by)
  values (p_business, p_image_path, btrim(p_recipient), (select auth.uid()))
  returning id into v_id;
  return v_id;
end;
$$;

-- Guardado atómico de producto + fotos. SECURITY INVOKER: la RLS se aplica.
create or replace function public.save_product(
  p_business    uuid,
  p_id          uuid,
  p_name        text,
  p_description text,
  p_price       numeric,
  p_category    uuid,
  p_published   boolean,
  p_images      text[]
) returns uuid
language plpgsql security invoker
set search_path = ''
as $$
declare v_id uuid;
begin
  if coalesce(array_length(p_images, 1), 0) not between 1 and 3 then
    raise exception 'Agrega entre 1 y 3 fotografías.' using errcode = 'P0001';
  end if;

  if p_id is null then
    insert into public.products
      (business_id, category_id, name, description, price, published)
    values
      (p_business, p_category, btrim(p_name), btrim(p_description), p_price, p_published)
    returning id into v_id;
  else
    update public.products
       set category_id = p_category, name = btrim(p_name),
           description = btrim(p_description), price = p_price, published = p_published
     where id = p_id and business_id = p_business
    returning id into v_id;
    if v_id is null then
      raise exception 'Este producto ya no existe.' using errcode = 'P0001';
    end if;
  end if;

  delete from public.product_images where product_id = v_id;
  insert into public.product_images (product_id, position, image_ref)
  select v_id, (t.ord - 1)::smallint, t.img
    from unnest(p_images) with ordinality as t(img, ord);
  return v_id;
end;
$$;

-- Permisos de ejecución: por defecto PUBLIC puede ejecutar; se restringe.
revoke execute on function
  public.create_payment_request(uuid, text, numeric),
  public.get_payment_request(uuid),
  public.attach_receipt(uuid, text),
  public.confirm_payment_request(uuid, boolean),
  public.set_qr_config(uuid, text, text),
  public.save_product(uuid, uuid, text, text, numeric, uuid, boolean, text[])
from public;

grant execute on function public.create_payment_request(uuid, text, numeric) to anon, authenticated;
grant execute on function public.get_payment_request(uuid)                    to anon, authenticated;
grant execute on function public.attach_receipt(uuid, text)                   to anon, authenticated;
grant execute on function public.confirm_payment_request(uuid, boolean)       to authenticated;
grant execute on function public.set_qr_config(uuid, text, text)              to authenticated;
grant execute on function public.save_product(uuid, uuid, text, text, numeric, uuid, boolean, text[]) to authenticated;

-- ---------- 7. Vista ----------
create view public.catalog_products with (security_invoker = true) as
select p.id, p.business_id, p.slug, p.name, p.name_search, p.description, p.price,
       p.published, p.category_id, c.name as category_name, c.sort_order as category_order,
       coalesce(
         (select array_agg(i.image_ref order by i.position)
            from public.product_images i where i.product_id = p.id),
         '{}'::text[]
       ) as images,
       p.created_at, p.updated_at
from public.products p
join public.categories c on c.id = p.category_id and c.business_id = p.business_id;

grant select on public.catalog_products to anon, authenticated;

-- ---------- 8. Row Level Security ----------
alter table public.businesses         enable row level security;
alter table public.business_members   enable row level security;
alter table public.categories         enable row level security;
alter table public.products           enable row level security;
alter table public.product_images     enable row level security;
alter table public.payment_qr_configs enable row level security;
alter table public.payment_requests   enable row level security;

-- Defensa en profundidad: el anónimo no toca estas tablas ni por error.
revoke all on public.payment_requests, public.payment_qr_configs, public.business_members from anon;

-- businesses
create policy businesses_select_public on public.businesses
  for select to anon, authenticated using (true);
create policy businesses_update_owner on public.businesses
  for update to authenticated
  using (public.is_business_owner(id)) with check (public.is_business_owner(id));

-- business_members
create policy members_select on public.business_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_business_owner(business_id));
create policy members_insert_owner on public.business_members
  for insert to authenticated with check (public.is_business_owner(business_id));
create policy members_update_owner on public.business_members
  for update to authenticated
  using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
create policy members_delete_owner on public.business_members
  for delete to authenticated using (public.is_business_owner(business_id));

-- categories
create policy categories_select_public on public.categories
  for select to anon, authenticated using (true);
create policy categories_insert_member on public.categories
  for insert to authenticated with check (public.is_business_member(business_id));
create policy categories_update_member on public.categories
  for update to authenticated
  using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy categories_delete_member on public.categories
  for delete to authenticated using (public.is_business_member(business_id));

-- products
create policy products_select on public.products
  for select to anon, authenticated
  using (published or public.is_business_member(business_id));
create policy products_insert_member on public.products
  for insert to authenticated with check (public.is_business_member(business_id));
create policy products_update_member on public.products
  for update to authenticated
  using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy products_delete_member on public.products
  for delete to authenticated using (public.is_business_member(business_id));

-- product_images (hereda la visibilidad de products)
create policy product_images_select on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_images.product_id));
create policy product_images_insert_member on public.product_images
  for insert to authenticated
  with check (exists (select 1 from public.products p
                      where p.id = product_images.product_id
                        and public.is_business_member(p.business_id)));
create policy product_images_update_member on public.product_images
  for update to authenticated
  using (exists (select 1 from public.products p
                 where p.id = product_images.product_id
                   and public.is_business_member(p.business_id)))
  with check (exists (select 1 from public.products p
                      where p.id = product_images.product_id
                        and public.is_business_member(p.business_id)));
create policy product_images_delete_member on public.product_images
  for delete to authenticated
  using (exists (select 1 from public.products p
                 where p.id = product_images.product_id
                   and public.is_business_member(p.business_id)));

-- payment_qr_configs y payment_requests: solo lectura para miembros; escritura solo por RPC
create policy qr_configs_select_member on public.payment_qr_configs
  for select to authenticated using (public.is_business_member(business_id));
create policy payment_requests_select_member on public.payment_requests
  for select to authenticated using (public.is_business_member(business_id));

-- ---------- 9. Storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images',   'product-images',   true,  5242880, array['image/webp','image/png','image/jpeg']),
  ('payment-qr',       'payment-qr',       true,  5242880, array['image/webp','image/png','image/jpeg']),
  ('payment-receipts', 'payment-receipts', false, 5242880, array['image/webp','image/png','image/jpeg'])
on conflict (id) do nothing;

-- Imágenes de producto y QR: carpeta raíz = business_id, escritura solo para miembros
create policy storage_business_assets_select on storage.objects
  for select to authenticated
  using (bucket_id in ('product-images', 'payment-qr')
         and public.is_business_member(public.path_uuid(name)));
create policy storage_business_assets_insert on storage.objects
  for insert to authenticated
  with check (bucket_id in ('product-images', 'payment-qr')
              and public.is_business_member(public.path_uuid(name)));
create policy storage_business_assets_update on storage.objects
  for update to authenticated
  using (bucket_id in ('product-images', 'payment-qr')
         and public.is_business_member(public.path_uuid(name)))
  with check (bucket_id in ('product-images', 'payment-qr')
              and public.is_business_member(public.path_uuid(name)));
create policy storage_business_assets_delete on storage.objects
  for delete to authenticated
  using (bucket_id in ('product-images', 'payment-qr')
         and public.is_business_member(public.path_uuid(name)));

-- Comprobantes: carpeta raíz = request_id.
-- Subir: cualquiera, solo si la solicitud existe y está pendiente.
create policy storage_receipts_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'payment-receipts'
              and public.pending_request_exists(public.path_uuid(name)));
-- Leer: quien conoce el id de la solicitud (enlace de pago) o un miembro del negocio.
create policy storage_receipts_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'payment-receipts'
         and public.request_exists(public.path_uuid(name)));

-- ---------- 10. Realtime (opcional) ----------
-- alter publication supabase_realtime add table public.payment_requests;
