/**
 * Deployment script for itch.io
 * Copies built files to the sor-deploy git repository and commits/pushes
 */

import { execSync } from 'child_process';
import { copyFileSync, readdirSync, statSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const DIST_DIR = resolve(__dirname, '../dist');
const DEPLOY_DIR = resolve(process.env.HOME || process.env.USERPROFILE, 'git/sor-deploy');

console.log('[Deploy] Starting deployment to itch.io...');
console.log(`[Deploy] Source: ${DIST_DIR}`);
console.log(`[Deploy] Target: ${DEPLOY_DIR}`);

// Check if deploy directory exists
if (!existsSync(DEPLOY_DIR)) {
  console.error(`[Deploy] Error: Deploy directory does not exist: ${DEPLOY_DIR}`);
  console.error('[Deploy] Please create the git repository at ~/git/sor-deploy first');
  process.exit(1);
}

// Check if deploy directory is a git repository
try {
  execSync('git rev-parse --git-dir', { cwd: DEPLOY_DIR, stdio: 'ignore' });
} catch (error) {
  console.error(`[Deploy] Error: ${DEPLOY_DIR} is not a git repository`);
  console.error('[Deploy] Please initialize it with: git init');
  process.exit(1);
}

/**
 * Recursively copy directory contents
 */
function copyDirectory(src, dest) {
  // Create destination directory if it doesn't exist
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src);

  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
      console.log(`[Deploy] Copied: ${entry}`);
    }
  }
}

try {
  // Clean deploy directory (except .git folder)
  console.log('[Deploy] Cleaning deploy directory...');
  const entries = readdirSync(DEPLOY_DIR);
  for (const entry of entries) {
    if (entry !== '.git') {
      const fullPath = join(DEPLOY_DIR, entry);
      rmSync(fullPath, { recursive: true, force: true });
      console.log(`[Deploy] Removed: ${entry}`);
    }
  }

  // Copy all files from dist to deploy directory
  console.log('[Deploy] Copying files...');
  copyDirectory(DIST_DIR, DEPLOY_DIR);

  // Git operations
  console.log('[Deploy] Staging changes...');
  execSync('git add -A', { cwd: DEPLOY_DIR, stdio: 'inherit' });

  // Check if there are changes to commit
  let hasChanges = false;
  try {
    execSync('git diff-index --quiet HEAD --', { cwd: DEPLOY_DIR, stdio: 'ignore' });
  } catch (error) {
    hasChanges = true;
  }

  if (hasChanges) {
    console.log('[Deploy] Committing changes...');
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    execSync(`git commit -m "Deploy build - ${timestamp}"`, { cwd: DEPLOY_DIR, stdio: 'inherit' });

    console.log('[Deploy] Pushing to remote...');
    execSync('git push', { cwd: DEPLOY_DIR, stdio: 'inherit' });

    console.log('[Deploy] ✓ Deployment successful!');
  } else {
    console.log('[Deploy] No changes to deploy');
  }

  console.log('[Deploy] Done!');
} catch (error) {
  console.error('[Deploy] Error during deployment:', error.message);
  process.exit(1);
}
