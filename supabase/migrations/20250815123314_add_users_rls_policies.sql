-- Add RLS policies for users table

-- Enable RLS on users table (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can create own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Allow users to create their own profile
CREATE POLICY "Users can create own profile" ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Add similar policies for projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop existing project policies if they exist
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can view public projects" ON public.projects;

-- Allow users to view their own projects
CREATE POLICY "Users can view own projects" ON public.projects
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to create their own projects
CREATE POLICY "Users can create own projects" ON public.projects
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own projects
CREATE POLICY "Users can update own projects" ON public.projects
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own projects
CREATE POLICY "Users can delete own projects" ON public.projects
    FOR DELETE
    USING (auth.uid() = user_id);

-- Allow anyone to view public projects
CREATE POLICY "Anyone can view public projects" ON public.projects
    FOR SELECT
    USING (is_public = true);