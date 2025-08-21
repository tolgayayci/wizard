interface GitHubRepo {
  owner: string;
  repo: string;
  url: string;
}

interface CloneResult {
  success: boolean;
  files_count: number;
  message: string;
  main_code?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Validates if a string is a valid GitHub repository URL
 */
export function validateGitHubUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/,
    /^github\.com\/[\w.-]+\/[\w.-]+\/?$/,
    /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/,
    /^git@github\.com:[\w.-]+\/[\w.-]+\.git$/,
  ];

  const trimmedUrl = url.trim();
  return patterns.some(pattern => pattern.test(trimmedUrl));
}

/**
 * Extracts owner and repository name from a GitHub URL
 */
export function parseGitHubUrl(url: string): GitHubRepo | null {
  const trimmedUrl = url.trim();
  
  // Remove protocol if present
  let cleanUrl = trimmedUrl.replace(/^https?:\/\//, '');
  
  // Remove git@ prefix for SSH URLs
  cleanUrl = cleanUrl.replace(/^git@/, '');
  
  // Replace : with / for SSH URLs
  cleanUrl = cleanUrl.replace(':', '/');
  
  // Remove .git suffix
  cleanUrl = cleanUrl.replace(/\.git$/, '');
  
  // Remove trailing slash
  cleanUrl = cleanUrl.replace(/\/$/, '');
  
  // Extract parts
  const parts = cleanUrl.split('/');
  
  if (parts.length >= 3 && parts[0] === 'github.com') {
    const owner = parts[1];
    const repo = parts[2];
    
    if (owner && repo) {
      return {
        owner,
        repo,
        url: `https://github.com/${owner}/${repo}`,
      };
    }
  }
  
  return null;
}

/**
 * Checks if a GitHub repository exists and is public
 */
export async function checkGitHubRepository(owner: string, repo: string): Promise<{ exists: boolean; isPublic: boolean; name: string; description?: string }> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Wizard-IDE',
      },
    });

    if (response.status === 404) {
      return { exists: false, isPublic: false, name: repo };
    }

    if (response.status === 403) {
      return { exists: true, isPublic: false, name: repo };
    }

    if (response.ok) {
      const repoData = await response.json();
      return {
        exists: true,
        isPublic: !repoData.private,
        name: repoData.name,
        description: repoData.description,
      };
    }

    throw new Error(`GitHub API returned status ${response.status}`);
  } catch (error) {
    console.error('Error checking GitHub repository:', error);
    throw new Error('Failed to check repository. Please verify the URL and try again.');
  }
}

/**
 * Validates if a GitHub repository is a valid Stylus project
 * by checking for Cargo.toml at root and stylus-sdk dependency
 */
export async function validateStylusProject(owner: string, repo: string): Promise<{ isValid: boolean; reason?: string }> {
  try {
    // First, fetch the Cargo.toml file from the repository root
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/Cargo.toml`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Wizard-IDE',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { 
          isValid: false, 
          reason: 'No Cargo.toml found in repository root. This doesn\'t appear to be a Stylus project.' 
        };
      }
      throw new Error(`GitHub API returned status ${response.status}`);
    }

    const fileData = await response.json();
    
    // Decode the base64 content
    const content = atob(fileData.content);
    
    // Check if the Cargo.toml contains stylus-sdk dependency
    const hasStylusSdk = content.includes('stylus-sdk') || 
                        content.includes('stylus_sdk') ||
                        content.includes('stylus-proc') ||
                        content.includes('stylus_proc');
    
    if (!hasStylusSdk) {
      return { 
        isValid: false, 
        reason: 'This project doesn\'t include stylus-sdk as a dependency. Please select a valid Stylus smart contract project.' 
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating Stylus project:', error);
    // If we can't validate, let's be permissive and allow the import
    // The backend will handle any actual issues during cloning
    return { 
      isValid: true,
      reason: 'Could not validate project structure, proceeding with import' 
    };
  }
}

/**
 * Imports a GitHub repository by cloning it to the backend and creating a new project
 */
export async function importGitHubRepository(
  repoUrl: string,
  projectName: string,
  projectDescription: string,
  userId: string
): Promise<{ projectId: string; filesCount: number }> {
  let projectId: string | null = null;
  
  try {
    // Parse repository info
    const repoInfo = parseGitHubUrl(repoUrl);
    if (!repoInfo) {
      throw new Error('Invalid GitHub URL');
    }

    // First create the project in Supabase
    const { supabase } = await import('./supabase');
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: projectName,
        description: projectDescription,
        code: '// Importing from GitHub...',
        source_url: repoUrl,
        import_type: 'github',
        import_metadata: {
          import_date: new Date().toISOString(),
          repository_name: repoInfo.repo,
          repository_owner: repoInfo.owner,
          import_status: 'importing',
        }
      })
      .select()
      .single();

    if (projectError) {
      throw new Error(`Failed to create project: ${projectError.message}`);
    }

    projectId = project.id;

    // Then clone the repository using the backend API
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
    
    const response = await fetch(`${backendUrl}/api/github/clone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        project_id: project.id,
        repo_url: repoUrl,
      }),
    });

    const result: ApiResponse<CloneResult> = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to clone repository');
    }

    // Backend has confirmed the clone is complete and filesystem is ready
    // Update project with actual code and metadata
    const updateData: any = {
      import_metadata: {
        import_date: new Date().toISOString(),
        repository_name: repoInfo.repo,
        repository_owner: repoInfo.owner,
        import_status: 'completed',
        files_count: result.data?.files_count || 0,
      }
    };
    
    // If we got the main source code, update it
    if (result.data?.main_code) {
      updateData.code = result.data.main_code;
    }
    
    await supabase
      .from('projects')
      .update(updateData)
      .eq('id', project.id);

    return {
      projectId: project.id,
      filesCount: result.data?.files_count || 0,
    };
  } catch (error) {
    // If we created a project but something failed, clean it up
    if (projectId) {
      const { supabase } = await import('./supabase');
      await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
    }
    
    console.error('Error importing GitHub repository:', error);
    throw error instanceof Error ? error : new Error('Failed to import repository');
  }
}

/**
 * Suggests a project name based on the repository name
 */
export function suggestProjectName(repoName: string): string {
  // Convert to lowercase and replace special characters
  return repoName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}