ALTER TABLE public.generations ADD COLUMN character_id uuid DEFAULT NULL;
CREATE INDEX idx_generations_character_id ON public.generations(character_id);