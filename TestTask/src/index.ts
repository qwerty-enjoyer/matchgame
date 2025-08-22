"use strict";

const GRID_SIZE = 8;
const CELL_SIZE = 60;
const ITEM_TYPES = 5;
const COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star'];

interface Position {
    x: number;
    y: number;
}

interface MatchPosition {
    x: number;
    y: number;
}

type ShapeType = 'circle' | 'square' | 'triangle' | 'diamond' | 'star';

class GameItem {
    public type: number;
    public x: number;
    public y: number;
    public screenX: number;
    public screenY: number;
    public targetX: number;
    public targetY: number;
    public falling: boolean;
    public removing: boolean;
    public swapping: boolean;
    public scale: number;

    constructor(type: number, x: number, y: number) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.screenX = x * CELL_SIZE + CELL_SIZE / 2;
        this.screenY = y * CELL_SIZE + CELL_SIZE / 2;
        this.targetX = this.screenX;
        this.targetY = this.screenY;
        this.falling = false;
        this.removing = false;
        this.swapping = false;
        this.scale = 1;
    }
        
    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.translate(this.screenX, this.screenY);
        ctx.scale(this.scale, this.scale);
        ctx.fillStyle = COLORS[this.type] || '#ffffff';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        const size: number = 20;
        const shape: ShapeType = SHAPES[this.type] as ShapeType || 'circle';
        ctx.beginPath();
        switch(shape) {
            case 'circle':
                ctx.arc(0, 0, size, 0, Math.PI * 2);
                break;
            case 'square':
                ctx.rect(-size, -size, size * 2, size * 2);
                break;
            case 'triangle':
                ctx.moveTo(0, -size);
                ctx.lineTo(-size, size);
                ctx.lineTo(size, size);
                ctx.closePath();
                break;
            case 'diamond':
                ctx.moveTo(0, -size);
                ctx.lineTo(size, 0);
                ctx.lineTo(0, size);
                ctx.lineTo(-size, 0);
                ctx.closePath();
                break;
            case 'star':
                for(let i = 0; i < 10; i++) {
                    const angle: number = (i / 10) * Math.PI * 2 - Math.PI / 2;
                    const radius: number = i % 2 === 0 ? size : size * 0.5;
                    const px: number = Math.cos(angle) * radius;
                    const py: number = Math.sin(angle) * radius;
                    if(i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                break;
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
    
    public update(): boolean {
        let animating: boolean = false;
        if (this.swapping || this.falling) {
            const speed: number = 0.15;
            const deltaX: number = this.targetX - this.screenX;
            const deltaY: number = this.targetY - this.screenY;
            if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                this.screenX += deltaX * speed;
                this.screenY += deltaY * speed;
                animating = true;
            } else {
                this.screenX = this.targetX;
                this.screenY = this.targetY;
                this.swapping = false;
                this.falling = false;
            }
        }
        if (this.removing) {
            this.scale -= 0.1;
            if (this.scale <= 0) {
                return true; 
            }
            animating = true;
        }
        return animating;
    }
    
    public startSwapAnimation(targetX: number, targetY: number): void {
        this.targetX = targetX;
        this.targetY = targetY;
        this.swapping = true;
    }
    
    public startFallAnimation(targetY: number): void {
        this.targetY = targetY;
        this.falling = true;
    }
}

class Match3Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private grid: (GameItem | null)[][];
    private score: number;
    private selectedItem: Position | null;
    private isDragging: boolean;
    private dragStartX: number;
    private dragStartY: number;
    private isSwapping: boolean;
    private isAnimating: boolean;
    private scoreElement: HTMLElement | null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Unable to get 2D context from canvas');
        }
        this.ctx = context;
        this.grid = [];
        this.score = 0;
        this.selectedItem = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.isSwapping = false;
        this.isAnimating = false;
        this.scoreElement = document.getElementById('score');
        this.initGrid();
        this.setupEventListeners();
        this.gameLoop();
    }
        
    private initGrid(): void {
        this.grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                let type: number;
                do {
                    type = Math.floor(Math.random() * ITEM_TYPES);
                } while (this.wouldCreateMatch(x, y, type));
                this.grid[y][x] = new GameItem(type, x, y);
            }
        }
    }
        
    private wouldCreateMatch(x: number, y: number, type: number): boolean {
        let horizontalCount = 1;
        for (let i = x - 1; i >= 0; i--) {
            const item: GameItem | null = this.grid[y] && this.grid[y][i] ? this.grid[y][i] : null;
            if (item && item.type === type) {
                horizontalCount++;
            } else {
                break;
            }
        }
        for (let i = x + 1; i < GRID_SIZE; i++) {
            const item: GameItem | null = this.grid[y] && this.grid[y][i] ? this.grid[y][i] : null;
            if (item && item.type === type) {
                horizontalCount++;
            } else {
                break;
            }
        }
        if (horizontalCount >= 3) return true;
        let verticalCount = 1;
        for (let i = y - 1; i >= 0; i--) {
            const item: GameItem | null = this.grid[i] && this.grid[i][x] ? this.grid[i][x] : null;
            if (item && item.type === type) {
                verticalCount++;
            } else {
                break;
            }
        }
        for (let i = y + 1; i < GRID_SIZE; i++) {
            const item: GameItem | null = this.grid[i] && this.grid[i][x] ? this.grid[i][x] : null;
            if (item && item.type === type) {
                verticalCount++;
            } else {
                break;
            }
        }
        return verticalCount >= 3;
    }
        
    private setupEventListeners(): void {
        this.canvas.addEventListener('mousedown', (e: MouseEvent) => this.onMouseDown(e.clientX, e.clientY));
        this.canvas.addEventListener('mousemove', (e: MouseEvent) => this.onMouseMove(e.clientX, e.clientY));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
            if (e.touches.length > 0) {
                const t = e.touches[0];
                this.onMouseDown(t.clientX, t.clientY);
            }
        });
        this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
            if (e.touches.length > 0) {
                const t = e.touches[0];
                this.onMouseMove(t.clientX, t.clientY);
            }
        });
        this.canvas.addEventListener('touchend', () => this.onMouseUp());
    }
        
    private getGridPosition(clientX: number, clientY: number): Position {
        const rect: DOMRect = this.canvas.getBoundingClientRect();
        const x: number = Math.floor((clientX - rect.left) / CELL_SIZE);
        const y: number = Math.floor((clientY - rect.top) / CELL_SIZE);
        return { x, y };
    }
        
    private onMouseDown(clientX: number, clientY: number): void {
        if (this.isSwapping || this.isAnimating) return; 
        const pos: Position = this.getGridPosition(clientX, clientY);
        if (pos.x >= 0 && pos.x < GRID_SIZE && pos.y >= 0 && pos.y < GRID_SIZE) {
            this.selectedItem = { x: pos.x, y: pos.y };
            this.isDragging = true;
            this.dragStartX = clientX;
            this.dragStartY = clientY;
        }
    }
        
    private onMouseMove(clientX: number, clientY: number): void {
        if (!this.isDragging || !this.selectedItem || this.isSwapping || this.isAnimating) return;
        const deltaX: number = clientX - this.dragStartX;
        const deltaY: number = clientY - this.dragStartY;
        const threshold: number = 30;
        if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
            let targetX: number = this.selectedItem.x;
            let targetY: number = this.selectedItem.y;
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                targetX += deltaX > 0 ? 1 : -1;
            } else {
                targetY += deltaY > 0 ? 1 : -1;
            }
            if (targetX >= 0 && targetX < GRID_SIZE && targetY >= 0 && targetY < GRID_SIZE) {
                this.trySwap(this.selectedItem.x, this.selectedItem.y, targetX, targetY);
            }
            this.selectedItem = null;
            this.isDragging = false;
        }
    }
        
    private onMouseUp(): void {
        this.selectedItem = null;
        this.isDragging = false;
    }
        
    private trySwap(x1: number, y1: number, x2: number, y2: number): void {
        if (this.isSwapping || this.isAnimating) return;
        this.isSwapping = true;
        this.isAnimating = true;
        const item1: GameItem | null = this.grid[y1] && this.grid[y1][x1] ? this.grid[y1][x1] : null;
        const item2: GameItem | null = this.grid[y2] && this.grid[y2][x2] ? this.grid[y2][x2] : null;
        if (!item1 || !item2) {
            this.isSwapping = false;
            this.isAnimating = false;
            return;
        }
        item1.startSwapAnimation(x2 * CELL_SIZE + CELL_SIZE / 2, y2 * CELL_SIZE + CELL_SIZE / 2);
        item2.startSwapAnimation(x1 * CELL_SIZE + CELL_SIZE / 2, y1 * CELL_SIZE + CELL_SIZE / 2);
        this.grid[y1][x1] = item2;
        this.grid[y2][x2] = item1;
        item1.x = x2;
        item1.y = y2;
        item2.x = x1;
        item2.y = y1;
        setTimeout(() => {
            const matches: MatchPosition[] = this.findMatches();
            if (matches.length === 0) {
                item1.startSwapAnimation(x1 * CELL_SIZE + CELL_SIZE / 2, y1 * CELL_SIZE + CELL_SIZE / 2);
                item2.startSwapAnimation(x2 * CELL_SIZE + CELL_SIZE / 2, y2 * CELL_SIZE + CELL_SIZE / 2);
                this.grid[y1][x1] = item1;
                this.grid[y2][x2] = item2;
                item1.x = x1;
                item1.y = y1;
                item2.x = x2;
                item2.y = y2;
                setTimeout(() => {
                    this.isSwapping = false;
                    this.isAnimating = false;
                }, 300);
            } else {
                this.isSwapping = false;
                this.processMatches();
            }
        }, 300); 
    }
        
    private findMatches(): MatchPosition[] {
        const matches = new Set<string>();
        for (let y = 0; y < GRID_SIZE; y++) {
            let count: number = 1;
            const firstItem: GameItem | null = this.grid[y] && this.grid[y][0] ? this.grid[y][0] : null;
            let currentType: number = firstItem ? firstItem.type : -1;
            for (let x = 1; x < GRID_SIZE; x++) {
                const item: GameItem | null = this.grid[y] && this.grid[y][x] ? this.grid[y][x] : null;
                if (item && item.type === currentType && currentType !== -1) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let i = x - count; i < x; i++) {
                            matches.add(`${i},${y}`);
                        }
                    }
                    count = 1;
                    currentType = item ? item.type : -1;
                }
            }
            if (count >= 3) {
                for (let i = GRID_SIZE - count; i < GRID_SIZE; i++) {
                    matches.add(`${i},${y}`);
                }
            }
        }
        for (let x = 0; x < GRID_SIZE; x++) {
            let count: number = 1;
            const firstItem: GameItem | null = this.grid[0] && this.grid[0][x] ? this.grid[0][x] : null;
            let currentType: number = firstItem ? firstItem.type : -1;
            for (let y = 1; y < GRID_SIZE; y++) {
                const item: GameItem | null = this.grid[y] && this.grid[y][x] ? this.grid[y][x] : null;
                if (item && item.type === currentType && currentType !== -1) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let i = y - count; i < y; i++) {
                            matches.add(`${x},${i}`);
                        }
                    }
                    count = 1;
                    currentType = item ? item.type : -1;
                }
            }
            if (count >= 3) {
                for (let i = GRID_SIZE - count; i < GRID_SIZE; i++) {
                    matches.add(`${x},${i}`);
                }
            }
        }
        return Array.from(matches).map((pos: string): MatchPosition => {
            const [x, y] = pos.split(',').map(Number);
            return { x, y };
        });
    }
        
    private processMatches(): void {
        const matches: MatchPosition[] = this.findMatches();
        if (matches.length > 0) {
            matches.forEach((match: MatchPosition) => {
                const item: GameItem | null = this.grid[match.y] && this.grid[match.y][match.x] ? this.grid[match.y][match.x] : null;
                if (item) {
                    item.removing = true;
                    this.score += 10;
                }
            });
            setTimeout(() => {
                matches.forEach((match: MatchPosition) => {
                    if (this.grid[match.y]) {
                        this.grid[match.y][match.x] = null;
                    }
                });
                this.dropItems();
                this.updateScoreDisplay();
            }, 200);
        } else {
            this.checkAnimationsComplete();
        }
    }
    
    private updateScoreDisplay(): void {
        if (this.scoreElement) {
            this.scoreElement.textContent = this.score.toString();
        }
    }
        
    private dropItems(): void {
        let itemsDropped: boolean = false;
        for (let x = 0; x < GRID_SIZE; x++) {
            let writeIndex: number = GRID_SIZE - 1;
            for (let y = GRID_SIZE - 1; y >= 0; y--) {
                const currentItem: GameItem | null = this.grid[y] && this.grid[y][x] ? this.grid[y][x] : null;
                if (currentItem && !currentItem.removing) {
                    if (y !== writeIndex) {
                        this.grid[writeIndex][x] = currentItem;
                        this.grid[y][x] = null;
                        const item: GameItem | null = this.grid[writeIndex][x];
                        if (item) {
                            item.y = writeIndex;
                            item.startFallAnimation(writeIndex * CELL_SIZE + CELL_SIZE / 2);
                            itemsDropped = true;
                        }
                    }
                    writeIndex--;
                }
            }
            for (let y = writeIndex; y >= 0; y--) {
                const type: number = Math.floor(Math.random() * ITEM_TYPES);
                const item: GameItem = new GameItem(type, x, y);
                item.screenY = -CELL_SIZE;
                item.startFallAnimation(y * CELL_SIZE + CELL_SIZE / 2);
                this.grid[y][x] = item;
                itemsDropped = true;
            }
        }
        if (itemsDropped) {
            setTimeout(() => {
                this.processMatches();
            }, 500);
        } else {
            this.checkAnimationsComplete();
        }
    }
    
    private checkAnimationsComplete(): void {
        let hasActiveAnimations = false;
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const item: GameItem | null = this.grid[y] && this.grid[y][x] ? this.grid[y][x] : null;
                                if (item && (item.swapping || item.falling || item.removing)) {
                    hasActiveAnimations = true;
                    break;
                }
            }
        }
        if (!hasActiveAnimations) {
            this.isAnimating = false;
        } else {
            requestAnimationFrame(() => this.checkAnimationsComplete());
        }
    }

    private update(): void {
        let animating: boolean = false;
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const item: GameItem | null = this.grid[y] && this.grid[y][x] ? this.grid[y][x] : null;
                if (item) {
                    if (item.update()) {
                        animating = true;
                    }
                }
            }
        }
        this.isAnimating = animating;
    }

    private draw(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const item: GameItem | null = this.grid[y] && this.grid[y][x] ? this.grid[y][x] : null;
                if (item) {
                    item.draw(this.ctx);
                }
            }
        }
    }

    private gameLoop(): void {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

                   
