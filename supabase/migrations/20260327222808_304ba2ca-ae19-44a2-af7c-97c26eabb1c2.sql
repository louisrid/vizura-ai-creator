
CREATE TABLE public.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'any',
  age text NOT NULL DEFAULT '25',
  hair text NOT NULL DEFAULT 'brunette',
  eye text NOT NULL DEFAULT 'brown',
  body text NOT NULL DEFAULT 'regular',
  style text NOT NULL DEFAULT 'natural',
  description text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own characters" ON public.characters
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own characters" ON public.characters
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own characters" ON public.characters
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own characters" ON public.characters
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
