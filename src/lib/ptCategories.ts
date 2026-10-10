// Traduz os nomes de categoria (group-title) vindos das listas M3U para
// português. As listas de provedores vêm majoritariamente em inglês, e o app
// deve mostrar tudo em PT (TV ao vivo, filmes e séries), como o app próprio.
//
// Caso-insensível e por palavra exata dentro do group-title (que pode ser
// composto, ex.: "Documentary;News" → "Documentário;Notícias"). O que não for
// mapeado volta como está, sem quebrar categorias já em português.

const DICT: Record<string, string> = {
  // Gêneros / seções
  "movies": "Filmes", "movie": "Filmes", "film": "Filmes", "films": "Filmes",
  "filmes": "Filmes", "filme": "Filmes", "séries": "Séries", "série": "Séries",
  "cinema": "Cinema",
  "series": "Séries", "serie": "Séries",
  "tv shows": "Séries", "show": "Shows",
  "shows": "Shows", "novelas": "Novelas", "novela": "Novelas",
  "documentary": "Documentário", "documentaries": "Documentários",
  "documental": "Documentário", "docs": "Documentários",
  "kids": "Infantil", "children": "Infantil", "kids & family": "Infantil",
  "family": "Família", "cartoon": "Desenhos", "cartoons": "Desenhos",
  "animation": "Animação", "anime": "Animação", "anime movies": "Filmes de Animação",
  "religion": "Religião", "religious": "Religião", "worship": "Religião",
  "music": "Música", "music videos": "Clipes",
  "concert": "Shows", "concerts": "Shows", "radio": "Rádio",
  "education": "Educação", "educational": "Educação", "learning": "Educação",
  "science": "Ciência", "technology": "Tecnologia", "tech": "Tecnologia",
  "news": "Notícias",
  "business": "Negócios",
  "weather": "Clima",
  "entertainment": "Entretenimento",
  "culture": "Cultura", "art": "Arte", "arts": "Arte", "history": "História",
  "sports": "Esportes", "sport": "Esportes",
  "football": "Futebol", "soccer": "Futebol", "futebol": "Futebol",
  "boxing": "Lutas", "mma": "Lutas", "wrestling": "Lutas", "ufc": "UFC",
  "motorsport": "Automobilismo", "racing": "Corrida", "gaming": "Games",
  "games": "Games", "adult": "Adultos", "xxx": "Adultos", "porn": "Adultos",
  "movies 4k": "Filmes 4K", "4k": "4K", "uhd": "4K", "hd": "HD", "sd": "SD",
  "general": "Geral", "misc": "Diversos", "miscellaneous": "Diversos",
  "other": "Outros", "others": "Outros", "various": "Diversos", "live": "Ao Vivo",
  "live tv": "TV Ao Vivo", "tv": "TV",
  "lifestyle": "Estilo de Vida", "cooking": "Gastronomia", "food": "Gastronomia",
  "public": "Público", "legislative": "Legislativo", "shop": "Compras",
  "interactive": "Interativo", "devotional": "Devocional",
  "travel": "Viagem", "nature": "Natureza", "animal": "Animais", "animals": "Animais",
  "shopping": "Compras", "comedy": "Comédia", "drama": "Drama", "action": "Ação",
  "horror": "Terror", "thriller": "Suspense", "romance": "Romance",
  "scifi": "Ficção Científica", "sci-fi": "Ficção Científica",
  "fantasy": "Fantasia", "adventure": "Aventura", "war": "Guerra",
  "crime": "Policial", "mystery": "Mistério", "biography": "Biografia",
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Traduz group-title mantendo separadores (",", ";", "|", "/"). */
export function translateCategory(raw: string): string {
  const value = (raw ?? "").trim();
  if (!value) return "Geral";
  // Preserva separadores compostos, traduzindo cada pedaço.
  return value
    .split(/([,;|/])/)
    .map((part) => {
      const key = norm(part);
      return DICT[key] ?? part.trim();
    })
    .join("")
    .replace(/\s*([,;|/])\s*/g, "$1")
    .trim() || "Geral";
}
