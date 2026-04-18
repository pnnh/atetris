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

    // Game constants - 相对于 GameBoard 节点的本地坐标
    public static readonly CELL_SIZE: number = 32;  // 增大格子尺寸
    public static readonly BOARD_OFFSET_X: number = -160;  // 10 * 32 / 2 = 160，向左移动避免遮挡文字
    public static readonly BOARD_OFFSET_Y: number = -320;  // 20 * 32 / 2 = 320

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
        // 延迟初始化，等待 GameBootstrap 设置节点引用
        // 实际初始化在 init() 方法中
    }
    
    public init(): void {
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
                console.log('Graphics component added to GameBoard');
            } else {
                console.log('Graphics component found on GameBoard');
            }
        } else {
            console.error('GameBoard node not assigned!');
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
        // 游戏结束或暂停状态下可以重新开始
        if (this._state === GameState.GAME_OVER || this._state === GameState.PAUSED) {
            this.startGame();
        }
        // 游戏中空格键是硬降，由 hardDrop 处理
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
        // 游戏结束或暂停状态下，空格键用于重新开始
        if (this._state === GameState.GAME_OVER || this._state === GameState.PAUSED) {
            this.restartGame();
            return;
        }
        
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
        if (!this._boardGraphics) {
            console.warn('Board graphics not initialized');
            return;
        }

        const g = this._boardGraphics;
        g.clear();

        const boardWidth = Grid.WIDTH * GameMain.CELL_SIZE;
        const boardHeight = Grid.HEIGHT * GameMain.CELL_SIZE;
        const left = GameMain.BOARD_OFFSET_X;
        const bottom = GameMain.BOARD_OFFSET_Y;

        // Draw grid background
        g.fillColor = new Color(245, 245, 245, 255);
        g.fillRect(left, bottom, boardWidth, boardHeight);

        // Draw grid cells
        g.fillColor = new Color(230, 230, 230, 255);
        for (let row = 0; row < Grid.HEIGHT; row++) {
            for (let col = 0; col < Grid.WIDTH; col++) {
                if ((row + col) % 2 === 0) {
                    const px = left + col * GameMain.CELL_SIZE;
                    const py = bottom + row * GameMain.CELL_SIZE;
                    g.fillRect(px, py, GameMain.CELL_SIZE, GameMain.CELL_SIZE);
                }
            }
        }

        // Draw grid lines
        g.strokeColor = new Color(180, 180, 180, 255);
        g.lineWidth = 1;
        for (let x = 0; x <= Grid.WIDTH; x++) {
            const px = left + x * GameMain.CELL_SIZE;
            g.moveTo(px, bottom);
            g.lineTo(px, bottom + boardHeight);
        }
        for (let y = 0; y <= Grid.HEIGHT; y++) {
            const py = bottom + y * GameMain.CELL_SIZE;
            g.moveTo(left, py);
            g.lineTo(left + boardWidth, py);
        }
        g.stroke();

        // Draw border
        g.strokeColor = new Color(60, 60, 60, 255);
        g.lineWidth = 3;
        g.moveTo(left, bottom);
        g.lineTo(left + boardWidth, bottom);
        g.lineTo(left + boardWidth, bottom + boardHeight);
        g.lineTo(left, bottom + boardHeight);
        g.lineTo(left, bottom);
        g.stroke();

        // Draw pieces (skip in menu)
        if (this._state === GameState.MENU) return;

        // Locked pieces
        const filledCells = this._grid.getFilledCells();
        for (const cell of filledCells) {
            this.drawCell(g, cell.x, cell.y, cell.color);
        }

        // Current piece (ghost piece removed - players judge by eye)
        if (this._currentPiece && this._state === GameState.PLAYING) {
            const positions = this._currentPiece.getBlockPositions();
            for (const pos of positions) {
                this.drawCell(g, pos.x, pos.y, this._currentPiece.color);
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
        const px = GameMain.BOARD_OFFSET_X + gridX * GameMain.CELL_SIZE + 2;
        const py = GameMain.BOARD_OFFSET_Y + gridY * GameMain.CELL_SIZE + 2;
        const size = GameMain.CELL_SIZE - 4;
        
        // Fill the cell
        g.fillColor = color;
        g.fillRect(px, py, size, size);
        
        // Draw border
        g.strokeColor = new Color(0, 0, 0, 150);
        g.lineWidth = 1;
        g.moveTo(px, py);
        g.lineTo(px + size, py);
        g.lineTo(px + size, py + size);
        g.lineTo(px, py + size);
        g.lineTo(px, py);
        g.stroke();
    }
}
