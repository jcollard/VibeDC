# VibeDC - Multiplayer Web Game Prototype

A multiplayer web-based game prototype with server-authoritative movement, built with React, TypeScript, and Firebase.

## Features

- **Server-Authoritative Movement**: All player movements are validated server-side via Cloud Functions
- **Real-time Multiplayer**: Multiple players can join and see each other move in real-time
- **Grid-based Movement**: Players move on a 2D grid with walls and obstacles
- **Tactical Combat System**: Turn-based combat with unit positioning and abilities
- **Area Map System**: Grid-based dungeon navigation with tilesets and interactive objects ([GDD Documentation](GDD/FirstPersonView/AreaMap/))
- **Developer Tools**: Visual editors for creating tilesets and area maps
- **Local Testing**: Full Firebase emulator support for local development

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Firebase (Firestore + Cloud Functions)
- **Movement Validation**: Cloud Functions with server-side authority
- **Local Dev**: Firebase Emulators

## Project Structure

```
VibeDC/
├── react-app/           # React frontend application
│   ├── src/
│   │   ├── components/  # React components (Game, GameBoard)
│   │   ├── utils/       # Utilities (map parser)
│   │   ├── firebase.ts  # Firebase configuration
│   │   └── types.ts     # TypeScript types
│   └── public/
│       └── test.map     # Map file (# = walls, . = floors)
├── functions/           # Firebase Cloud Functions
│   └── src/
│       └── index.ts     # Movement validation function
├── firebase.json        # Firebase configuration
├── firestore.rules      # Firestore security rules
└── test.map            # Original map file
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Firebase CLI (installed globally)

### Installation

1. **Install Firebase CLI** (if not already installed):
```bash
npm install -g firebase-tools
```

2. **Install frontend dependencies**:
```bash
cd react-app
npm install
```

3. **Install Cloud Functions dependencies**:
```bash
cd ../functions
npm install
```

4. **Build Cloud Functions**:
```bash
npm run build
```

### Running Locally

You need to run **two processes** simultaneously:

#### Terminal 1: Start Firebase Emulators

From the project root:

```bash
firebase emulators:start
```

This will start:
- Firestore Emulator on port 8080
- Cloud Functions Emulator on port 5001
- Auth Emulator on port 9099
- Emulator UI on port 4000

#### Terminal 2: Start React Dev Server

```bash
cd react-app
npm run dev
```

The React app will be available at `http://localhost:5173`

### Testing Multiplayer

1. Open `http://localhost:5173` in your browser
2. Open another browser window (or incognito tab) to the same URL
3. You should see both players on the map
4. Use arrow keys or WASD to move your player
5. Watch the other player move in real-time

### Viewing Emulator UI

Open `http://localhost:4000` to see:
- Firestore data in real-time
- Function execution logs
- Authentication users

## How It Works

### Movement Flow

1. **Player presses arrow key** → Client captures input
2. **Client calls Cloud Function** → `makeMove({ gameId, direction })`
3. **Cloud Function validates**:
   - Is the player authenticated?
   - Is the move within grid bounds?
   - Is the destination tile walkable (not a wall)?
   - Is the tile occupied by another player?
4. **If valid** → Update Firestore with new position
5. **Firestore broadcasts** → All clients receive real-time update
6. **UI updates** → Players see movement on screen

### Server Authority

The Firestore security rules prevent direct client writes:

```javascript
allow update: if false; // Clients cannot update game state directly
```

All movement must go through the Cloud Function, which validates:
- Grid boundaries
- Walkable tiles (walls vs floors)
- Collision detection
- Player ownership

This prevents cheating - players cannot teleport or move through walls by modifying client code.

## Map Format

Maps use a simple text format (see [test.map](test.map)):

```
###################################
#.................................#
#.................................#
#.....#####.......................#
#.........#.......................#
###################################
```

- `#` = Wall (impassable)
- `.` = Floor (passable)

## Controls

- **Arrow Keys** or **WASD** to move
- Movement is validated server-side
- Invalid moves display an error message

## Development

### Modifying the Map

1. Edit [test.map](test.map) or [react-app/public/test.map](react-app/public/test.map)
2. Refresh the browser
3. You may need to clear Firestore data in the emulator

### Adding Features

**Frontend** ([react-app/src](react-app/src)):
- Modify [Game.tsx](react-app/src/components/Game.tsx) for game logic
- Modify [GameBoard.tsx](react-app/src/components/GameBoard.tsx) for rendering

**Backend** ([functions/src](functions/src)):
- Modify [index.ts](functions/src/index.ts) for Cloud Functions
- Run `npm run build` in the functions directory after changes

### Debugging

**View Cloud Function Logs**:
- Check Terminal 1 (Firebase Emulators) for function execution logs
- Or view in Emulator UI at `http://localhost:4000`

**View Firestore Data**:
- Open Emulator UI at `http://localhost:4000`
- Navigate to Firestore tab
- See real-time game state

## Next Steps

Potential features to add:

- [ ] Turn-based combat system
- [ ] Proximity-based text chat
- [ ] Player grouping/party system
- [ ] Multiple maps/rooms
- [ ] 3D viewport rendering (Three.js)
- [ ] Player stats and inventory
- [ ] Persistent user accounts

## Deploying to Production

### 1. Create Firebase Project

```bash
firebase login
firebase projects:create vibedc-game
firebase use vibedc-game
```

### 2. Deploy Backend

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions
cd functions
npm run build
firebase deploy --only functions
```

### 3. Update Frontend Config

Edit [react-app/src/firebase.ts](react-app/src/firebase.ts) with your Firebase project config.

### 4. Build and Deploy Frontend

```bash
cd react-app
npm run build
```

Upload the `dist` folder to:
- **itch.io** (as HTML5 game)
- **Firebase Hosting** (`firebase deploy --only hosting`)
- **Netlify** or **Vercel**

## Troubleshooting

**"Out of bounds" or "Cannot walk through walls" errors**:
- Check the Cloud Function logs in Terminal 1
- Verify the map format is correct
- Ensure the player starting position is on a `.` (floor) tile

**Players not seeing each other**:
- Ensure both browser tabs are connected to the same emulator
- Check Firestore data in Emulator UI (`http://localhost:4000`)

**Cloud Function errors**:
- Make sure you ran `npm run build` in the functions directory
- Check Terminal 1 for detailed error messages

**React app not connecting to emulators**:
- Verify emulators are running on the correct ports
- Check [firebase.ts](react-app/src/firebase.ts) emulator configuration

## License

MIT

## Credits

Created for a game jam prototype using Firebase and React.