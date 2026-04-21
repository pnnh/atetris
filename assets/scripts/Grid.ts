import { _decorator, Color } from 'cc';
import { Tetromino } from './Tetromino';

const { ccclass } = _decorator;

export interface Cell {
    filled: boolean;
    color: Color | null;
    pieceType: number;  // TetrominoType，空格子为 -1
}

@ccclass('Grid')
export class Grid {
    public static readonly WIDTH: number = 10;
    public static readonly HEIGHT: number = 20;
    public static readonly VISIBLE_HEIGHT: number = 20;

    private _cells: Cell[][];

    constructor() {
        this._cells = [];
        this.clear();
    }

    public clear(): void {
        this._cells = [];
        for (let y = 0; y < Grid.HEIGHT; y++) {
            this._cells[y] = [];
            for (let x = 0; x < Grid.WIDTH; x++) {
                this._cells[y][x] = {
                    filled: false,
                    color: null,
                    pieceType: -1
                };
            }
        }
    }

    public getCell(x: number, y: number): Cell | null {
        if (!this.isValidPosition(x, y)) {
            return null;
        }
        return this._cells[y][x];
    }

    public isValidPosition(x: number, y: number): boolean {
        return x >= 0 && x < Grid.WIDTH && y >= 0 && y < Grid.HEIGHT;
    }

    public isCellFilled(x: number, y: number): boolean {
        const cell = this.getCell(x, y);
        return cell ? cell.filled : true; // Out of bounds is treated as filled (collision)
    }

    public canPlacePiece(piece: Tetromino): boolean {
        const positions = piece.getBlockPositions();
        
        for (const pos of positions) {
            // Check bounds
            if (pos.x < 0 || pos.x >= Grid.WIDTH || pos.y < 0 || pos.y >= Grid.HEIGHT) {
                return false;
            }
            // Check collision with existing cells
            if (this._cells[pos.y][pos.x].filled) {
                return false;
            }
        }
        
        return true;
    }

    public canPlacePieceAt(piece: Tetromino, offsetX: number, offsetY: number): boolean {
        const originalX = piece.x;
        const originalY = piece.y;
        
        piece.x += offsetX;
        piece.y += offsetY;
        const canPlace = this.canPlacePiece(piece);
        
        piece.x = originalX;
        piece.y = originalY;
        
        return canPlace;
    }

    public canRotatePiece(piece: Tetromino, clockwise: boolean = true): boolean {
        const positions = piece.getRotatedBlockPositions(clockwise);
        
        for (const pos of positions) {
            if (pos.x < 0 || pos.x >= Grid.WIDTH || pos.y < 0 || pos.y >= Grid.HEIGHT) {
                return false;
            }
            if (this._cells[pos.y][pos.x].filled) {
                return false;
            }
        }
        
        return true;
    }

    public lockPiece(piece: Tetromino): void {
        const positions = piece.getBlockPositions();
        const color = piece.color;
        
        const pieceType = piece.type;
        for (const pos of positions) {
            if (this.isValidPosition(pos.x, pos.y)) {
                this._cells[pos.y][pos.x] = {
                    filled: true,
                    color: color,
                    pieceType: pieceType
                };
            }
        }
    }

    public clearLines(): { linesCleared: number, lines: number[] } {
        const linesToClear: number[] = [];
        
        // Find complete lines
        for (let y = 0; y < Grid.HEIGHT; y++) {
            let isLineComplete = true;
            for (let x = 0; x < Grid.WIDTH; x++) {
                if (!this._cells[y][x].filled) {
                    isLineComplete = false;
                    break;
                }
            }
            if (isLineComplete) {
                linesToClear.push(y);
            }
        }
        
        // Clear lines from top to bottom
        for (const lineY of linesToClear.sort((a, b) => b - a)) {
            this.removeLine(lineY);
        }
        
        return {
            linesCleared: linesToClear.length,
            lines: linesToClear
        };
    }

    private removeLine(lineY: number): void {
        // Move all lines above down by one
        for (let y = lineY; y < Grid.HEIGHT - 1; y++) {
            for (let x = 0; x < Grid.WIDTH; x++) {
                this._cells[y][x] = {
                    filled: this._cells[y + 1][x].filled,
                    color: this._cells[y + 1][x].color ? this._cells[y + 1][x].color!.clone() : null,
                    pieceType: this._cells[y + 1][x].pieceType
                };
            }
        }
        
        // Clear the top line
        for (let x = 0; x < Grid.WIDTH; x++) {
            this._cells[Grid.HEIGHT - 1][x] = {
                filled: false,
                color: null,
                pieceType: -1
            };
        }
    }

    public getGhostPiecePosition(piece: Tetromino): number {
        let dropDistance = 0;
        
        while (this.canPlacePieceAt(piece, 0, -dropDistance - 1)) {
            dropDistance++;
        }
        
        return piece.y - dropDistance;
    }

    public isGameOver(): boolean {
        // Check if any cells in the spawn area (top 4 rows) are filled
        for (let y = Grid.HEIGHT - 4; y < Grid.HEIGHT; y++) {
            for (let x = 0; x < Grid.WIDTH; x++) {
                if (this._cells[y][x].filled) {
                    return true;
                }
            }
        }
        return false;
    }

    public get cells(): Cell[][] {
        return this._cells;
    }

    public getFilledCells(): { x: number, y: number, color: Color, pieceType: number }[] {
        const filled: { x: number, y: number, color: Color, pieceType: number }[] = [];
        
        for (let y = 0; y < Grid.HEIGHT; y++) {
            for (let x = 0; x < Grid.WIDTH; x++) {
                if (this._cells[y][x].filled && this._cells[y][x].color) {
                    filled.push({
                        x: x,
                        y: y,
                        color: this._cells[y][x].color!,
                        pieceType: this._cells[y][x].pieceType
                    });
                }
            }
        }
        
        return filled;
    }
}
