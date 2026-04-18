import { _decorator } from 'cc';

const { ccclass } = _decorator;

export interface ScoreData {
    score: number;
    level: number;
    lines: number;
    combo: number;
}

@ccclass('ScoreManager')
export class ScoreManager {
    private _score: number = 0;
    private _level: number = 1;
    private _lines: number = 0;
    private _combo: number = -1; // -1 means no combo started
    
    // Scoring table (based on classic Nintendo scoring system)
    private static readonly LINE_SCORES: number[] = [0, 40, 100, 300, 1200];
    
    // Level progression
    private static readonly LINES_PER_LEVEL: number = 10;
    
    // Drop scoring
    private static readonly SOFT_DROP_SCORE: number = 1;
    private static readonly HARD_DROP_SCORE: number = 2;

    // Callbacks for UI updates
    private _onScoreChanged: ((score: number) => void) | null = null;
    private _onLevelChanged: ((level: number) => void) | null = null;
    private _onLinesChanged: ((lines: number) => void) | null = null;
    private _onComboChanged: ((combo: number) => void) | null = null;

    constructor() {
        this.reset();
    }

    public reset(): void {
        this._score = 0;
        this._level = 1;
        this._lines = 0;
        this._combo = -1;
        this.notifyChanges();
    }

    // Setters for callbacks
    public setOnScoreChanged(callback: (score: number) => void): void {
        this._onScoreChanged = callback;
    }

    public setOnLevelChanged(callback: (level: number) => void): void {
        this._onLevelChanged = callback;
    }

    public setOnLinesChanged(callback: (lines: number) => void): void {
        this._onLinesChanged = callback;
    }

    public setOnComboChanged(callback: (combo: number) => void): void {
        this._onComboChanged = callback;
    }

    // Getters
    public get score(): number {
        return this._score;
    }

    public get level(): number {
        return this._level;
    }

    public get lines(): number {
        return this._lines;
    }

    public get combo(): number {
        return Math.max(0, this._combo);
    }

    public getScoreData(): ScoreData {
        return {
            score: this._score,
            level: this._level,
            lines: this._lines,
            combo: this.combo
        };
    }

    // Scoring methods
    public addLineClearScore(linesCleared: number): void {
        if (linesCleared <= 0 || linesCleared > 4) {
            this._combo = -1; // Reset combo if no lines cleared
            this.notifyComboChange();
            return;
        }

        // Increment combo
        this._combo++;
        
        // Calculate base score for lines cleared
        const baseScore = ScoreManager.LINE_SCORES[linesCleared];
        
        // Apply level multiplier and combo bonus
        const levelMultiplier = this._level;
        const comboBonus = this._combo > 0 ? (this._combo * 50 * linesCleared) : 0;
        
        const totalScore = (baseScore * levelMultiplier) + comboBonus;
        
        this._score += totalScore;
        this._lines += linesCleared;
        
        // Check for level up
        const newLevel = Math.floor(this._lines / ScoreManager.LINES_PER_LEVEL) + 1;
        if (newLevel > this._level) {
            this._level = newLevel;
            this.notifyLevelChange();
        }
        
        this.notifyScoreChange();
        this.notifyLinesChange();
        this.notifyComboChange();
    }

    public addSoftDropScore(cells: number = 1): void {
        this._score += cells * ScoreManager.SOFT_DROP_SCORE;
        this.notifyScoreChange();
    }

    public addHardDropScore(cells: number): void {
        this._score += cells * ScoreManager.HARD_DROP_SCORE;
        this.notifyScoreChange();
    }

    // Calculate fall speed based on level (in seconds)
    public getFallSpeed(): number {
        // Classic Tetris fall speed formula
        // Level 1: ~1 second per row
        // Level 10: ~0.1 second per row
        // Level 15+: 0.05 second per row (very fast)
        
        if (this._level >= 15) {
            return 0.05;
        } else if (this._level >= 10) {
            return 0.1;
        } else if (this._level >= 5) {
            return 0.3 - (this._level - 5) * 0.04;
        } else {
            return 1.0 - (this._level - 1) * 0.15;
        }
    }

    // Notification methods
    private notifyScoreChange(): void {
        if (this._onScoreChanged) {
            this._onScoreChanged(this._score);
        }
    }

    private notifyLevelChange(): void {
        if (this._onLevelChanged) {
            this._onLevelChanged(this._level);
        }
    }

    private notifyLinesChange(): void {
        if (this._onLinesChanged) {
            this._onLinesChanged(this._lines);
        }
    }

    private notifyComboChange(): void {
        if (this._onComboChanged) {
            this._onComboChanged(this.combo);
        }
    }

    private notifyChanges(): void {
        this.notifyScoreChange();
        this.notifyLevelChange();
        this.notifyLinesChange();
        this.notifyComboChange();
    }

    // High score persistence
    public static saveHighScore(score: number): void {
        const currentHigh = ScoreManager.getHighScore();
        if (score > currentHigh) {
            localStorage.setItem('atetris_highscore', score.toString());
        }
    }

    public static getHighScore(): number {
        const saved = localStorage.getItem('atetris_highscore');
        return saved ? parseInt(saved, 10) : 0;
    }

    public static clearHighScore(): void {
        localStorage.removeItem('atetris_highscore');
    }
}
