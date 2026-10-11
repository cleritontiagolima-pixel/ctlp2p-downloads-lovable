import type { Catalog, Cat, Item } from "./catalog";

// Groups live channels by brand (all Globo regionals under "Globo", all HBO
// under "HBO", HBO Max apart, etc.) so customers find channels quickly.
// Order matters: more specific brands come first.
export const BRANDS: Array<[string, RegExp]> = [
  ["HBO Max", /\bhbo\s*max\b/i],
  ["HBO", /\bhbo\b/i],
  ["GloboNews", /\bglobo\s*news\b/i],
  ["SporTV", /\bsportv\b/i],
  ["Premiere", /\bpremiere\b/i],
  ["Globo", /\bglobo\b|\brpc\b|\beptv\b|\banhanguera\b|\brbs\b|\binter\s*tv\b|\btv\s*tem\b|\bnsc\b|\btv\s*verdes\s*mares\b|\btv\s*bahia\b|\bmirante\b|\btv\s*integra[cç][aã]o\b/i],
  ["SBT", /\bsbt\b/i],
  ["Record", /\brecord\b/i],
  ["Band", /\bband\b|\bbandnews\b|\bbandsports\b/i],
  ["RedeTV", /\brede\s*tv\b/i],
  ["TV Cultura", /\bcultura\b/i],
  ["ESPN", /\bespn\b/i],
  ["TNT Sports", /\btnt\s*sports\b/i],
  ["TNT", /\btnt\b/i],
  ["Fox Sports", /\bfox\s*sports\b/i],
  ["DAZN", /\bdazn\b/i],
  ["Combate", /\bcombate\b/i],
  ["Telecine", /\btelecine\b/i],
  ["Megapix", /\bmegapix\b/i],
  ["Paramount", /\bparamount\b/i],
  ["Warner", /\bwarner\b/i],
  ["Universal", /\buniversal\b/i],
  ["Star", /\bstar\b/i],
  ["Disney", /\bdisney\b/i],
  ["Discovery", /\bdiscovery\b|\bdisc\b/i],
  ["National Geographic", /\bnat\s*geo\b|\bnational\s*geographic\b/i],
  ["History", /\bhistory\b|\bh2\b/i],
  ["Cartoon Network", /\bcartoon\b/i],
  ["Nickelodeon", /\bnick\b|\bnickelodeon\b/i],
  ["AMC", /\bamc\b/i],
  ["A&E", /\ba\s*&\s*e\b/i],
  ["Multishow", /\bmultishow\b/i],
  ["Canal Brasil", /\bcanal\s*brasil\b/i],
];

const ADULT = /xxx|adult|\+\s*18|adultos/i;
const MIN = 2; // a brand needs at least this many channels to get its own group

export function brandOf(name: string): string | undefined {
  return BRANDS.find(([, re]) => re.test(name))?.[0];
}

export function organizeLive(cats: Cat[], items: Item[]): { cats: Cat[]; items: Item[] } {
  const adult = new Set(cats.filter((c) => ADULT.test(c.name)).map((c) => c.id));
  const brand = new Map<Item, string>();
  const size = new Map<string, number>();
  for (const i of items) {
    if (adult.has(i.cat)) continue;
    const b = brandOf(i.name);
    if (b) { brand.set(i, b); size.set(b, (size.get(b) ?? 0) + 1); }
  }
  const out = items.map((i) => {
    const b = brand.get(i);
    return b && (size.get(b) ?? 0) >= MIN ? { ...i, cat: `brand:${b}` } : i;
  });
  const used = new Set(out.map((i) => i.cat));
  const brandCats = BRANDS.map(([n]) => n).filter((n) => used.has(`brand:${n}`)).map((n) => ({ id: `brand:${n}`, name: n }));
  const rest = cats.filter((c) => used.has(c.id));
  const collator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });
  out.sort((a, b) => (a.cat.startsWith("brand:") && a.cat === b.cat ? collator.compare(a.name, b.name) : 0));
  return { cats: [...brandCats, ...rest], items: out };
}

// Wraps a catalog so the live section comes organized by brand.
export function organized(c: Catalog): Catalog {
  let live: Promise<{ cats: Cat[]; items: Item[] }> | undefined;
  const get = () => (live ??= Promise.all([c.categories("live"), c.items("live")]).then(([a, b]) => organizeLive(a, b)).catch((e) => { live = undefined; throw e; }));
  return {
    ...c,
    liveUrl: c.liveUrl, movieUrl: c.movieUrl, episodeUrl: c.episodeUrl, episodes: c.episodes, epg: c.epg, hasEpisodes: c.hasEpisodes,
    categories: (s) => (s === "live" ? get().then((r) => r.cats) : c.categories(s)),
    items: (s) => (s === "live" ? get().then((r) => r.items) : c.items(s)),
  };
}
