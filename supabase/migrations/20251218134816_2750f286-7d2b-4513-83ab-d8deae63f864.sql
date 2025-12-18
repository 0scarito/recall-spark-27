-- Chat messages for conversation persistence
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_messages
CREATE POLICY "Users can view their own messages"
ON public.chat_messages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON public.chat_messages FOR DELETE
USING (auth.uid() = user_id);

-- Questions for quiz/review system
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES public.knowledge_cards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- RLS policies for questions
CREATE POLICY "Users can view their own questions"
ON public.questions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own questions"
ON public.questions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questions"
ON public.questions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own questions"
ON public.questions FOR DELETE
USING (auth.uid() = user_id);

-- Review sessions for spaced repetition tracking
CREATE TABLE public.review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  is_correct BOOLEAN NOT NULL,
  ease_factor REAL DEFAULT 2.5,
  interval_days INT DEFAULT 1,
  next_review TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for review_sessions
CREATE POLICY "Users can view their own review sessions"
ON public.review_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own review sessions"
ON public.review_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own review sessions"
ON public.review_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at);
CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id);
CREATE INDEX idx_questions_card ON public.questions(card_id);
CREATE INDEX idx_questions_user ON public.questions(user_id);
CREATE INDEX idx_review_sessions_next ON public.review_sessions(user_id, next_review);
CREATE INDEX idx_review_sessions_question ON public.review_sessions(question_id);