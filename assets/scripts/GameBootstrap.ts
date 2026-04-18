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
        // 创建游戏画板节点
        const gameBoardNode = new Node('GameBoard');
        this.node.addChild(gameBoardNode);
        gameBoardNode.layer = Layers.Enum.UI_2D;
        const boardTransform = gameBoardNode.addComponent(UITransform);
        boardTransform.setContentSize(600, 600);
        gameBoardNode.addComponent(Graphics);
        
        // 创建下一个方块预览节点
        const nextPieceNode = new Node('NextPiece');
        this.node.addChild(nextPieceNode);
        nextPieceNode.layer = Layers.Enum.UI_2D;
        nextPieceNode.setPosition(new Vec3(200, 150, 0));
        const nextTransform = nextPieceNode.addComponent(UITransform);
        nextTransform.setContentSize(120, 120);
        nextPieceNode.addComponent(Graphics);
        
        // 创建 UI 标签
        const scoreLabel = this.createLabel('ScoreLabel', 'Score: 0', new Vec3(200, 80, 0), 24);
        const levelLabel = this.createLabel('LevelLabel', 'Level: 1', new Vec3(200, 40, 0), 24);
        const linesLabel = this.createLabel('LinesLabel', 'Lines: 0', new Vec3(200, 0, 0), 24);
        const comboLabel = this.createLabel('ComboLabel', '', new Vec3(200, -40, 0), 20, true);
        
        const menuLabel = this.createLabel('MenuLabel', 
            'ATETRIS\n\nPress any key to start\n\nControls:\n← → : Move\n↓ : Soft Drop\n↑ / X : Rotate CW\nZ : Rotate CCW\nSpace : Hard Drop\nP / Esc : Pause\nR : Restart', 
            new Vec3(0, 0, 0), 20);
        menuLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        menuLabel.verticalAlign = Label.VerticalAlign.CENTER;
        
        const pauseLabel = this.createLabel('PauseLabel', 
            'PAUSED\n\nPress P or Esc to resume', 
            new Vec3(0, 0, 0), 32, true);
        pauseLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        pauseLabel.verticalAlign = Label.VerticalAlign.CENTER;
        pauseLabel.node.active = false;
        
        const gameOverLabel = this.createLabel('GameOverLabel', 
            'GAME OVER', 
            new Vec3(0, 0, 0), 32, true);
        gameOverLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        gameOverLabel.verticalAlign = Label.VerticalAlign.CENTER;
        gameOverLabel.node.active = false;
        
        // 创建 GameManager 节点并挂载脚本
        const gameManagerNode = new Node('GameManager');
        this.node.addChild(gameManagerNode);
        
        const gameMain = gameManagerNode.addComponent(GameMain);
        
        // 绑定引用
        gameMain.gameBoardNode = gameBoardNode;
        gameMain.nextPieceNode = nextPieceNode;
        gameMain.scoreLabel = scoreLabel;
        gameMain.levelLabel = levelLabel;
        gameMain.linesLabel = linesLabel;
        gameMain.comboLabel = comboLabel;
        gameMain.gameOverLabel = gameOverLabel;
        gameMain.pauseLabel = pauseLabel;
        gameMain.menuLabel = menuLabel;
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
