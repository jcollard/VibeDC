# Font Atlas Generator - Standalone Tool

The Font Atlas Generator can be used both as part of the game and as a standalone tool.

## 🎮 Using in Game (Developer Panel)

1. Run the game in development mode
2. Press **F2** to open Developer Panel
3. Click **"Font Registry"**
4. Click **"Generate Font"**

## 🛠️ Using as Standalone Tool

### Development

Run the standalone tool in development mode:

```bash
npm run dev
```

Then open your browser to:
- **Game:** http://localhost:5173/
- **Font Tool:** http://localhost:5173/font-tool.html

### Production Build

Build both the game and the font tool:

```bash
npm run build
```

This creates:
- `dist/index.html` - The game
- `dist/font-tool.html` - The standalone Font Atlas Generator

### Building Font Tool for Deployment (Recommended)

Build and extract just the font tool into a deployment-ready directory:

```bash
npm run build:font-tool
```

This creates:
- `dist-font-tool/` - Ready-to-deploy directory
  - `index.html` - Font tool entry point
  - `assets/` - Only the necessary JS/CSS files (~211KB total)
  - `README.md` - Deployment instructions
  - `.nojekyll` - GitHub Pages configuration

**Benefits:**
- ✅ Clean, standalone directory
- ✅ Only includes font tool assets (not game code)
- ✅ Renamed to `index.html` for easier deployment
- ✅ Includes deployment instructions
- ✅ Ready for drag-and-drop deployment

### Deploying the Font Tool

After running `npm run build:font-tool`:

**GitHub Pages:**
```bash
cd dist-font-tool
git init
git add .
git commit -m "Deploy Font Atlas Generator"
git push -f origin HEAD:gh-pages
```

**Netlify:**
```bash
npx netlify deploy --prod --dir=dist-font-tool
```
Or drag & drop `dist-font-tool` folder to https://app.netlify.com/drop

**Vercel:**
```bash
npx vercel --prod dist-font-tool
```

**Any Static Host:**
Upload the contents of `dist-font-tool/` via FTP/SFTP

### Example Deployment Configurations

**GitHub Pages:**
```yaml
# .github/workflows/deploy-font-tool.yml
name: Deploy Font Tool
on:
  push:
    branches: [main]
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd react-app && npm install && npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./react-app/dist
```

**Netlify:**
```toml
# netlify.toml
[build]
  base = "react-app"
  command = "npm run build"
  publish = "dist"
```

## 🔧 How It Works

The project uses **Vite's multi-page build** feature:

- **Shared Code:** Both entry points use the same `FontAtlasGenerator` component
- **Separate Builds:** Vite creates optimized bundles for each entry point
- **No Duplication:** Code is in one place, maintained once
- **Tree Shaking:** Each build only includes what it needs

### File Structure

```
react-app/
├── src/
│   ├── main.tsx                           # Game entry point
│   ├── font-tool.tsx                      # Font tool entry point (NEW)
│   └── components/
│       └── developer/
│           ├── FontAtlasGenerator.tsx     # Shared component
│           └── FontRegistryPanel.tsx
├── index.html                             # Game HTML
├── font-tool.html                         # Font tool HTML (NEW)
└── vite.config.ts                         # Multi-page configuration
```

## 📦 Build Output

After `npm run build`:

```
dist/
├── index.html              # Game
├── font-tool.html          # Font Tool
└── assets/
    ├── main-*.js           # Game bundle
    ├── font-tool-*.js      # Font Tool bundle (much smaller!)
    ├── index-*.js          # Shared dependencies
    └── *.css               # Styles
```

The font tool bundle is **much smaller** (~16KB vs 1.1MB) because it doesn't include game logic, Three.js, etc.

## 🚀 Sharing the Tool

Once deployed, you can share the tool:

- **Direct URL:** `https://your-domain.com/font-tool.html`
- **Custom Domain:** `https://fonts.your-game.com`
- **Subdirectory:** `https://your-game.com/tools/font-atlas/`

## 🎨 Features

The standalone tool includes all generator features:
- ✅ Upload TTF/OTF fonts
- ✅ Configure character dimensions
- ✅ Variable width auto-detection
- ✅ Pixel-perfect antialiasing removal
- ✅ Live preview with demo text
- ✅ Export PNG atlas + YAML definition
- ✅ Full-screen workspace

Perfect for sharing with artists, contractors, or the community!
