import { _decorator, Component, Node, Graphics, Color, Vec3, Label, input, Input, EventKeyboard, KeyCode } from 'cc';
import { Grid } from './Grid';
import { Tetromino, TetrominoType } from './Tetromino';
import { InputHandler, GameAction } from './InputHandler';
import { ScoreManager } from './ScoreManager';

const { ccclass, property } = _decorator;

export enum GameState {
    MENU = 'menu',
    PLAYING = 'playing',
    PAUSED = 'paused',
    GAME_OVER = 'gameOver'
}

@ccclass('GameMain')
export class GameMain extends Component {
    @property(Node)
    public gameBoardNode: Node | null = null;
    
    @property(Node)
    public nextPieceNode: Node | null = null;
    
    @property(Label)
    public scoreLabel: Label | null = null;
    
    @property(Label)
    public levelLabel: Label | null = null;
    
    @property(Label)
    public linesLabel: Label | null = null;
    
    @property(Label)
    public comboLabel: Label | null = null;
    
    @property(Label)
    public gameOverLabel: Label | null = null;
    
    @property(Label)
    public pauseLabel: Label | null = null;
    
    @property(Label)
    public menuLabel: Label | null = null;

    // Game constants
    public static readonly CELL_SIZE: number = 28;
    public static readonly BOARD_OFFSET_X: number = -200;
    public static readonly BOARD_OFFSET_Y: number = -280;

    // Game components
    private _grid: Grid = new Grid();
    private _inputHandler: InputHandler | null = null;
    private _scoreManager: ScoreManager = new ScoreManager();
    
    // Game state
    private _state: GameState = GameState.MENU;
    private _currentPiece: Tetromino | null = null;
    private _nextPieceType: TetrominoType = TetrominoType.I;
    private _fallTimer: number = 0;

    // Graphics
    private _boardGraphics: Graphics | null = null;
    private _nextPieceGraphics: Graphics | null = null;

    onLoad(): void {
        this.setupGraphics();
        this.setupInput();
        this.setupScoreCallbacks();
        this.showMenu();
    }

    onDestroy(): void {
        if (this._inputHandler) {
            this._inputHandler.destroy();
        }
    }

    update(deltaTime: number): void {
        if (this._inputHandler) {
            this._inputHandler.update(deltaTime);
        }

        switch (this._state) {
            case GameState.PLAYING:
                this.updateGameplay(deltaTime);
                this.render();
                break;
            case GameState.PAUSED:
            case GameState.MENU:
                // Render once to show static content
                break;
        }
    }

    private setupGraphics(): void {
        if (this.gameBoardNode) {
            this._boardGraphics = this.gameBoardNode.getComponent(Graphics);
            if (!this._boardGraphics) {
                this._boardGraphics = this.gameBoardNode.addComponent(Graphics);
            }
        }

        if (this.nextPieceNode) {
            this._nextPieceGraphics = this.nextPieceNode.getComponent(Graphics);
            if (!this._nextPieceGraphics) {
                this._nextPieceGraphics = this.nextPieceNode.addComponent(Graphics);
            }
        }
    }

    private setupInput(): void {
        this._inputHandler = new InputHandler();
        
        this._inputHandler.registerCallback(GameAction.MOVE_LEFT, () => this.movePiece(-1, 0));
        this._inputHandler.registerCallback(GameAction.MOVE_RIGHT, () => this.movePiece(1, 0));
        this._inputHandler.registerCallback(GameAction.MOVE_DOWN, () => this.movePiece(0, -1));
        this._inputHandler.registerCallback(GameAction.ROTATE_CLOCKWISE, () => this.rotatePiece(true));
        this._inputHandler.registerCallback(GameAction.ROTATE_COUNTER_CLOCKWISE, () => this.rotatePiece(false));
        this._inputHandler.registerCallback(GameAction.HARD_DROP, () => this.hardDrop());
        this._inputHandler.registerCallback(GameAction.PAUSE, () => this.togglePause());
        this._inputHandler.registerCallback(GameAction.RESTART, () => this.restartGame());
    }

