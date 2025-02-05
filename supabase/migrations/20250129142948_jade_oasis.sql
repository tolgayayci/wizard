/*
  # Add Project Sharing Support

  1. New Fields
    - `is_public` boolean: Controls project visibility
    - `shared_at` timestamp: Records when project was first shared
    - `view_count` integer: Tracks number of views

  2. Changes
    - Add trigger to update shared_at timestamp
    - Add trigger to increment view count
    - Update RLS policies for public access

  3. Security
    - Enable RLS for all tables
    - Add policies for public read access
*/

-- Add sharing fields to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_at timestamptz,
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Create trigger to update shared_at timestamp
CREATE OR REPLACE FUNCTION update_project_shared_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_public = true AND (OLD.is_public = false OR OLD.is_public IS NULL) THEN
    NEW.shared_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_shared_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_shared_timestamp();

-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_project_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET view_count = view_count + 1
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create project views table to track unique views
CREATE TABLE IF NOT EXISTS project_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewer_ip text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on project_views
ALTER TABLE project_views ENABLE ROW LEVEL SECURITY;

-- Create trigger to increment view count on new view
CREATE TRIGGER increment_view_count_on_new_view
  AFTER INSERT ON project_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_project_view_count();

-- Update RLS policies for projects
CREATE POLICY "Anyone can view public projects"
  ON projects
  FOR SELECT
  USING (
    is_public = true OR
    auth.uid() = user_id
  );

-- Policies for project_views
CREATE POLICY "Users can insert views"
  ON project_views
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Project owners can view their project views"
  ON project_views
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON projects(is_public);
CREATE INDEX IF NOT EXISTS idx_project_views_project_id ON project_views(project_id);
CREATE INDEX IF NOT EXISTS idx_project_views_viewer_id ON project_views(viewer_id);