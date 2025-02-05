-- Create avatars bucket
DO $$ 
BEGIN
  -- Create the bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

  -- Create policy to allow authenticated users to upload their own avatars
  CREATE POLICY "Users can upload their own avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = SPLIT_PART(name, '-', 1)
  );

  -- Create policy to allow public read access to avatars
  CREATE POLICY "Anyone can view avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

  -- Create policy to allow users to update their own avatars
  CREATE POLICY "Users can update their own avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = SPLIT_PART(name, '-', 1)
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = SPLIT_PART(name, '-', 1)
  );

  -- Create policy to allow users to delete their own avatars
  CREATE POLICY "Users can delete their own avatars"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = SPLIT_PART(name, '-', 1)
  );
END $$;

-- Add comments for documentation
COMMENT ON POLICY "Users can upload their own avatars" ON storage.objects IS 'Allow users to upload avatars with filenames starting with their user ID';
COMMENT ON POLICY "Anyone can view avatars" ON storage.objects IS 'Allow public read access to all avatars';
COMMENT ON POLICY "Users can update their own avatars" ON storage.objects IS 'Allow users to update their own avatars';
COMMENT ON POLICY "Users can delete their own avatars" ON storage.objects IS 'Allow users to delete their own avatars';