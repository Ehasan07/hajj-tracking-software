/**
 * Recitations the guide book plays, ayah by ayah. The audio comes from
 * Islamic Network's CDN (alquran.cloud), which allows it for personal and
 * educational use; the copyright stays with the reciters. Our server keeps a
 * copy of each ayah it has fetched, so visitors' browsers never contact the CDN.
 */
export const RECITERS = [
  { id: "husary", edition: "ar.husary", name: { bn: "মাহমুদ খলিল আল-হুসারি", en: "Mahmoud Khalil Al-Husary" } },
  { id: "alafasy", edition: "ar.alafasy", name: { bn: "মিশারি রাশিদ আল-আফাসি", en: "Mishary Rashid Alafasy" } },
] as const;
export type ReciterId = (typeof RECITERS)[number]["id"];
