import { supabase } from "@/integrations/supabase/client";

export type KnowledgeCard = {
  id: string;
  title: string;
  url?: string;
  summary?: string;
  tags?: string[];
  content_type?: string;
  metadata?: { image?: string | null; text?: string | null; siteName?: string | null };
  created_at: string;
  user_id?: string;
};

export async function loadCards(): Promise<KnowledgeCard[]> {
  const { data, error } = await supabase
    .from('knowledge_cards')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error loading cards:', error);
    return [];
  }
  
  return (data || []).map(card => ({
    ...card,
    metadata: card.metadata as { image?: string | null; text?: string | null; siteName?: string | null }
  }));
}

export async function createCard(card: Omit<KnowledgeCard, 'user_id'>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('knowledge_cards')
    .insert({
      id: card.id,
      title: card.title,
      url: card.url,
      summary: card.summary,
      tags: card.tags || [],
      content_type: card.content_type,
      metadata: card.metadata || {},
      user_id: user.id,
    });

  if (error) {
    console.error('Error creating card:', error);
    throw error;
  }
}

export async function updateCardTags(id: string, tags: string[]): Promise<void> {
  const { error } = await supabase
    .from('knowledge_cards')
    .update({ tags })
    .eq('id', id);

  if (error) {
    console.error('Error updating card tags:', error);
    throw error;
  }
}

export async function deleteCards(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('knowledge_cards')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Error deleting cards:', error);
    throw error;
  }
}

export async function getCard(id: string): Promise<KnowledgeCard | null> {
  const { data, error } = await supabase
    .from('knowledge_cards')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error getting card:', error);
    return null;
  }

  return data ? {
    ...data,
    metadata: data.metadata as { image?: string | null; text?: string | null; siteName?: string | null }
  } : null;
}


