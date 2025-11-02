# Deployment Scripts

## deploy-to-itch.js

Automated deployment script for itch.io builds.

### Prerequisites

1. Create the deployment repository:
   ```bash
   mkdir -p ~/git/sor-deploy
   cd ~/git/sor-deploy
   git init
   git remote add origin <your-repo-url>
   ```

2. Make sure you're in the react-app directory

### Usage

```bash
npm run deploy
```

This command will:
1. Build the project (`npm run build`)
2. Copy all files from `dist/` to `~/git/sor-deploy`
3. Commit the changes with timestamp
4. Push to the remote repository

### What Gets Deployed

All files from the `dist` directory:
- `index.html` - Main game entry point
- `font-tool.html` - Font atlas generator tool
- `assets/` - Compiled JavaScript and CSS bundles
- `data/` - Game data files (YAML configurations)
- `fonts/` - Font atlas images
- `spritesheets/` - Sprite atlases
- `tiles/` - Tile images
- `vite.svg` - Favicon

### Configuration

The deployment directory is configured to:
- Use relative paths (via `base: './'` in vite.config.ts)
- Use HashRouter for client-side routing (production builds only)
- Work with itch.io's subdirectory hosting

### Notes

- The script will clean the deployment directory (except `.git/`) before copying
- Only commits if there are actual changes
- Uses timestamps for commit messages
- Automatically pushes to the remote after committing
