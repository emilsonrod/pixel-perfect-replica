-- UUID fijos para que el seed sea reproducible y las FK sean legibles.
insert into public.businesses (id, slug, name, tagline, footer_text, currency_code) values
  ('00000000-0000-4000-8000-000000000001', 'casa-luma', 'Casa Luma',
   'Objetos simples, hechos con intención.', 'Hecho con calma. Para tu día a día.', 'BOB');

insert into public.categories (id, business_id, name, sort_order) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-000000000001', 'Cerámica',    1),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-000000000001', 'Decoración',  2),
  ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-000000000001', 'Accesorios',  3);

insert into public.products (id, business_id, category_id, slug, name, description, price, published) values
 ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-0000000000c1', 'taza-de-ceramica', 'Taza de cerámica',
  E'Un pequeño momento de calma para tu café de cada día.\n\nCerámica esmaltada a mano con un asa cómoda. Capacidad de 300 ml. Apta para lavavajillas. Cada pieza tiene sus propias variaciones sutiles, tan únicas como los momentos que compartes con ella.',
  49, true),
 ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-0000000000c2', 'jarron-de-terracota', 'Jarrón de terracota',
  E'Un toque de calidez para tus rincones favoritos.\n\nPequeño jarrón de terracota elaborado a mano, con una textura natural y un delicado borde ondulado. Ideal para una flor, una rama o simplemente para disfrutarlo tal como es.',
  79, true),
 ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-0000000000c3', 'bolso-de-algodon', 'Bolso de algodón',
  E'Tu compañero para las pequeñas aventuras de cada día.\n\nBolso de algodón natural, ligero y resistente, con asas largas para llevarlo cómodamente al hombro. Una pieza sencilla y reutilizable para ir al mercado o pasear por la ciudad.',
  39, true),
 ('00000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-0000000000c1', 'cuenco-de-ceramica', 'Cuenco de cerámica',
  E'Una invitación a disfrutar de la mesa, sin prisas.\n\nCuenco de cerámica esmaltada con un delicado acabado moteado. Hecho a mano para servir tus platos favoritos. Las pequeñas diferencias en forma y esmalte hacen única cada pieza.',
  69, true);

insert into public.product_images (product_id, position, image_ref) values
 ('00000000-0000-4000-8000-0000000000a1', 0, '/__l5e/assets-v1/2bd6d965-d23e-4418-8ea8-2bbd3721f15f/ceramic-mug.webp'),
 ('00000000-0000-4000-8000-0000000000a2', 0, '/__l5e/assets-v1/2b4dfebf-15cc-4b88-9b68-3dab3267ba4a/terracotta-vase.webp'),
 ('00000000-0000-4000-8000-0000000000a3', 0, '/__l5e/assets-v1/26f304ef-654b-4db2-9362-e81948b2c7a7/cotton-tote.webp'),
 ('00000000-0000-4000-8000-0000000000a4', 0, '/__l5e/assets-v1/03597986-f430-4eb0-a6f1-9d8339b5c0a0/speckled-bowl.webp');

-- Primer administrador: sustituir por el UUID real del usuario creado en
-- Authentication → Users. No se incluye ningún usuario ficticio.
-- insert into public.business_members (business_id, user_id, role)
-- values ('00000000-0000-4000-8000-000000000001', '<UUID-DEL-USUARIO>', 'owner');
