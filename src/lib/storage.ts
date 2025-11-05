export type KnowledgeCard = {
  id: string;
  title: string;
  url?: string;
  summary?: string;
  tags?: string[];
  content_type?: string;
  metadata?: { image?: string | null; text?: string | null; siteName?: string | null };
  created_at: string;
};

const KEY = 'knowledge_cards';

function safeRead(): KnowledgeCard[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as KnowledgeCard[]) : [];
  } catch {
    return [];
  }
}

function safeWrite(cards: KnowledgeCard[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cards));
  } catch {}
}

export async function loadCards(): Promise<KnowledgeCard[]> {
  return safeRead().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createCard(card: KnowledgeCard): Promise<void> {
  const cards = safeRead();
  cards.unshift(card);
  safeWrite(cards);
}

export async function updateCardTags(id: string, tags: string[]): Promise<void> {
  const cards = safeRead();
  const idx = cards.findIndex((c) => c.id === id);
  if (idx >= 0) {
    cards[idx] = { ...cards[idx], tags };
    safeWrite(cards);
  }
}

export async function deleteCards(ids: string[]): Promise<void> {
  const set = new Set(ids);
  const cards = safeRead().filter((c) => !set.has(c.id));
  safeWrite(cards);
}

export async function getCard(id: string): Promise<KnowledgeCard | null> {
  const cards = safeRead();
  return cards.find((c) => c.id === id) || null;
}


