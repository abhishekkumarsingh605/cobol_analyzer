import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';
import JSZip from 'jszip';

const execPromise = util.promisify(exec);

// Mainframe codebase extensions
export const MAINFRAME_EXTENSIONS = new Set([
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
 * Parse a Git URL to identify provider, owner, repo, and optional branch
 */
export function parseGitUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let url = rawUrl.trim();

  // Handle SSH syntax: git@github.com:owner/repo.git
  if (url.startsWith('git@github.com:')) {
    url = url.replace('git@github.com:', 'https://github.com/');
  } else if (url.startsWith('git@gitlab.com:')) {
    url = url.replace('git@gitlab.com:', 'https://gitlab.com/');
  } else if (url.startsWith('git@bitbucket.org:')) {
    url = url.replace('git@bitbucket.org:', 'https://bitbucket.org/');
  }

  // Remove trailing .git and trailing slashes
  const cleanUrl = url.replace(/\.git$/i, '').replace(/\/+$/, '');

  // GitHub: https://github.com/owner/repo or /tree/branch
  const githubMatch = cleanUrl.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/i);
  if (githubMatch) {
    return {
      provider: 'github',
      owner: githubMatch[1],
      repo: githubMatch[2],
      branch: githubMatch[3] || null,
      cleanUrl
    };
  }

  // GitLab: https://gitlab.com/owner/repo or /-/tree/branch
  const gitlabMatch = cleanUrl.match(/^https?:\/\/gitlab\.com\/([^/]+)\/([^/]+)(?:\/-\/tree\/([^/]+))?/i);
  if (gitlabMatch) {
    return {
      provider: 'gitlab',
      owner: gitlabMatch[1],
      repo: gitlabMatch[2],
      branch: gitlabMatch[3] || null,
      cleanUrl
    };
  }

  // Bitbucket: https://bitbucket.org/owner/repo or /src/branch
  const bitbucketMatch = cleanUrl.match(/^https?:\/\/bitbucket\.org\/([^/]+)\/([^/]+)(?:\/src\/([^/]+))?/i);
  if (bitbucketMatch) {
    return {
      provider: 'bitbucket',
      owner: bitbucketMatch[1],
      repo: bitbucketMatch[2],
      branch: bitbucketMatch[3] || null,
      cleanUrl
    };
  }

  return {
    provider: 'unknown',
    cleanUrl
  };
}

/**
 * Check if the git binary is available in the current environment
 */
async function isGitCliAvailable() {
  try {
    await execPromise('git --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively find all mainframe files in a directory with file size and modified timestamp
 */
export function scanCobolFiles(dir, baseDir = dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    // Skip hidden directories like .git, .github, node_modules
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(scanCobolFiles(fullPath, baseDir));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (MAINFRAME_EXTENSIONS.has(ext)) {
        try {
          const stat = fs.statSync(fullPath);
          const content = fs.readFileSync(fullPath, 'utf-8');
          const relPath = path.relative(baseDir, fullPath);
          results.push({
            name: entry.name,
            content,
            path: relPath,
            sizeBytes: stat.size,
            lastModified: stat.mtime ? stat.mtime.toISOString() : new Date().toISOString()
          });
        } catch (e) {
          console.warn(`Could not read file ${fullPath}:`, e.message);
        }
      }
    }
  }

  return results;
}

/**
 * Extract mainframe files from a ZIP archive buffer in memory
 */
export async function extractZipArchive(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const results = [];

  for (const [rawPath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;

    // Filter out hidden files or OS artifacts (__MACOSX, .git, .DS_Store)
    if (rawPath.includes('__MACOSX') || rawPath.split('/').some(p => p.startsWith('.'))) {
      continue;
    }

    const dotIndex = rawPath.lastIndexOf('.');
    if (dotIndex === -1) continue;
    const ext = rawPath.substring(dotIndex).toLowerCase();

    if (MAINFRAME_EXTENSIONS.has(ext)) {
      try {
        const content = await entry.async('string');
        const pathParts = rawPath.split('/');
        // Strip the top-level repo directory that GitHub/GitLab zipballs include (e.g. repo-master/...)
        const relPath = pathParts.length > 1 ? pathParts.slice(1).join('/') : rawPath;
        const name = pathParts[pathParts.length - 1];

        results.push({
          name,
          content,
          path: relPath,
          sizeBytes: entry._data?.uncompressedSize || content.length,
          lastModified: entry.date ? entry.date.toISOString() : new Date().toISOString()
        });
      } catch (err) {
        console.warn(`Could not read zip entry ${rawPath}:`, err.message);
      }
    }
  }

  return results;
}

/**
 * Attempt to download repository archive directly over HTTPS
 * (Works in serverless environments like Netlify where git CLI is not installed)
 */
export async function downloadRepoArchive(repoUrl, branch) {
  const parsed = parseGitUrl(repoUrl);
  if (!parsed || parsed.provider === 'unknown') {
    return null;
  }

  const { provider, owner, repo } = parsed;
  const targetBranch = (branch && branch.trim()) || parsed.branch;

  let candidateUrls = [];

  if (provider === 'github') {
    if (targetBranch) {
      candidateUrls = [
        `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${targetBranch}`,
        `https://codeload.github.com/${owner}/${repo}/zip/refs/tags/${targetBranch}`,
        `https://api.github.com/repos/${owner}/${repo}/zipball/${targetBranch}`
      ];
    } else {
      candidateUrls = [
        `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/main`,
        `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/master`,
        `https://api.github.com/repos/${owner}/${repo}/zipball`
      ];
    }
  } else if (provider === 'gitlab') {
    if (targetBranch) {
      candidateUrls = [
        `https://gitlab.com/${owner}/${repo}/-/archive/${targetBranch}/${repo}-${targetBranch}.zip`
      ];
    } else {
      candidateUrls = [
        `https://gitlab.com/${owner}/${repo}/-/archive/main/${repo}-main.zip`,
        `https://gitlab.com/${owner}/${repo}/-/archive/master/${repo}-master.zip`
      ];
    }
  } else if (provider === 'bitbucket') {
    if (targetBranch) {
      candidateUrls = [
        `https://bitbucket.org/${owner}/${repo}/get/${targetBranch}.zip`
      ];
    } else {
      candidateUrls = [
        `https://bitbucket.org/${owner}/${repo}/get/HEAD.zip`,
        `https://bitbucket.org/${owner}/${repo}/get/main.zip`,
        `https://bitbucket.org/${owner}/${repo}/get/master.zip`
      ];
    }
  }

  const headers = {
    'User-Agent': 'COBOL-Analyzer-Service/1.0',
    'Accept': 'application/zip, application/octet-stream, */*'
  };

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(30000)
      });

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const files = await extractZipArchive(buffer);
        return {
          success: true,
          files,
          totalFiles: files.length,
          repoUrl,
          source: 'archive-download',
          downloadUrl: url
        };
      }
    } catch (err) {
      console.warn(`Archive download failed for ${url}:`, err.message);
    }
  }

  return null;
}

