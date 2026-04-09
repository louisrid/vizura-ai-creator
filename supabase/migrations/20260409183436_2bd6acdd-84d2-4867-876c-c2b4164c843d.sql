
-- rejected_prompts table
CREATE TABLE public.rejected_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt_text TEXT NOT NULL,
  rejected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rejected_prompts ENABLE ROW LEVEL SECURITY;

-- No user-facing policies — only service role can insert/read

-- generation_logs table
CREATE TABLE public.generation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  character_id UUID,
  prompt_text TEXT NOT NULL DEFAULT '',
  generation_type TEXT NOT NULL DEFAULT 'photo',
  gems_cost INTEGER NOT NULL DEFAULT 1,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;

-- No user-facing policies — only service role can insert/read
