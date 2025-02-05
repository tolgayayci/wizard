/*
  # Add User Profile Fields

  1. New Columns
    - `name` (text): User's display name
    - `company` (text): User's company name
    - `avatar_url` (text): URL to user's avatar image
    - `bio` (text): User's bio/description

  2. Validation
    - Name must be at least 3 characters
    - Company name must be at least 2 characters
    - Avatar URL must be a valid URL format
*/

-- Add new columns with validation
ALTER TABLE users
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS company text,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS bio text;

-- Add validation constraints
ALTER TABLE users
ADD CONSTRAINT valid_name_length 
  CHECK (name IS NULL OR LENGTH(name) >= 3),
ADD CONSTRAINT valid_company_length 
  CHECK (company IS NULL OR LENGTH(company) >= 2),
ADD CONSTRAINT valid_avatar_url 
  CHECK (avatar_url IS NULL OR avatar_url ~ '^https?://.*$');

-- Add comments for documentation
COMMENT ON COLUMN users.name IS 'User''s display name (min 3 characters)';
COMMENT ON COLUMN users.company IS 'User''s company name (min 2 characters)';
COMMENT ON COLUMN users.avatar_url IS 'URL to user''s avatar image';
COMMENT ON COLUMN users.bio IS 'User''s bio or description';