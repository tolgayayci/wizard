/*
  # Project Sharing Schema Update

  1. Changes
    - Add sharing fields to projects table
    - Create project views tracking system
    - Add RLS policies for public access

  2. Security
    - Enable RLS on project_views table
    - Add policies for view tracking
    - Update project visibility policies
*/

-- Step 1: Add columns to projects table
DO $$ BEGIN
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS shared_at timestamptz;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;
END $$;

-- Step 2: Create project views table
CREATE TABLE IF NOT EXISTS project_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewer_ip text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, viewer_id, viewer_ip)
);

-- Step 3: Enable RLS
ALTER TABLE project_views ENABLE ROW LEVEL SECURITY;

-- Step 4: Create functions
CREATE OR REPLACE FUNCTION update_project_shared_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_public = true AND (OLD.is_public = false OR OLD.is_public IS NULL) THEN
    NEW.shared_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_project_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET view_count = view_count + 1
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create triggers
DROP TRIGGER IF EXISTS update_project_shared_at ON projects;
CREATE TRIGGER update_project_shared_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_shared_timestamp();

DROP TRIGGER IF EXISTS increment_view_count_on_new_view ON project_views;
CREATE TRIGGER increment_view_count_on_new_view
  AFTER INSERT ON project_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_project_view_count();

-- Step 6: Create RLS policies
DROP POLICY IF EXISTS "Anyone can view public projects" ON projects;
CREATE POLICY "Anyone can view public projects"
  ON projects
  FOR SELECT
  USING (
    is_public = true OR
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can insert views" ON project_views;
CREATE POLICY "Users can insert views"
  ON project_views
  FOR INSERT
  TO public
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE is_public = true
    )
  );

DROP POLICY IF EXISTS "Project owners can view their project views" ON project_views;
CREATE POLICY "Project owners can view their project views"
  ON project_views
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Step 7: Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON projects(is_public);
CREATE INDEX IF NOT EXISTS idx_project_views_project_id ON project_views(project_id);
CREATE INDEX IF NOT EXISTS idx_project_views_viewer_id ON project_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_project_views_created_at ON project_views(created_at);

-- Step 8: Add documentation
COMMENT ON TABLE project_views IS 'Tracks unique views of shared projects';
COMMENT ON COLUMN project_views.viewer_id IS 'Optional user ID for authenticated viewers';
COMMENT ON COLUMN project_views.viewer_ip IS 'IP address for anonymous viewers';