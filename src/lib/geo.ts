// Timor-Leste administrative divisions used for delivery. Atauro is a municipality of its own since 2022 (NOT part of Dili).
export const MUNICIPALITIES = [
  { key: 'dili', name: 'Dili' }, { key: 'atauro', name: 'Atauro' }, { key: 'aileu', name: 'Aileu' }, { key: 'ainaro', name: 'Ainaro' },
  { key: 'baucau', name: 'Baucau' }, { key: 'bobonaro', name: 'Bobonaro' }, { key: 'covalima', name: 'Cova Lima' }, { key: 'ermera', name: 'Ermera' },
  { key: 'lautem', name: 'Lautém' }, { key: 'liquica', name: 'Liquiçá' }, { key: 'manatuto', name: 'Manatuto' }, { key: 'manufahi', name: 'Manufahi' },
  { key: 'viqueque', name: 'Viqueque' }, { key: 'oecusse', name: 'Oecusse (RAEOA)' },
] as const;
export const MUNICIPALITY_KEYS: string[] = MUNICIPALITIES.map((m) => m.key);

export const DILI_POSTS = [
  { key: 'cristo_rei', name: 'Cristo Rei' }, { key: 'dom_aleixo', name: 'Dom Aleixo' }, { key: 'metinaro', name: 'Metinaro' },
  { key: 'nain_feto', name: 'Nain Feto' }, { key: 'vera_cruz', name: 'Vera Cruz' },
] as const;
export const DILI_POST_KEYS: string[] = DILI_POSTS.map((p) => p.key);

/** Sucos per administrative post (31 in total). Source: Wikipedia administrative-post pages; editable later in the admin zone manager. */
export const DILI_SUCOS: Record<string, string[]> = {
  cristo_rei: ['Ailok', 'Balibar', 'Becora', 'Bidau Santana', 'Camea', 'Culu Hun', 'Hera', 'Meti Aut'],
  dom_aleixo: ['Bairro Pite', 'Bebonuk', 'Comoro', 'Fatuhada', 'Kampung Alor', 'Madohi', 'Manleuana'],
  metinaro: ['Mantelolão', 'Sabuli', 'Wenunuc'],
  nain_feto: ['Acadiru Hun', 'Bemori', 'Bidau Lecidere', 'Gricenfor', 'Lahane Oriental', 'Santa Cruz'],
  vera_cruz: ['Caicoli', 'Colmera', 'Dare', 'Lahane Ocidental', 'Mascarenhas', 'Motael', 'Vila Verde'],
};
