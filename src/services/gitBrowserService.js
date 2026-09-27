const MAINFRAME_EXTENSIONS = new Set([
  // COBOL programs
  '.cbl', '.cob', '.pco', '.sqb',
  // Copybooks
  '.cpy', '.copy', '.inc',
  // JCL & Procedures
  '.jcl', '.job', '.cntl', '.proc', '.prc',
  // Other mainframe artifacts
  '.sql', '.ddl', '.bms', '.txt', '.dat'
]);

/**
 * Parse a GitHub URL into { owner, repo, branch }
 */
export function parseGithubUrl(rawUrl) {
  if (!rawUrl) return null;
  let url = rawUrl.trim();
  if (url.startsWith('git@github.com:')) {
    url = url.replace('git@github.com:', 'https://github.com/');
  }
  const cleanUrl = url.replace(/\.git$/i, '').replace(/\/+$/, '');
  const match = cleanUrl.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/i);
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2],
    branch: match[3] || null
  };
}

/**
 * Fetch GitHub repository files directly in the browser via GitHub API + Raw Content
 * Fallback when backend/serverless endpoints are not reachable or return 404
 */
export async function fetchGithubRepoBrowser(repoUrl, targetBranch, onProgress) {
  const parsed = parseGithubUrl(repoUrl);
  if (!parsed) {
    throw new Error('Direct browser cloning is only supported for GitHub URLs (e.g. https://github.com/owner/repo).');
  }

  const { owner, repo } = parsed;
  let branch = (targetBranch && targetBranch.trim()) || parsed.branch;

  if (onProgress) onProgress(`Connecting to GitHub repository ${owner}/${repo}...`);

  // If no branch provided, resolve the default branch
  if (!branch) {
    try {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        branch = repoData.default_branch || 'main';
      } else {
        branch = 'main';
      }
    } catch {
      branch = 'main';
    }
  }

  if (onProgress) onProgress(`Fetching repository file tree for branch "${branch}"...`);

  // Fetch full tree recursively
  let treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
    headers: { 'Accept': 'application/vnd.github.v3+json' }
  });

  // If failed with 404 and branch was 'main', attempt 'master'
  if (!treeRes.ok && branch === 'main' && !targetBranch) {
    branch = 'master';
    treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
  }

  if (!treeRes.ok) {
    const errData = await treeRes.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to fetch repository tree from GitHub (HTTP ${treeRes.status}).`);
  }

  const treeData = await treeRes.json();
  if (!treeData.tree || !Array.isArray(treeData.tree)) {
    throw new Error('Invalid repository structure returned by GitHub.');
  }

  // Filter mainframe/COBOL files
  const matchingItems = treeData.tree.filter((item) => {
    if (item.type !== 'blob') return false;
    const dot = item.path.lastIndexOf('.');
    if (dot === -1) return false;
    const ext = item.path.substring(dot).toLowerCase();
    return MAINFRAME_EXTENSIONS.has(ext);
  });

  if (matchingItems.length === 0) {
    throw new Error(`Repository cloned successfully, but no COBOL or mainframe files (.cbl, .cob, .cpy, .jcl) were found in ${owner}/${repo}.`);
  }

  if (onProgress) onProgress(`Found ${matchingItems.length} mainframe files. Downloading contents...`);

  // Download raw contents in parallel batches of 5
  const files = [];
  const batchSize = 6;
  for (let i = 0; i < matchingItems.length; i += batchSize) {
    const batch = matchingItems.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const encodedPath = item.path.split('/').map(encodeURIComponent).join('/');
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodedPath}`;
        try {
          const res = await fetch(rawUrl);
          if (!res.ok) return null;
          const content = await res.text();
          const cleanName = item.path.split('/').pop();
          return {
            name: cleanName,
            path: item.path,
            content,
            sizeBytes: item.size || content.length,
            lastModified: new Date().toISOString()
          };
        } catch (e) {
          console.warn(`Failed to fetch file ${item.path}:`, e);
          return null;
        }
      })
    );

    for (const res of batchResults) {
      if (res) files.push(res);
    }

    if (onProgress) {
      onProgress(`Downloaded ${files.length} of ${matchingItems.length} files...`);
    }
  }

  return {
    success: true,
    files,
    totalFiles: files.length,
    repoUrl,
    branch,
    source: 'github-browser'
  };
}
