import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Message = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: Date;
};

export function useChat(conversationId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);
  const [isLoading, setIsLoading] = useState(false);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('conversation_id, content, created_at')
      .eq('user_id', user.id)
      .eq('role', 'user')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    // Group by conversation and get first message as title
    const convMap = new Map<string, Conversation>();
    data?.forEach(msg => {
      if (!convMap.has(msg.conversation_id)) {
        convMap.set(msg.conversation_id, {
          id: msg.conversation_id,
          title: msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : ''),
          createdAt: new Date(msg.created_at),
        });
      }
    });

    setConversations(Array.from(convMap.values()));
  }, []);

  // Load messages for a conversation
  const loadMessages = useCallback(async (convId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data?.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: new Date(msg.created_at),
    })) || []);
  }, []);

  // Initialize
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId, loadMessages]);

  // Start new conversation
  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
  }, []);

  // Select conversation
  const selectConversation = useCallback((convId: string) => {
    setCurrentConversationId(convId);
  }, []);

  // Save message to database
  const saveMessage = async (
    convId: string, 
    role: 'user' | 'assistant', 
    content: string
  ): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: convId,
        user_id: user.id,
        role,
        content,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving message:', error);
      return null;
    }

    return data?.id || null;
  };

  // Send message
  const sendMessage = async (content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Not authenticated');
      return;
    }

    // Create or use existing conversation
    const convId = currentConversationId || crypto.randomUUID();
    if (!currentConversationId) {
      setCurrentConversationId(convId);
    }

    // Add user message to UI immediately
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Save user message
    await saveMessage(convId, 'user', content);

    try {
      const { data, error } = await supabase.functions.invoke('chat-knowledge', {
        body: { question: content }
      });

      if (error) throw error;

      const assistantContent = data.answer || 'No response received';
      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Save assistant message
      await saveMessage(convId, 'assistant', assistantContent);
      
      // Refresh conversations list
      loadConversations();
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete conversation
  const deleteConversation = async (convId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('conversation_id', convId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting conversation:', error);
      return;
    }

    if (currentConversationId === convId) {
      startNewConversation();
    }
    loadConversations();
  };

  return { 
    messages, 
    conversations,
    currentConversationId,
    sendMessage, 
    isLoading,
    startNewConversation,
    selectConversation,
    deleteConversation,
  };
}