    private setupScoreCallbacks(): void {
        this._scoreManager.setOnScoreChanged((score) => {
            if (this.scoreLabel) {
                this.scoreLabel.string = `Score: ${score}`;
            }
        });
        
        this._scoreManager.setOnLevelChanged((level) => {
            if (this.levelLabel) {
                this.levelLabel.string = `Level: ${level}`;
            }
        });
        
        this._scoreManager.setOnLinesChanged((lines) => {
            if (this.linesLabel) {
                this.linesLabel.string = `Lines: ${lines}`;
            }
        });
        
        this._scoreManager.setOnComboChanged((combo) => {
            if (this.comboLabel) {
                this.comboLabel.string = combo > 0 ? `Combo: x${combo}` : '';
            }
        });
    }

    private showMenu(): void {
        this._state = GameState.MENU;
        this.updateUIVisibility();
        this.render(); // Render empty grid
        
        // Listen for any key to start
        const startCallback = (event: EventKeyboard) => {
            input.off(Input.EventType.KEY_DOWN, startCallback, this);
            this.startGame();
        };
        input.on(Input.EventType.KEY_DOWN, startCallback, this);
    }

    private startGame(): void {
        this._state = GameState.PLAYING;
        this._grid.clear();
        this._scoreManager.reset();
        this._nextPieceType = Tetromino.getRandomType();
        this.spawnPiece();
        this.updateUIVisibility();
        this.render();
    }

    private restartGame(): void {
        if (this._state === GameState.GAME_OVER || this._state === GameState.PAUSED) {
            this.startGame();
        }
    }

    private togglePause(): void {
        if (this._state === GameState.PLAYING) {
            this._state = GameState.PAUSED;
        } else if (this._state === GameState.PAUSED) {
            this._state = GameState.PLAYING;
        }
        this.updateUIVisibility();
    }

    private updateUIVisibility(): void {
        if (this.menuLabel) {
            this.menuLabel.node.active = (this._state === GameState.MENU);
            // Ensure menu label is on top
            if (this._state === GameState.MENU) {
                this.menuLabel.node.setSiblingIndex(100);
            }
        }
        if (this.pauseLabel) this.pauseLabel.node.active = (this._state === GameState.PAUSED);
        if (this.gameOverLabel) this.gameOverLabel.node.active = (this._state === GameState.GAME_OVER);
        
        // Hide score labels in menu
        const showGameUI = this._state !== GameState.MENU;
        if (this.scoreLabel) this.scoreLabel.node.active = showGameUI;
        if (this.levelLabel) this.levelLabel.node.active = showGameUI;
        if (this.linesLabel) this.linesLabel.node.active = showGameUI;
        if (this.comboLabel) this.comboLabel.node.active = showGameUI;
        if (this.nextPieceNode) this.nextPieceNode.active = showGameUI;
    }

    private spawnPiece(): void {
        this._currentPiece = new Tetromino(this._nextPieceType);
        this._nextPieceType = Tetromino.getRandomType();
        
        this._currentPiece.x = Math.floor(Grid.WIDTH / 2) - 2;
        this._currentPiece.y = Grid.HEIGHT - 4;
        
        if (!this._grid.canPlacePiece(this._currentPiece)) {
            this.gameOver();
            return;
        }
        
        this._fallTimer = 0;
        this.renderNextPiece();
    }

    private updateGameplay(deltaTime: number): void {
        if (!this._currentPiece) return;

        this._fallTimer += deltaTime;
        const fallSpeed = this._scoreManager.getFallSpeed();
        
        if (this._fallTimer >= fallSpeed) {
            this._fallTimer = 0;
            this.movePiece(0, -1);
        }
    }

