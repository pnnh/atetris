import { _decorator, Component, Node, Graphics, Color, Label, Canvas, Vec3, UITransform, Layers } from 'cc';
import { GameMain } from './GameMain';

const { ccclass, property } = _decorator;

/**
 * GameBootstrap - 游戏场景初始化
 * 挂载到 Canvas 节点下，自动创建游戏所需的所有子节点
 */
@ccclass('GameBootstrap')
export class GameBootstrap extends Component {
    
    onLoad(): void {
        // 确保挂载在 Canvas 下
        const canvas = this.node.getComponent(Canvas);
        if (!canvas) {
            console.error('GameBootstrap must be attached to a Canvas node!');
            return;
        }
        
        this.createGameNodes();
    }

    private createGameNodes(): void {
        // 创建游戏画板节点 - 放在屏幕左侧偏左位置
        const gameBoardNode = new Node('GameBoard');
        this.node.addChild(gameBoardNode);
        gameBoardNode.layer = Layers.Enum.UI_2D;
        gameBoardNode.setPosition(new Vec3(-200, 0, 0));  // 向左移动，避免遮挡文字
        const boardTransform = gameBoardNode.addComponent(UITransform);
        boardTransform.setContentSize(500, 700);  // 增大尺寸
        const boardGraphics = gameBoardNode.addComponent(Graphics);
        
        // 创建下一个方块预览节点 - 放在右侧
        const nextPieceNode = new Node('NextPiece');
        this.node.addChild(nextPieceNode);
        nextPieceNode.layer = Layers.Enum.UI_2D;
        nextPieceNode.setPosition(new Vec3(280, 220, 0));  // 调整位置
        const nextTransform = nextPieceNode.addComponent(UITransform);
        nextTransform.setContentSize(150, 150);
        nextPieceNode.addComponent(Graphics);
        
        // 创建 UI 标签 - 放在更右侧
        const scoreLabel = this.createLabel('ScoreLabel', 'Score: 0', new Vec3(280, 80, 0), 28);
        const levelLabel = this.createLabel('LevelLabel', 'Level: 1', new Vec3(280, 40, 0), 28);
        const linesLabel = this.createLabel('LinesLabel', 'Lines: 0', new Vec3(280, 0, 0), 28);
        const comboLabel = this.createLabel('ComboLabel', '', new Vec3(280, -50, 0), 24, true);
        
        // 菜单文字放在右侧，避免与游戏画板重叠
        const menuLabel = this.createLabel('MenuLabel', 
            'ATETRIS\n\nPress any key to start\n\nControls:\n← → : Move\n↓ : Soft Drop\n↑ / X : Rotate CW\nZ : Rotate CCW\nSpace : Hard Drop\nP / Esc : Pause\nR : Restart', 
            new Vec3(280, 50, 0), 22);  // 移到右侧
        menuLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        menuLabel.verticalAlign = Label.VerticalAlign.CENTER;
        
        // 暂停和游戏结束标签放在右侧下方，避免与计分板重叠
        const pauseLabel = this.createLabel('PauseLabel', 
            'PAUSED\n\nPress P or Esc to resume', 
            new Vec3(280, -150, 0), 32, true);  // 移到下方
        pauseLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        pauseLabel.verticalAlign = Label.VerticalAlign.CENTER;
        pauseLabel.node.active = false;
        
        const gameOverLabel = this.createLabel('GameOverLabel', 
            'GAME OVER\n\nPress Space or R to restart', 
            new Vec3(280, -150, 0), 28, true);  // 移到下方，添加空格键提示
        gameOverLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        gameOverLabel.verticalAlign = Label.VerticalAlign.CENTER;
        gameOverLabel.node.active = false;
        
        // 创建 GameManager 节点并挂载脚本
        const gameManagerNode = new Node('GameManager');
        this.node.addChild(gameManagerNode);
        
        // 添加组件但不立即初始化
        const gameMain = gameManagerNode.addComponent(GameMain);
        
        // 延迟一帧设置引用，确保 onLoad 之后执行（使用引擎调度器而非 setTimeout）
        this.scheduleOnce(() => {
            gameMain.gameBoardNode = gameBoardNode;
            gameMain.nextPieceNode = nextPieceNode;
            gameMain.scoreLabel = scoreLabel;
            gameMain.levelLabel = levelLabel;
            gameMain.linesLabel = linesLabel;
            gameMain.comboLabel = comboLabel;
            gameMain.gameOverLabel = gameOverLabel;
            gameMain.pauseLabel = pauseLabel;
            gameMain.menuLabel = menuLabel;
            
            // 异步初始化（加载像素艺术纹理后再启动游戏）
            gameMain.initAsync().catch(err => console.error('[GameMain] initAsync failed:', err));
        }, 0);
    }
    
    private createLabel(name: string, text: string, position: Vec3, fontSize: number = 24, bold: boolean = false): Label {
        const node = new Node(name);
        this.node.addChild(node);
        node.layer = Layers.Enum.UI_2D;
        node.setPosition(position);
        
        const transform = node.addComponent(UITransform);
        transform.setContentSize(300, 40);
        
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 6;
        label.isBold = bold;
        label.horizontalAlign = Label.HorizontalAlign.LEFT;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.color = Color.WHITE;
        
        return label;
    }
}
