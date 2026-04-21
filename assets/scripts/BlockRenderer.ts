import { Node, Sprite, UITransform, SpriteFrame, Texture2D, ImageAsset, Vec3, Layers } from 'cc';
import { BlockTextures } from './BlockTextures';
import { Grid } from './Grid';
import { Tetromino, TetrominoType } from './Tetromino';

/**
 * BlockRenderer - 管理精灵节点池，用于渲染游戏方块
 * 替代原有 Graphics.drawCell() 的逐帧绘制方式
 */
export class BlockRenderer {
    private _spriteFrames: SpriteFrame[] = [];
    private _boardNodes: Node[][] = [];   // [y][x] 200个格子节点
    private _nextPieceNodes: Node[] = []; // 最多4个预览节点

    constructor(
        private readonly boardNode: Node,
        private readonly nextPieceNode: Node,
        private readonly cellSize: number,
        private readonly boardOffsetX: number,
        private readonly boardOffsetY: number,
    ) { }

    /** 异步初始化：加载纹理并创建精灵节点池 */
    public async init(): Promise<void> {
        await this._loadTextures();
        this._createBoardSprites();
        this._createNextPieceSprites();
    }

    // ─────────────────────────────────────────────────────────
    //  纹理加载
    // ─────────────────────────────────────────────────────────

    private async _loadTextures(): Promise<void> {
        const base64Map: string[] = [
            BlockTextures.I,  // TetrominoType.I = 0
            BlockTextures.O,  // TetrominoType.O = 1
            BlockTextures.T,  // TetrominoType.T = 2
            BlockTextures.S,  // TetrominoType.S = 3
            BlockTextures.Z,  // TetrominoType.Z = 4
            BlockTextures.J,  // TetrominoType.J = 5
            BlockTextures.L,  // TetrominoType.L = 6
        ];
        this._spriteFrames = await Promise.all(base64Map.map(b64 => this._b64ToSpriteFrame(b64)));
    }

    private _b64ToSpriteFrame(base64: string): Promise<SpriteFrame> {
        return new Promise<SpriteFrame>((resolve, reject) => {
            const img = new Image();
            img.src = 'data:image/png;base64,' + base64;
            img.onload = () => {
                try {
                    const imageAsset = new ImageAsset(img);
                    const texture = new Texture2D();
                    texture.image = imageAsset;
                    const spriteFrame = new SpriteFrame();
                    spriteFrame.texture = texture;
                    resolve(spriteFrame);
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = () => reject(new Error('Failed to load block texture'));
        });
    }

    // ─────────────────────────────────────────────────────────
    //  节点池创建
    // ─────────────────────────────────────────────────────────

    private _createBoardSprites(): void {
        this._boardNodes = [];
        for (let y = 0; y < Grid.HEIGHT; y++) {
            this._boardNodes[y] = [];
            for (let x = 0; x < Grid.WIDTH; x++) {
                const node = this._makeSpriteNode(`blk_${x}_${y}`, this.cellSize);
                // 定位到格子中心
                const px = this.boardOffsetX + x * this.cellSize + this.cellSize * 0.5;
                const py = this.boardOffsetY + y * this.cellSize + this.cellSize * 0.5;
                node.setPosition(new Vec3(px, py, 0));
                node.active = false;
                this.boardNode.addChild(node);
                this._boardNodes[y][x] = node;
            }
        }
    }

    private _createNextPieceSprites(): void {
        this._nextPieceNodes = [];
        for (let i = 0; i < 4; i++) {
            const node = this._makeSpriteNode(`next_${i}`, this.cellSize);
            node.active = false;
            this.nextPieceNode.addChild(node);
            this._nextPieceNodes.push(node);
        }
    }

    private _makeSpriteNode(name: string, size: number): Node {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        const uiT = node.addComponent(UITransform);
        uiT.setContentSize(size, size);
        const spr = node.addComponent(Sprite);
        // CUSTOM 模式防止 spriteFrame 赋值时触发 _applySpriteSize()
        // 避免动态图集 trimming 导致节点反复激活后 UITransform 缩小变成小点
        spr.sizeMode = Sprite.SizeMode.CUSTOM;
        return node;
    }

    // ─────────────────────────────────────────────────────────
    //  每帧更新
    // ─────────────────────────────────────────────────────────

    /**
     * 更新游戏板精灵状态
     * @param grid 当前网格
     * @param currentPiece 当前活动方块（为 null 时不渲染活动方块）
     * @param showCurrentPiece 是否显示当前方块（Playing 状态时为 true）
     */
    public updateBoard(grid: Grid, currentPiece: Tetromino | null, showCurrentPiece: boolean): void {
        if (this._spriteFrames.length === 0) return;

        // 构建当前方块占用位置集合
        const activeCells = new Map<string, TetrominoType>();
        if (currentPiece && showCurrentPiece) {
            for (const pos of currentPiece.getBlockPositions()) {
                activeCells.set(`${pos.x},${pos.y}`, currentPiece.type);
            }
        }

        for (let y = 0; y < Grid.HEIGHT; y++) {
            for (let x = 0; x < Grid.WIDTH; x++) {
                const node = this._boardNodes[y][x];
                const key = `${x},${y}`;

                let pieceType: TetrominoType | null = null;

                if (activeCells.has(key)) {
                    pieceType = activeCells.get(key)!;
                } else {
                    const cell = grid.getCell(x, y);
                    if (cell && cell.filled && cell.pieceType >= 0) {
                        pieceType = cell.pieceType as TetrominoType;
                    }
                }

                if (pieceType !== null) {
                    node.active = true;
                    node.getComponent(Sprite)!.spriteFrame = this._spriteFrames[pieceType];
                } else {
                    node.active = false;
                }
            }
        }
    }

    /**
     * 更新下一个方块预览区域
     */
    public updateNextPiece(nextPieceType: TetrominoType): void {
        if (this._spriteFrames.length === 0) return;

        const nextPiece = new Tetromino(nextPieceType);
        const shape = nextPiece.getCurrentShape();
        const size = this.cellSize;

        // 收集方块格子坐标（转换坐标系：行0在底部）
        const blocks: { x: number; y: number }[] = [];
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] === 1) {
                    blocks.push({ x: col, y: shape.length - 1 - row });
                }
            }
        }

        const offsetX = -shape[0].length * size * 0.5;
        const offsetY = -shape.length * size * 0.5;
        const sf = this._spriteFrames[nextPieceType];

        for (let i = 0; i < this._nextPieceNodes.length; i++) {
            const node = this._nextPieceNodes[i];
            if (i < blocks.length) {
                const px = offsetX + blocks[i].x * size + size * 0.5;
                const py = offsetY + blocks[i].y * size + size * 0.5;
                node.setPosition(new Vec3(px, py, 0));
                node.getComponent(Sprite)!.spriteFrame = sf;
                node.active = true;
            } else {
                node.active = false;
            }
        }
    }

    /** 隐藏预览区所有精灵 */
    public clearNextPiece(): void {
        for (const node of this._nextPieceNodes) {
            node.active = false;
        }
    }

    /** 隐藏游戏板所有精灵 */
    public clearBoard(): void {
        for (let y = 0; y < Grid.HEIGHT; y++) {
            for (let x = 0; x < Grid.WIDTH; x++) {
                this._boardNodes[y]?.[x] && (this._boardNodes[y][x].active = false);
            }
        }
    }
}
