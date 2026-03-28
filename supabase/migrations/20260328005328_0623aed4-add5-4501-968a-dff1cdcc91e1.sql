
-- Add DELETE policy for generations so users can delete their own photos
CREATE POLICY "Users can delete own generations"
ON public.generations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
