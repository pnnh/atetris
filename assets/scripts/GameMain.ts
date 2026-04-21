import { _decorator, Component, Node, Graphics, Color, Vec3, Label, input, Input, EventKeyboard, KeyCode, UITransform } from 'cc';
import { Grid } from './Grid';
import { Tetromino, TetrominoType } from './Tetromino';
import { InputHandler, GameAction } from './InputHandler';
import { ScoreManager } from './ScoreManager';
import { BlockRenderer } from './BlockRenderer';

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

    // Graphics（仅用于绘制网格背景和边框）
    private _boardGraphics: Graphics | null = null;
    private _nextPieceGraphics: Graphics | null = null;

    // 精灵渲染器（绘制方块像素艺术）
    private _blockRenderer: BlockRenderer | null = null;

    onLoad(): void {
        // 延迟初始化，等待 GameBootstrap 设置节点引用
        // 实际初始化在 initAsync() 方法中
    }

    /** 旧同步入口保留兼容性，实际已不使用 */
    public init(): void { /* no-op */ }

    /** 异步初始化：加载像素艺术纹理后再启动游戏 */
    public async initAsync(): Promise<void> {
        this.setupGraphics();
        this._blockRenderer = new BlockRenderer(
            this.gameBoardNode!,
            this.nextPieceNode!,
            GameMain.CELL_SIZE,
            GameMain.BOARD_OFFSET_X,
            GameMain.BOARD_OFFSET_Y,
        );
        await this._blockRenderer.init();
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
                // 暂停时继续显示当前画面（精灵节点保持原状，仅刷新背景）
                this._renderBoardBackground();
                break;
            case GameState.MENU:
                // do nothing - showMenu() 已经渲染过一次背景
                break;
        }
    }

    private setupGraphics(): void {
        if (this.gameBoardNode) {
            // 背景节点必须是第一个子节点（sibling index 0），确保在精灵节点之前渲染
            let boardBgNode = this.gameBoardNode.getChildByName('BoardBg');
            if (!boardBgNode) {
                boardBgNode = new Node('BoardBg');
                boardBgNode.addComponent(UITransform);
                this.gameBoardNode.addChild(boardBgNode);
                boardBgNode.setSiblingIndex(0);
            }
            this._boardGraphics = boardBgNode.getComponent(Graphics) ?? boardBgNode.addComponent(Graphics);
        } else {
            console.error('GameBoard node not assigned!');
        }

        if (this.nextPieceNode) {
            let nextBgNode = this.nextPieceNode.getChildByName('NextBg');
            if (!nextBgNode) {
                nextBgNode = new Node('NextBg');
                nextBgNode.addComponent(UITransform);
                this.nextPieceNode.addChild(nextBgNode);
                nextBgNode.setSiblingIndex(0);
            }
            this._nextPieceGraphics = nextBgNode.getComponent(Graphics) ?? nextBgNode.addComponent(Graphics);
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
        // 更新预览区精灵
        this._blockRenderer?.updateNextPiece(this._nextPieceType);
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
        this.renderBackground();
        if (this._blockRenderer) {
            if (this._state === GameState.MENU) {
                this._blockRenderer.clearBoard();
                this._blockRenderer.clearNextPiece();
            } else {
                this._blockRenderer.updateBoard(
                    this._grid,
                    this._currentPiece,
                    this._state === GameState.PLAYING,
                );
                this._blockRenderer.updateNextPiece(this._nextPieceType);
            }
        }
    }

    /** 仅绘制背景网格和预览框（不含方块，方块由 BlockRenderer 精灵处理） */
    private renderBackground(): void {
        this._renderBoardBackground();
        if (this._state !== GameState.MENU) {
            this._renderNextPieceBackground();
        }
    }

    private _renderBoardBackground(): void {
        if (!this._boardGraphics) return;
        const g = this._boardGraphics;
        g.clear();

        const boardWidth = Grid.WIDTH * GameMain.CELL_SIZE;
        const boardHeight = Grid.HEIGHT * GameMain.CELL_SIZE;
        const left = GameMain.BOARD_OFFSET_X;
        const bottom = GameMain.BOARD_OFFSET_Y;

        // 背景底色
        g.fillColor = new Color(20, 20, 35, 255);
        g.fillRect(left, bottom, boardWidth, boardHeight);

        // 棋盘格交替底色
        g.fillColor = new Color(25, 25, 42, 255);
        for (let row = 0; row < Grid.HEIGHT; row++) {
            for (let col = 0; col < Grid.WIDTH; col++) {
                if ((row + col) % 2 === 0) {
                    g.fillRect(left + col * GameMain.CELL_SIZE, bottom + row * GameMain.CELL_SIZE,
                               GameMain.CELL_SIZE, GameMain.CELL_SIZE);
                }
            }
        }

        // 网格线
        g.strokeColor = new Color(40, 40, 60, 255);
        g.lineWidth = 1;
        for (let x = 0; x <= Grid.WIDTH; x++) {
            const px = left + x * GameMain.CELL_SIZE;
            g.moveTo(px, bottom); g.lineTo(px, bottom + boardHeight);
        }
        for (let y = 0; y <= Grid.HEIGHT; y++) {
            const py = bottom + y * GameMain.CELL_SIZE;
            g.moveTo(left, py); g.lineTo(left + boardWidth, py);
        }
        g.stroke();

        // 外边框
        g.strokeColor = new Color(100, 100, 160, 255);
        g.lineWidth = 3;
        g.moveTo(left, bottom);
        g.lineTo(left + boardWidth, bottom);
        g.lineTo(left + boardWidth, bottom + boardHeight);
        g.lineTo(left, bottom + boardHeight);
        g.lineTo(left, bottom);
        g.stroke();
    }

    private _renderNextPieceBackground(): void {
        if (!this._nextPieceGraphics) return;
        const g = this._nextPieceGraphics;
        g.clear();
        g.fillColor = new Color(20, 20, 35, 255);
        g.rect(-60, -60, 120, 120);
        g.fill();
        g.strokeColor = new Color(100, 100, 160, 255);
        g.lineWidth = 2;
        g.rect(-60, -60, 120, 120);
        g.stroke();
    }
}
