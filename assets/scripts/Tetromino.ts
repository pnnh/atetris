import { _decorator, Color } from 'cc';

const { ccclass } = _decorator;

export enum TetrominoType {
    I = 0,
    O = 1,
    T = 2,
    S = 3,
    Z = 4,
    J = 5,
    L = 6
}

export interface PieceShape {
    type: TetrominoType;
    color: Color;
    shapes: number[][][]; // [rotation][row][col]
}

@ccclass('Tetromino')
export class Tetromino {
    // 7种经典俄罗斯方块形状定义 (4种旋转状态) - 使用深色以提高对比度
    private static readonly SHAPES: PieceShape[] = [
        // I-Piece (Dark Cyan/Teal)
        {
            type: TetrominoType.I,
            color: new Color(0, 180, 180, 255),
            shapes: [
                [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
                [[0,0,1,0], [0,0,1,0], [0,0,1,0], [0,0,1,0]],
                [[0,0,0,0], [0,0,0,0], [1,1,1,1], [0,0,0,0]],
                [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]]
            ]
        },
        // O-Piece (Dark Yellow/Gold)
        {
            type: TetrominoType.O,
            color: new Color(220, 180, 0, 255),
            shapes: [
                [[1,1], [1,1]],
                [[1,1], [1,1]],
                [[1,1], [1,1]],
                [[1,1], [1,1]]
            ]
        },
        // T-Piece (Dark Purple)
        {
            type: TetrominoType.T,
            color: new Color(160, 0, 160, 255),
            shapes: [
                [[0,1,0], [1,1,1], [0,0,0]],
                [[0,1,0], [0,1,1], [0,1,0]],
                [[0,0,0], [1,1,1], [0,1,0]],
                [[0,1,0], [1,1,0], [0,1,0]]
            ]
        },
        // S-Piece (Dark Green)
        {
            type: TetrominoType.S,
            color: new Color(0, 180, 0, 255),
            shapes: [
                [[0,1,1], [1,1,0], [0,0,0]],
                [[0,1,0], [0,1,1], [0,0,1]],
                [[0,0,0], [0,1,1], [1,1,0]],
                [[1,0,0], [1,1,0], [0,1,0]]
            ]
        },
        // Z-Piece (Dark Red)
        {
            type: TetrominoType.Z,
            color: new Color(220, 0, 0, 255),
            shapes: [
                [[1,1,0], [0,1,1], [0,0,0]],
                [[0,0,1], [0,1,1], [0,1,0]],
                [[0,0,0], [1,1,0], [0,1,1]],
                [[0,1,0], [1,1,0], [1,0,0]]
            ]
        },
        // J-Piece (Dark Blue)
        {
            type: TetrominoType.J,
            color: new Color(0, 0, 200, 255),
            shapes: [
                [[1,0,0], [1,1,1], [0,0,0]],
                [[0,1,1], [0,1,0], [0,1,0]],
                [[0,0,0], [1,1,1], [0,0,1]],
                [[0,1,0], [0,1,0], [1,1,0]]
            ]
        },
        // L-Piece (Dark Orange)
        {
            type: TetrominoType.L,
            color: new Color(220, 120, 0, 255),
            shapes: [
                [[0,0,1], [1,1,1], [0,0,0]],
                [[0,1,0], [0,1,0], [0,1,1]],
                [[0,0,0], [1,1,1], [1,0,0]],
                [[1,1,0], [0,1,0], [0,1,0]]
            ]
        }
    ];

    private _type: TetrominoType;
    private _rotation: number = 0;
    private _x: number = 0;
    private _y: number = 0;

    constructor(type: TetrominoType) {
        this._type = type;
    }

    public static getRandomType(): TetrominoType {
        return Math.floor(Math.random() * 7);
    }

    public static createRandom(): Tetromino {
        return new Tetromino(Tetromino.getRandomType());
    }

    public get type(): TetrominoType {
        return this._type;
    }

    public get color(): Color {
        return Tetromino.SHAPES[this._type].color;
    }

    public get x(): number {
        return this._x;
    }

    public set x(value: number) {
        this._x = value;
    }

    public get y(): number {
        return this._y;
    }

    public set y(value: number) {
        this._y = value;
    }

    public get rotation(): number {
        return this._rotation;
    }

    public getCurrentShape(): number[][] {
        return Tetromino.SHAPES[this._type].shapes[this._rotation];
    }

    public getShapeAtRotation(rotation: number): number[][] {
        const r = ((rotation % 4) + 4) % 4;
        return Tetromino.SHAPES[this._type].shapes[r];
    }

    public rotate(clockwise: boolean = true): void {
        if (clockwise) {
            this._rotation = (this._rotation + 1) % 4;
        } else {
            this._rotation = (this._rotation + 3) % 4;
        }
    }

    public getRotatedShape(clockwise: boolean = true): number[][] {
        const newRotation = clockwise ? (this._rotation + 1) % 4 : (this._rotation + 3) % 4;
        return Tetromino.SHAPES[this._type].shapes[newRotation];
    }

    public getBlockPositions(): { x: number, y: number }[] {
        const shape = this.getCurrentShape();
        const positions: { x: number, y: number }[] = [];
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] === 1) {
                    positions.push({
                        x: this._x + col,
                        y: this._y + row
                    });
                }
            }
        }
        
        return positions;
    }

    public getRotatedBlockPositions(clockwise: boolean = true): { x: number, y: number }[] {
        const shape = this.getRotatedShape(clockwise);
        const positions: { x: number, y: number }[] = [];
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] === 1) {
                    positions.push({
                        x: this._x + col,
                        y: this._y + row
                    });
                }
            }
        }
        
        return positions;
    }

    public clone(): Tetromino {
        const clone = new Tetromino(this._type);
        clone._rotation = this._rotation;
        clone._x = this._x;
        clone._y = this._y;
        return clone;
    }
}