/**
 * Clone a remote git repository and extract all codebase files.
 * Works both via direct HTTP archive download (serverless-friendly, no git CLI required)
 * and via `git clone` (when git CLI is available).
 */
export async function cloneAndExtract(repoUrl, branch) {
  if (!repoUrl || typeof repoUrl !== 'string') {
    throw new Error('Valid Git repository URL is required.');
  }

  // 1. First, attempt fast archive download over HTTP (ideal for Netlify/serverless)
  try {
    const archiveResult = await downloadRepoArchive(repoUrl, branch);
    if (archiveResult) {
      return archiveResult;
    }
  } catch (archiveErr) {
    console.warn('Archive download attempt error:', archiveErr.message);
  }

  // 2. If archive download failed or was unsupported, check if git CLI is available
  const hasGit = await isGitCliAvailable();
  if (!hasGit) {
    throw new Error(
      `Unable to fetch repository from "${repoUrl}". In this serverless deployment (Netlify), repository archive download could not find the branch or repository. Please verify the URL/branch, ensure the repository is public on GitHub or GitLab, or export the repository as a ZIP archive and upload it directly.`
    );
  }

  // 3. Fallback to git clone on systems with git CLI installed
  const tempDir = path.join(os.tmpdir(), `cobol_git_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    const branchFlag = branch && branch.trim() ? `-b "${branch.trim()}"` : '';
    const cmd = `git clone --depth 1 ${branchFlag} "${repoUrl.trim()}" "${tempDir}"`;

    await execPromise(cmd, { timeout: 60000 });

    const files = scanCobolFiles(tempDir);
    return {
      success: true,
      files,
      totalFiles: files.length,
      repoUrl,
      source: 'git-cli'
    };
  } catch (cloneErr) {
    throw new Error(`Git clone failed: ${cloneErr.message || 'Unknown error'}`);
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (err) {
      console.warn('Cleanup error:', err.message);
    }
  }
}

/**
 * Scan an existing local git repository on the host machine
 */
export async function readLocalGitRepo(repoPath) {
  if (!repoPath || typeof repoPath !== 'string') {
    throw new Error('Valid local repository path is required.');
  }

  const resolvedPath = path.resolve(repoPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Path does not exist: "${resolvedPath}". Note: Scanning a local path is only supported when running the app locally on your machine. In cloud deployments (e.g. Netlify), please use the "Upload Entire Folder" or "Upload ZIP Archive" tab.`
    );
  }

  const stat = fs.statSync(resolvedPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedPath}`);
  }

  const isGit = fs.existsSync(path.join(resolvedPath, '.git'));
  const files = scanCobolFiles(resolvedPath);

  return {
    success: true,
    isGit,
    files,
    totalFiles: files.length,
    repoPath: resolvedPath
  };
}