    private movePiece(dx: number, dy: number): void {
        if (!this._currentPiece || this._state !== GameState.PLAYING) return;

        if (this._grid.canPlacePieceAt(this._currentPiece, dx, dy)) {
            this._currentPiece.x += dx;
            this._currentPiece.y += dy;
            
            if (dy < 0) {
                this._scoreManager.addSoftDropScore();
            }
            
            this.render();
        } else if (dy < 0) {
            this.lockPiece();
        }
    }

    private rotatePiece(clockwise: boolean): void {
        if (!this._currentPiece || this._state !== GameState.PLAYING) return;

        if (this._grid.canRotatePiece(this._currentPiece, clockwise)) {
            this._currentPiece.rotate(clockwise);
            this.render();
        } else {
            this.tryWallKick(clockwise);
        }
    }

    private tryWallKick(clockwise: boolean): void {
        if (!this._currentPiece) return;

        const kicks = [-1, 1, -2, 2];
        
        for (const kick of kicks) {
            this._currentPiece.x += kick;
            if (this._grid.canRotatePiece(this._currentPiece, clockwise)) {
                this._currentPiece.rotate(clockwise);
                this.render();
                return;
            }
            this._currentPiece.x -= kick;
        }
    }

    private hardDrop(): void {
        if (!this._currentPiece || this._state !== GameState.PLAYING) return;

        let dropDistance = 0;
        while (this._grid.canPlacePieceAt(this._currentPiece, 0, -dropDistance - 1)) {
            dropDistance++;
        }
        
        if (dropDistance > 0) {
            this._currentPiece.y -= dropDistance;
            this._scoreManager.addHardDropScore(dropDistance);
            this.lockPiece();
            this.render();
        }
    }

    private lockPiece(): void {
        if (!this._currentPiece) return;

        this._grid.lockPiece(this._currentPiece);
        
        const result = this._grid.clearLines();
        if (result.linesCleared > 0) {
            this._scoreManager.addLineClearScore(result.linesCleared);
        }
        
        if (this._grid.isGameOver()) {
            this.gameOver();
            return;
        }
        
        this.spawnPiece();
    }

    private gameOver(): void {
        this._state = GameState.GAME_OVER;
        ScoreManager.saveHighScore(this._scoreManager.score);
        this.updateUIVisibility();
        
        if (this.gameOverLabel) {
            const highScore = ScoreManager.getHighScore();
            this.gameOverLabel.string = `Game Over!\nScore: ${this._scoreManager.score}\nHigh Score: ${highScore}\nPress R to Restart`;
        }
    }

    private render(): void {
        this.renderBoard();
        if (this._state !== GameState.MENU) {
            this.renderNextPiece();
        }
    }

