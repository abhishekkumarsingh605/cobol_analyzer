import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// Mainframe codebase extensions
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
 * Clone a remote git repository and extract all codebase files
 */
export async function cloneAndExtract(repoUrl, branch) {
  if (!repoUrl || typeof repoUrl !== 'string') {
    throw new Error('Valid Git repository URL is required.');
  }

  // Create temporary directory
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
      repoUrl
    };
  } finally {
    // Cleanup temporary directory
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
    throw new Error(`Path does not exist: ${resolvedPath}`);
  }

  const stat = fs.statSync(resolvedPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedPath}`);
  }

  // Verify it's a git repo or directory
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
