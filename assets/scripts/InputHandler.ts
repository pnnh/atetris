import { _decorator, input, Input, EventKeyboard, KeyCode } from 'cc';

const { ccclass } = _decorator;

export enum GameAction {
    MOVE_LEFT = 'moveLeft',
    MOVE_RIGHT = 'moveRight',
    MOVE_DOWN = 'moveDown',
    ROTATE_CLOCKWISE = 'rotateClockwise',
    ROTATE_COUNTER_CLOCKWISE = 'rotateCounterClockwise',
    HARD_DROP = 'hardDrop',
    PAUSE = 'pause',
    RESTART = 'restart'
}

export type ActionCallback = () => void;

@ccclass('InputHandler')
export class InputHandler {
    private _actionCallbacks: Map<GameAction, ActionCallback[]> = new Map();
    private _keyRepeatTimers: Map<KeyCode, number> = new Map();
    private _keyInitialDelay: number = 170; // ms before repeat starts
    private _keyRepeatRate: number = 50; // ms between repeats
    private _lastKeyPressTime: Map<KeyCode, number> = new Map();
    private _isKeyPressed: Map<KeyCode, boolean> = new Map();
    
    // Key mappings
    private _keyMap: Map<KeyCode, GameAction> = new Map([
        [KeyCode.ARROW_LEFT, GameAction.MOVE_LEFT],
        [KeyCode.ARROW_RIGHT, GameAction.MOVE_RIGHT],
        [KeyCode.ARROW_DOWN, GameAction.MOVE_DOWN],
        [KeyCode.ARROW_UP, GameAction.ROTATE_CLOCKWISE],
        [KeyCode.KEY_Z, GameAction.ROTATE_COUNTER_CLOCKWISE],
        [KeyCode.KEY_X, GameAction.ROTATE_CLOCKWISE],
        [KeyCode.SPACE, GameAction.HARD_DROP],
        [KeyCode.ESCAPE, GameAction.PAUSE],
        [KeyCode.KEY_P, GameAction.PAUSE],
        [KeyCode.KEY_R, GameAction.RESTART]
    ]);

    constructor() {
        this.setupInput();
    }

    private setupInput(): void {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    public destroy(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    public registerCallback(action: GameAction, callback: ActionCallback): void {
        if (!this._actionCallbacks.has(action)) {
            this._actionCallbacks.set(action, []);
        }
        this._actionCallbacks.get(action)!.push(callback);
    }

    public unregisterCallback(action: GameAction, callback: ActionCallback): void {
        const callbacks = this._actionCallbacks.get(action);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    public clearCallbacks(): void {
        this._actionCallbacks.clear();
    }

    private onKeyDown(event: EventKeyboard): void {
        const keyCode = event.keyCode;
        const action = this._keyMap.get(keyCode);
        
        if (action) {
            // Mark key as pressed
            this._isKeyPressed.set(keyCode, true);
            this._lastKeyPressTime.set(keyCode, Date.now());
            
            // Execute action immediately
            this.executeAction(action);
        }
    }

    private onKeyUp(event: EventKeyboard): void {
        const keyCode = event.keyCode;
        this._isKeyPressed.set(keyCode, false);
        this._lastKeyPressTime.delete(keyCode);
        this._keyRepeatTimers.delete(keyCode);
    }

    public update(deltaTime: number): void {
        const now = Date.now();
        
        // Handle key repeat for movement keys
        for (const [keyCode, isPressed] of this._isKeyPressed) {
            if (!isPressed) continue;
            
            const action = this._keyMap.get(keyCode);
            if (!action) continue;
            
            // Only repeat movement actions
            if (action !== GameAction.MOVE_LEFT && 
                action !== GameAction.MOVE_RIGHT && 
                action !== GameAction.MOVE_DOWN) {
                continue;
            }
            
            const lastPressTime = this._lastKeyPressTime.get(keyCode) || 0;
            const elapsed = now - lastPressTime;
            
            if (elapsed > this._keyInitialDelay) {
                const repeatCount = Math.floor((elapsed - this._keyInitialDelay) / this._keyRepeatRate);
                const lastRepeat = this._keyRepeatTimers.get(keyCode) || 0;
                
                if (repeatCount > lastRepeat) {
                    this._keyRepeatTimers.set(keyCode, repeatCount);
                    this.executeAction(action);
                }
            }
        }
    }

    private executeAction(action: GameAction): void {
        const callbacks = this._actionCallbacks.get(action);
        if (callbacks) {
            for (const callback of callbacks) {
                callback();
            }
        }
    }

    public isActionPressed(action: GameAction): boolean {
        for (const [keyCode, mappedAction] of this._keyMap) {
            if (mappedAction === action) {
                return this._isKeyPressed.get(keyCode) || false;
            }
        }
        return false;
    }

    public setKeyRepeatDelay(initialDelay: number, repeatRate: number): void {
        this._keyInitialDelay = initialDelay;
        this._keyRepeatRate = repeatRate;
    }
}
