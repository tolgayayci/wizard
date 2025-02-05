-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- Create updated policies with user-specific folders
CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (regexp_split_to_array(name, '/'))[1]
);

CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (regexp_split_to_array(name, '/'))[1]
)
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (regexp_split_to_array(name, '/'))[1]
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (regexp_split_to_array(name, '/'))[1]
);

-- Add comments for documentation
COMMENT ON POLICY "Users can upload their own avatars" ON storage.objects IS 'Allow users to upload avatars in their own folder';
COMMENT ON POLICY "Anyone can view avatars" ON storage.objects IS 'Allow public read access to all avatars';
COMMENT ON POLICY "Users can update their own avatars" ON storage.objects IS 'Allow users to update avatars in their own folder';
COMMENT ON POLICY "Users can delete their own avatars" ON storage.objects IS 'Allow users to delete avatars in their own folder';