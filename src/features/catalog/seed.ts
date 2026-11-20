import mug from "@/assets/ceramic-mug.webp.asset.json";
import vase from "@/assets/terracotta-vase.webp.asset.json";
import tote from "@/assets/cotton-tote.webp.asset.json";
import bowl from "@/assets/speckled-bowl.webp.asset.json";
import type { Product } from "./model";

export const referencePhotos = [
  { name: "Taza de cerámica", url: mug.url },
  { name: "Jarrón de terracota", url: vase.url },
  { name: "Bolso de algodón", url: tote.url },
  { name: "Cuenco de cerámica", url: bowl.url },
];

export const initialProducts: Product[] = [
  {
    id: "taza-de-ceramica",
    name: "Taza de cerámica",
    price: 49,
    category: "Cerámica",
    published: true,
    images: [mug.url],
    description:
      "Un pequeño momento de calma para tu café de cada día.\n\nCerámica esmaltada a mano con un asa cómoda. Capacidad de 300 ml. Apta para lavavajillas. Cada pieza tiene sus propias variaciones sutiles, tan únicas como los momentos que compartes con ella.",
  },
  {
    id: "jarron-de-terracota",
    name: "Jarrón de terracota",
    price: 79,
    category: "Decoración",
    published: true,
    images: [vase.url],
    description:
      "Un toque de calidez para tus rincones favoritos.\n\nPequeño jarrón de terracota elaborado a mano, con una textura natural y un delicado borde ondulado. Ideal para una flor, una rama o simplemente para disfrutarlo tal como es.",
  },
  {
    id: "bolso-de-algodon",
    name: "Bolso de algodón",
    price: 39,
    category: "Accesorios",
    published: true,
    images: [tote.url],
    description:
      "Tu compañero para las pequeñas aventuras de cada día.\n\nBolso de algodón natural, ligero y resistente, con asas largas para llevarlo cómodamente al hombro. Una pieza sencilla y reutilizable para ir al mercado o pasear por la ciudad.",
  },
  {
    id: "cuenco-de-ceramica",
    name: "Cuenco de cerámica",
    price: 69,
    category: "Cerámica",
    published: true,
    images: [bowl.url],
    description:
      "Una invitación a disfrutar de la mesa, sin prisas.\n\nCuenco de cerámica esmaltada con un delicado acabado moteado. Hecho a mano para servir tus platos favoritos. Las pequeñas diferencias en forma y esmalte hacen única cada pieza.",
  },
];
