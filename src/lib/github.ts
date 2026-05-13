interface GitHubRepo {
  owner: string;
  repo: string;
  url: string;
  branch?: string;
  path?: string;
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
 * Validates if a string is a valid GitHub repository URL.
 * Accepts plain repo URLs and /tree/<branch>[/<path>] URLs (subfolder imports).
 */
export function validateGitHubUrl(url: string): boolean {
  const trimmed = url.trim();
  // Plain forms (root of repo)
  const plain = [
    /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/,
    /^github\.com\/[\w.-]+\/[\w.-]+\/?$/,
    /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/,
    /^git@github\.com:[\w.-]+\/[\w.-]+\.git$/,
  ];
  if (plain.some(p => p.test(trimmed))) return true;
  // /tree/<branch>[/<path>] subfolder form
  return /^https?:\/\/(?:www\.)?github\.com\/[\w.-]+\/[\w.-]+\/tree\/[^/]+(?:\/.+)?\/?$/.test(trimmed);
}

/**
 * Extracts owner, repo, and (when present) branch + subfolder path from a GitHub URL.
 *
 * Supported forms:
 *  - https://github.com/owner/repo
 *  - https://github.com/owner/repo.git
 *  - git@github.com:owner/repo.git
 *  - https://github.com/owner/repo/tree/branch
 *  - https://github.com/owner/repo/tree/branch/path/to/subdir
 */
export function parseGitHubUrl(url: string): GitHubRepo | null {
  const trimmed = url.trim();

  // /tree/<branch>[/<path>] form — keep this first so it wins over the simpler match.
  const treeMatch = trimmed.match(
    /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/tree\/([^/]+)(?:\/(.+?))?\/?$/i,
  );
  if (treeMatch) {
    const [, owner, repo, branch, path] = treeMatch;
    return {
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`,
      branch,
      path: path ? decodeURIComponent(path).replace(/\/$/, '') : undefined,
    };
  }

  // Plain owner/repo (with optional protocol/SSH/.git/trailing slash)
  let cleanUrl = trimmed
    .replace(/^https?:\/\//, '')
    .replace(/^git@/, '')
    .replace(':', '/')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');

  const parts = cleanUrl.split('/');
  if (parts.length >= 3 && parts[0] === 'github.com') {
    const [, owner, repo] = parts;
    if (owner && repo) {
      return { owner, repo, url: `https://github.com/${owner}/${repo}` };
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
      // GitHub returns 403 for two very different cases: a private repo *and* an
      // unauthenticated rate-limit (60 req/hour/IP). Treating both as "private" produced
      // the misleading "Repository is private" message users hit on shared/corporate IPs.
      // If the rate limit is exhausted we don't know what the repo is — pass it through
      // optimistically and let the backend's `git clone` (which does not consume the API
      // rate limit) be the source of truth.
      if (await isRateLimited(response)) {
        return { exists: true, isPublic: true, name: repo };
      }
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
 * Detects whether a 403 response is a GitHub API rate-limit rather than a permission denial.
 * The most reliable signal is `X-RateLimit-Remaining: 0`; we also sniff the body message as
 * a fallback because some proxies strip non-standard headers.
 */
async function isRateLimited(response: Response): Promise<boolean> {
  if (response.headers.get('X-RateLimit-Remaining') === '0') return true;
  try {
    const cloned = response.clone();
    const body = await cloned.json();
    const message: string = body?.message ?? '';
    return /rate limit/i.test(message);
  } catch {
    return false;
  }
}

/**
 * Validates if a GitHub repository is a valid Stylus project
 * by checking for Cargo.toml at root and stylus-sdk dependency
 */
export async function validateStylusProject(
  owner: string,
  repo: string,
  branch?: string,
  path?: string,
): Promise<{ isValid: boolean; reason?: string }> {
  try {
    // Fetch Cargo.toml at the requested subpath (or repo root) on the requested branch.
    const cargoPath = path ? `${path.replace(/^\/+|\/+$/g, '')}/Cargo.toml` : 'Cargo.toml';
    const ref = branch ? `?ref=${encodeURIComponent(branch)}` : '';
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${cargoPath}${ref}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Wizard-IDE',
        },
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        const where = path ? `at "${path}"` : 'in the repository root';
        return {
          isValid: false,
          reason: `No Cargo.toml found ${where}. This doesn't appear to be a Stylus project.`,
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
  userId: string,
  branch?: string,
  path?: string,
): Promise<{ projectId: string; filesCount: number }> {
  let projectId: string | null = null;

  try {
    // Parse repository info
    const repoInfo = parseGitHubUrl(repoUrl);
    if (!repoInfo) {
      throw new Error('Invalid GitHub URL');
    }
    const finalBranch = branch ?? repoInfo.branch;
    const finalPath = path ?? repoInfo.path;

    // First create the project in Supabase
    const { supabase } = await import('./supabase');
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: projectName,
        description: projectDescription,
        code: '// Importing from GitHub...',
        source_url: repoInfo.url,
        import_type: 'github',
        import_metadata: {
          import_date: new Date().toISOString(),
          repository_name: repoInfo.repo,
          repository_owner: repoInfo.owner,
          repository_branch: finalBranch,
          repository_path: finalPath,
          import_status: 'importing',
        }
      })
      .select()
      .single();

    if (projectError) {
      throw new Error(`Failed to create project: ${projectError.message}`);
    }

    projectId = project.id;

    // Then clone the repository using the backend API. We pass the canonical repo URL
    // (without /tree/<branch>/<path>); branch and path travel as separate fields.
    const backendUrl = import.meta.env.VITE_API_URL;

    const response = await fetch(`${backendUrl}/api/github/clone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        project_id: project.id,
        repo_url: repoInfo.url,
        branch: finalBranch,
        path: finalPath,
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
        repository_branch: finalBranch,
        repository_path: finalPath,
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
 * Suggests a project name from the repo name, or — when importing a subfolder — from the
 * deepest path segment (e.g. ".../stylus-examples/01-simple-contract" → "01-simple-contract").
 */
export function suggestProjectName(repoName: string, path?: string): string {
  const base = path ? (path.split('/').filter(Boolean).pop() || repoName) : repoName;
  return base
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}