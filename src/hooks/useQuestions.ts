import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Question = {
  id: string;
  card_id: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  created_at: string;
};

export type ReviewSession = {
  id: string;
  question_id: string;
  is_correct: boolean;
  ease_factor: number;
  interval_days: number;
  next_review: string;
  reviewed_at: string;
};

export type QuestionWithReview = Question & {
  lastReview?: ReviewSession;
  cardTitle?: string;
};

export function useQuestions(cardId?: string) {
  const [questions, setQuestions] = useState<QuestionWithReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load questions
  const loadQuestions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('questions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (cardId) {
        query = query.eq('card_id', cardId);
      }

      const { data: questionsData, error } = await query;
      if (error) throw error;

      // Get latest review sessions
      const questionIds = questionsData?.map(q => q.id) || [];
      let reviewsMap: Record<string, ReviewSession> = {};

      if (questionIds.length > 0) {
        const { data: reviewsData } = await supabase
          .from('review_sessions')
          .select('*')
          .in('question_id', questionIds)
          .order('reviewed_at', { ascending: false });

        // Get latest review for each question
        reviewsData?.forEach(review => {
          if (!reviewsMap[review.question_id]) {
            reviewsMap[review.question_id] = review as ReviewSession;
          }
        });
      }

      // Get card titles
      const cardIds = [...new Set(questionsData?.map(q => q.card_id) || [])];
      let cardsMap: Record<string, string> = {};
      
      if (cardIds.length > 0) {
        const { data: cardsData } = await supabase
          .from('knowledge_cards')
          .select('id, title')
          .in('id', cardIds);

        cardsData?.forEach(card => {
          cardsMap[card.id] = card.title;
        });
      }

      const questionsWithReviews: QuestionWithReview[] = (questionsData || []).map(q => ({
        ...q,
        difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
        lastReview: reviewsMap[q.id],
        cardTitle: cardsMap[q.card_id],
      }));

      setQuestions(questionsWithReviews);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Generate questions for a card
  const generateQuestions = async (targetCardId: string) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: { cardId: targetCardId }
      });

      if (error) throw error;

      toast.success(`Generated ${data.questions?.length || 0} questions!`);
      loadQuestions();
      return data.questions;
    } catch (error: any) {
      console.error('Error generating questions:', error);
      toast.error(error.message || 'Failed to generate questions');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  // Submit a review answer
  const submitReview = async (questionId: string, isCorrect: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get previous review to calculate new interval using SM-2 algorithm
    const question = questions.find(q => q.id === questionId);
    const prevReview = question?.lastReview;
    
    let easeFactor = prevReview?.ease_factor || 2.5;
    let intervalDays = prevReview?.interval_days || 1;

    if (isCorrect) {
      // SM-2: Increase interval
      if (intervalDays === 1) {
        intervalDays = 6;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor);
      }
      // Increase ease factor slightly
      easeFactor = Math.min(2.5, easeFactor + 0.1);
    } else {
      // Reset on wrong answer
      intervalDays = 1;
      // Decrease ease factor
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + intervalDays);

    try {
      const { error } = await supabase
        .from('review_sessions')
        .insert({
          question_id: questionId,
          user_id: user.id,
          is_correct: isCorrect,
          ease_factor: easeFactor,
          interval_days: intervalDays,
          next_review: nextReview.toISOString(),
        });

      if (error) throw error;
      loadQuestions();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to save review');
    }
  };

  // Get questions due for review
  const getDueQuestions = useCallback(() => {
    const now = new Date();
    return questions.filter(q => {
      if (!q.lastReview) return true; // Never reviewed
      return new Date(q.lastReview.next_review) <= now;
    });
  }, [questions]);

  // Delete a question
  const deleteQuestion = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      loadQuestions();
      toast.success('Question deleted');
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  return {
    questions,
    isLoading,
    isGenerating,
    generateQuestions,
    submitReview,
    getDueQuestions,
    deleteQuestion,
    refetch: loadQuestions,
  };
}
