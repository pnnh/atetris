# Atetris - Cocos Creator Tetris Game

A complete Tetris game implementation using Cocos Creator 3.8.7 and TypeScript.

![Game Preview](preview.png)

## Features

### Core Gameplay
- **7 Classic Tetrominoes**: I, O, T, S, Z, J, L pieces with standard rotation
- **Ghost Piece**: Preview where the piece will land
- **Next Piece Preview**: See the upcoming piece
- **Line Clearing**: Complete lines to score points
- **Level Progression**: Speed increases every 10 lines
- **Combo System**: Chain line clears for bonus points

### Controls
| Key | Action |
|-----|--------|
| ← → | Move piece left/right |
| ↓ | Soft drop (faster fall) |
| ↑ / X | Rotate clockwise |
| Z | Rotate counter-clockwise |
| Space | Hard drop (instant drop) |
| P / Esc | Pause game |
| R | Restart (from Game Over) |

### Game States
- **Menu**: Title screen with control instructions
- **Playing**: Active gameplay
- **Paused**: Game paused with resume option
- **Game Over**: Final score and high score display

## Project Structure

```
assets/
├── scripts/
│   ├── Tetromino.ts      # Piece definitions and rotation logic
│   ├── Grid.ts           # Game board and collision detection
│   ├── InputHandler.ts   # Keyboard input handling
│   ├── ScoreManager.ts   # Scoring and level system
│   ├── GameMain.ts       # Main game logic
│   └── GameBootstrap.ts  # Scene initialization
└── scenes/
    └── (empty - scene created programmatically)
```

## Setup Instructions

### Prerequisites
- Cocos Creator 3.8.7 or later
- Node.js (for TypeScript compilation)

### Running the Game

1. **Open in Cocos Creator**:
   - Launch Cocos Creator
   - Open the project folder

2. **Create the Scene**:
   - In Assets panel, right-click `assets/scenes`
   - Select **Create → Scene**
   - Name it `GameScene`

3. **Setup the Scene**:
   - Delete the default `Main Camera` and `Canvas` nodes
   - Create an empty node named `GameRoot`
   - Attach the `GameBootstrap.ts` script to `GameRoot`

4. **Run**:
   - Click the Preview button (▶) in the editor
   - Or press `Ctrl/Cmd + P`

## Scoring System

| Action | Points |
|--------|--------|
| Soft Drop | 1 per cell |
| Hard Drop | 2 per cell |
| Single Line | 40 × level |
| Double Line | 100 × level |
| Triple Line | 300 × level |
| Tetris (4 lines) | 1200 × level |
| Combo Bonus | 50 × combo × lines |

## Technical Details

### Game Board
- **Size**: 10 columns × 20 rows
- **Cell Size**: 28 pixels
- **Colors**: Light background with dark pieces for contrast

### Fall Speed by Level
| Level | Speed (seconds/row) |
|-------|---------------------|
| 1 | 1.0 |
| 5 | 0.3 |
| 10 | 0.1 |
| 15+ | 0.05 |

### Architecture
- **Component-based**: Uses Cocos Creator component system
- **Pure Code Rendering**: Graphics API for game board (no sprites needed)
- **Event-driven Input**: Keyboard handling with repeat support
- **Persistent High Score**: Saved to localStorage

## Browser Preview

The game can also run in a web browser:

```bash
# Build for web
npm run build:web

# Or use Cocos Creator's built-in preview
```

## License

MIT License - Feel free to use and modify!

## Credits

Built with [Cocos Creator](https://www.cocos.com/en/creator)
