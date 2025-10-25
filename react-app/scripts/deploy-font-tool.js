import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist-font-tool');
const repoUrl = 'https://github.com/CaptainCoderOrg/font-atlas-generator.git';

console.log('🚀 Deploying Font Atlas Generator to GitHub Pages...\n');

// Check if dist-font-tool exists
if (!existsSync(distDir)) {
  console.error('❌ Error: dist-font-tool directory not found!');
  console.error('   Run "npm run build:font-tool" first.\n');
  process.exit(1);
}

try {
  // Navigate to dist directory
  process.chdir(distDir);
  console.log('📁 Working directory:', distDir);

  // Initialize git if needed
  if (!existsSync('.git')) {
    console.log('📦 Initializing git repository...');
    execSync('git init', { stdio: 'inherit' });
    execSync(`git remote add origin ${repoUrl}`, { stdio: 'inherit' });
  }

  // Configure git for GitHub Pages
  console.log('⚙️  Configuring git...');
  execSync('git checkout -B gh-pages', { stdio: 'inherit' });

  // Add all files
  console.log('📝 Staging files...');
  execSync('git add -A', { stdio: 'inherit' });

  // Create commit with timestamp
  const timestamp = new Date().toISOString();
  const commitMessage = `Deploy Font Atlas Generator - ${timestamp}`;
  console.log(`💾 Creating commit: "${commitMessage}"`);
  execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });

  // Push to gh-pages branch
  console.log('🌐 Pushing to GitHub Pages...');
  execSync('git push -f origin gh-pages', { stdio: 'inherit' });

  console.log('\n✅ Deployment successful!');
  console.log('🔗 Your site will be available at:');
  console.log('   https://captaincoderorg.github.io/font-atlas-generator/\n');
  console.log('📌 Note: It may take a few minutes for GitHub Pages to update.\n');

} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);
  process.exit(1);
}