    private renderBoard(): void {
        if (!this._boardGraphics) return;

        const g = this._boardGraphics;
        g.clear();

        // Draw grid background - lighter color for better contrast
        g.fillColor = new Color(240, 240, 240, 255); // Light gray/white background
        g.rect(
            GameMain.BOARD_OFFSET_X,
            GameMain.BOARD_OFFSET_Y,
            Grid.WIDTH * GameMain.CELL_SIZE,
            Grid.HEIGHT * GameMain.CELL_SIZE
        );
        g.fill();

        // Draw grid lines - darker for visibility
        g.strokeColor = new Color(150, 150, 150, 255);
        g.lineWidth = 1;
        
        for (let x = 0; x <= Grid.WIDTH; x++) {
            const px = GameMain.BOARD_OFFSET_X + x * GameMain.CELL_SIZE;
            g.moveTo(px, GameMain.BOARD_OFFSET_Y);
            g.lineTo(px, GameMain.BOARD_OFFSET_Y + Grid.HEIGHT * GameMain.CELL_SIZE);
        }
        
        for (let y = 0; y <= Grid.HEIGHT; y++) {
            const py = GameMain.BOARD_OFFSET_Y + y * GameMain.CELL_SIZE;
            g.moveTo(GameMain.BOARD_OFFSET_X, py);
            g.lineTo(GameMain.BOARD_OFFSET_X + Grid.WIDTH * GameMain.CELL_SIZE, py);
        }
        g.stroke();
        
        // Draw border around the game board
        g.strokeColor = new Color(80, 80, 80, 255);
        g.lineWidth = 3;
        g.rect(
            GameMain.BOARD_OFFSET_X,
            GameMain.BOARD_OFFSET_Y,
            Grid.WIDTH * GameMain.CELL_SIZE,
            Grid.HEIGHT * GameMain.CELL_SIZE
        );
        g.stroke();

        // Only draw game pieces when playing or paused (not in menu)
        if (this._state !== GameState.MENU) {
            // Draw locked pieces
            const filledCells = this._grid.getFilledCells();
            for (const cell of filledCells) {
                this.drawCell(g, cell.x, cell.y, cell.color);
            }

            // Draw ghost piece
            if (this._currentPiece && this._state === GameState.PLAYING) {
                const ghostY = this._grid.getGhostPiecePosition(this._currentPiece);
                const ghostPositions = this._currentPiece.getBlockPositions();
                const ghostColor = this._currentPiece.color.clone();
                ghostColor.a = 60;
                
                for (const pos of ghostPositions) {
                    this.drawCell(g, pos.x, ghostY + (pos.y - this._currentPiece.y), ghostColor);
                }
            }

            // Draw current piece
            if (this._currentPiece && this._state === GameState.PLAYING) {
                const positions = this._currentPiece.getBlockPositions();
                for (const pos of positions) {
                    this.drawCell(g, pos.x, pos.y, this._currentPiece.color);
                }
            }
        }
    }

    private renderNextPiece(): void {
        if (!this._nextPieceGraphics) return;

        const g = this._nextPieceGraphics;
        g.clear();

        // Draw background
        g.fillColor = new Color(30, 30, 30, 255);
        g.rect(-60, -60, 120, 120);
        g.fill();

        // Draw next piece preview
        const nextPiece = new Tetromino(this._nextPieceType);
        const shape = nextPiece.getCurrentShape();
        const color = nextPiece.color;
        
        const offsetX = -shape[0].length * GameMain.CELL_SIZE / 2;
        const offsetY = -shape.length * GameMain.CELL_SIZE / 2;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] === 1) {
                    const px = offsetX + col * GameMain.CELL_SIZE;
                    const py = offsetY + (shape.length - 1 - row) * GameMain.CELL_SIZE;
                    
                    g.fillColor = color;
                    g.rect(px, py, GameMain.CELL_SIZE - 2, GameMain.CELL_SIZE - 2);
                    g.fill();
                    
                    g.strokeColor = new Color(255, 255, 255, 100);
                    g.lineWidth = 1;
                    g.rect(px, py, GameMain.CELL_SIZE - 2, GameMain.CELL_SIZE - 2);
                    g.stroke();
                }
            }
        }
    }

    private drawCell(g: Graphics, gridX: number, gridY: number, color: Color): void {
        const px = GameMain.BOARD_OFFSET_X + gridX * GameMain.CELL_SIZE + 1;
        const py = GameMain.BOARD_OFFSET_Y + gridY * GameMain.CELL_SIZE + 1;
        const size = GameMain.CELL_SIZE - 2;
        
        // Fill the cell
        g.fillColor = color;
        g.rect(px, py, size, size);
        g.fill();
        
        // Draw dark border for 3D effect
        g.strokeColor = new Color(0, 0, 0, 100);
        g.lineWidth = 1;
        g.rect(px, py, size, size);
        g.stroke();
        
        // Draw inner highlight (top-left)
        g.strokeColor = new Color(255, 255, 255, 120);
        g.lineWidth = 1;
        g.moveTo(px, py + size);
        g.lineTo(px, py);
        g.lineTo(px + size, py);
        g.stroke();
        
        // Draw inner shadow (bottom-right)
        g.strokeColor = new Color(0, 0, 0, 80);
        g.moveTo(px + size, py);
        g.lineTo(px + size, py + size);
        g.lineTo(px, py + size);
        g.stroke();
    }
}
