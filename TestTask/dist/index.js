"use strict";
var GRID_SIZE = 8;
var CELL_SIZE = 60;
var ITEM_TYPES = 5;
var COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
var SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star'];
var GameItem = /** @class */ (function () {
    function GameItem(type, x, y) {
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
    GameItem.prototype.draw = function (ctx) {
        ctx.save();
        ctx.translate(this.screenX, this.screenY);
        ctx.scale(this.scale, this.scale);
        ctx.fillStyle = COLORS[this.type] || '#ffffff';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        var size = 20;
        var shape = SHAPES[this.type] || 'circle';
        ctx.beginPath();
        switch (shape) {
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
                for (var i = 0; i < 10; i++) {
                    var angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
                    var radius = i % 2 === 0 ? size : size * 0.5;
                    var px = Math.cos(angle) * radius;
                    var py = Math.sin(angle) * radius;
                    if (i === 0)
                        ctx.moveTo(px, py);
                    else
                        ctx.lineTo(px, py);
                }
                ctx.closePath();
                break;
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    };
    GameItem.prototype.update = function () {
        var animating = false;
        if (this.swapping || this.falling) {
            var speed = 0.15;
            var deltaX = this.targetX - this.screenX;
            var deltaY = this.targetY - this.screenY;
            if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                this.screenX += deltaX * speed;
                this.screenY += deltaY * speed;
                animating = true;
            }
            else {
                this.screenX = this.targetX;
                this.screenY = this.targetY;
                this.swapping = false;
                this.falling = false;
            }
        }
        if (this.removing) {
            this.scale -= 0.1;
            if (this.scale <= 0) {
                return true; // Элемент готов к удалению
            }
            animating = true;
        }
        return animating;
    };
    GameItem.prototype.startSwapAnimation = function (targetX, targetY) {
        this.targetX = targetX;
        this.targetY = targetY;
        this.swapping = true;
    };
    GameItem.prototype.startFallAnimation = function (targetY) {
        this.targetY = targetY;
        this.falling = true;
    };
    return GameItem;
}());
var Match3Game = /** @class */ (function () {
    function Match3Game(canvas) {
        this.canvas = canvas;
        var context = canvas.getContext('2d');
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
    Match3Game.prototype.initGrid = function () {
        this.grid = Array(GRID_SIZE).fill(null).map(function () { return Array(GRID_SIZE).fill(null); });
        for (var y = 0; y < GRID_SIZE; y++) {
            for (var x = 0; x < GRID_SIZE; x++) {
                var type = void 0;
                do {
                    type = Math.floor(Math.random() * ITEM_TYPES);
                } while (this.wouldCreateMatch(x, y, type));
                this.grid[y][x] = new GameItem(type, x, y);
            }
        }
    };
    Match3Game.prototype.wouldCreateMatch = function (x, y, type) {
        var horizontalCount = 1;
        for (var i = x - 1; i >= 0; i--) {
            var item = this.grid[y] && this.grid[y][i] ? this.grid[y][i] : null;
            if (item && item.type === type) {
                horizontalCount++;
            }
            else {
                break;
            }
        }
        for (var i = x + 1; i < GRID_SIZE; i++) {
            var item = this.grid[y] && this.grid[y][i] ? this.grid[y][i] : null;
            if (item && item.type === type) {
                horizontalCount++;
            }
            else {
                break;
            }
        }
        if (horizontalCount >= 3)
            return true;
        var verticalCount = 1;
        for (var i = y - 1; i >= 0; i--) {
            var item = this.grid[i] && this.grid[i][x] ? this.grid[i][x] : null;
            if (item && item.type === type) {
                verticalCount++;
            }
            else {
                break;
            }
        }
        for (var i = y + 1; i < GRID_SIZE; i++) {
            var item = this.grid[i] && this.grid[i][x] ? this.grid[i][x] : null;
            if (item && item.type === type) {
                verticalCount++;
            }
            else {
                break;
            }
        }
        return verticalCount >= 3;
    };
    Match3Game.prototype.setupEventListeners = function () {
        var _this = this;
        this.canvas.addEventListener('mousedown', function (e) { return _this.onMouseDown(e); });
        this.canvas.addEventListener('mousemove', function (e) { return _this.onMouseMove(e); });
        this.canvas.addEventListener('mouseup', function (e) { return _this.onMouseUp(e); });
    };
    Match3Game.prototype.getGridPosition = function (clientX, clientY) {
        var rect = this.canvas.getBoundingClientRect();
        var x = Math.floor((clientX - rect.left) / CELL_SIZE);
        var y = Math.floor((clientY - rect.top) / CELL_SIZE);
        return { x: x, y: y };
    };
    Match3Game.prototype.onMouseDown = function (e) {
        if (this.isSwapping || this.isAnimating)
            return; // Блокируем ввод во время любой анимации
        var pos = this.getGridPosition(e.clientX, e.clientY);
        if (pos.x >= 0 && pos.x < GRID_SIZE && pos.y >= 0 && pos.y < GRID_SIZE) {
            this.selectedItem = { x: pos.x, y: pos.y };
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
        }
    };
    Match3Game.prototype.onMouseMove = function (e) {
        if (!this.isDragging || !this.selectedItem || this.isSwapping || this.isAnimating)
            return;
        var deltaX = e.clientX - this.dragStartX;
        var deltaY = e.clientY - this.dragStartY;
        var threshold = 30;
        if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
            var targetX = this.selectedItem.x;
            var targetY = this.selectedItem.y;
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                targetX += deltaX > 0 ? 1 : -1;
            }
            else {
                targetY += deltaY > 0 ? 1 : -1;
            }
            if (targetX >= 0 && targetX < GRID_SIZE && targetY >= 0 && targetY < GRID_SIZE) {
                this.trySwap(this.selectedItem.x, this.selectedItem.y, targetX, targetY);
            }
            this.selectedItem = null;
            this.isDragging = false;
        }
    };
    Match3Game.prototype.onMouseUp = function (e) {
        this.selectedItem = null;
        this.isDragging = false;
    };
    Match3Game.prototype.trySwap = function (x1, y1, x2, y2) {
        var _this = this;
        if (this.isSwapping || this.isAnimating)
            return;
        this.isSwapping = true;
        this.isAnimating = true;
        var item1 = this.grid[y1] && this.grid[y1][x1] ? this.grid[y1][x1] : null;
        var item2 = this.grid[y2] && this.grid[y2][x2] ? this.grid[y2][x2] : null;
        if (!item1 || !item2) {
            this.isSwapping = false;
            this.isAnimating = false;
            return;
        }
        item1.startSwapAnimation(x2 * CELL_SIZE + CELL_SIZE / 2, y2 * CELL_SIZE + CELL_SIZE / 2);
        item2.startSwapAnimation(x1 * CELL_SIZE + CELL_SIZE / 2, y1 * CELL_SIZE + CELL_SIZE / 2);
        this.grid[y1][x1] = item2;
        this.grid[y2][x2] = item1;
        // Обновляем логические позиции
        item1.x = x2;
        item1.y = y2;
        item2.x = x1;
        item2.y = y1;
        setTimeout(function () {
            var matches = _this.findMatches();
            if (matches.length === 0) {
                item1.startSwapAnimation(x1 * CELL_SIZE + CELL_SIZE / 2, y1 * CELL_SIZE + CELL_SIZE / 2);
                item2.startSwapAnimation(x2 * CELL_SIZE + CELL_SIZE / 2, y2 * CELL_SIZE + CELL_SIZE / 2);
                _this.grid[y1][x1] = item1;
                _this.grid[y2][x2] = item2;
                item1.x = x1;
                item1.y = y1;
                item2.x = x2;
                item2.y = y2;
                setTimeout(function () {
                    _this.isSwapping = false;
                    _this.isAnimating = false;
                }, 300);
            }
            else {
                _this.isSwapping = false;
                _this.processMatches();
            }
        }, 300);
    };
    Match3Game.prototype.findMatches = function () {
        var matches = new Set();
        for (var y = 0; y < GRID_SIZE; y++) {
            var count = 1;
            var firstItem = this.grid[y] && this.grid[y][0] ? this.grid[y][0] : null;
            var currentType = firstItem ? firstItem.type : -1;
            for (var x = 1; x < GRID_SIZE; x++) {
                var item = this.grid[y] && this.grid[y][x] ? this.grid[y][x] : null;
                if (item && item.type === currentType && currentType !== -1) {
                    count++;
                }
                else {
                    if (count >= 3) {
                        for (var i = x - count; i < x; i++) {
                            matches.add("".concat(i, ",").concat(y));
                        }
                    }
                    count = 1;
                    currentType = item ? item.type : -1;
                }
            }
            if (count >= 3) {
                for (var i = GRID_SIZE - count; i < GRID_SIZE; i++) {
                    matches.add("".concat(i, ",").concat(y));
                }
            }
        }
        for (var x = 0; x < GRID_SIZE; x++) {
            var count = 1;
            var firstItem = this.grid[0] && this.grid[0][x] ? this.grid[0][x] : null;
            var currentType = firstItem ? firstItem.type : -1;
            for (var y = 1; y < GRID_SIZE; y++) {
                var item = this.grid[y] && this.grid[y][x] ? this.grid[y][x] : null;
                if (item && item.type === currentType && currentType !== -1) {
                    count++;
                }
                else {
                    if (count >= 3) {
                        for (var i = y - count; i < y; i++) {
                            matches.add("".concat(x, ",").concat(i));
                        }
                    }
                    count = 1;
                    currentType = item ? item.type : -1;
                }
            }
            if (count >= 3) {
                for (var i = GRID_SIZE - count; i < GRID_SIZE; i++) {
                    matches.add("".concat(x, ",").concat(i));
                }
            }
        }
        return Array.from(matches).map(function (pos) {
            var _a = pos.split(',').map(Number), x = _a[0], y = _a[1];
            return { x: x, y: y };
        });
    };
    Match3Game.prototype.processMatches = function () {
        var _this = this;
        var matches = this.findMatches();
        if (matches.length > 0) {
            matches.forEach(function (match) {
                var item = _this.grid[match.y] && _this.grid[match.y][match.x] ? _this.grid[match.y][match.x] : null;
                if (item) {
                    item.removing = true;
                    _this.score += 10;
                }
            });
            setTimeout(function () {
                matches.forEach(function (match) {
                    if (_this.grid[match.y]) {
                        _this.grid[match.y][match.x] = null;
                    }
                });
                _this.dropItems();
                _this.updateScoreDisplay();
            }, 200);
        }
        else {
            this.checkAnimationsComplete();
        }
    };
    Match3Game.prototype.updateScoreDisplay = function () {
        if (this.scoreElement) {
            this.scoreElement.textContent = this.score.toString();
        }
    };
    Match3Game.prototype.dropItems = function () {
        var _this = this;
        var itemsDropped = false;
        for (var x = 0; x < GRID_SIZE; x++) {
            var writeIndex = GRID_SIZE - 1;
            for (var y = GRID_SIZE - 1; y >= 0; y--) {
                var currentItem = this.grid[y] && this.grid[y][x] ? this.grid[y][x] : null;
                if (currentItem && !currentItem.removing) {
                    if (y !== writeIndex) {
                        this.grid[writeIndex][x] = currentItem;
                        this.grid[y][x] = null;
                        var item = this.grid[writeIndex][x];
                        if (item) {
                            item.y = writeIndex;
                            item.startFallAnimation(writeIndex * CELL_SIZE + CELL_SIZE / 2);
                            itemsDropped = true;
                        }
                    }
                    writeIndex--;
                }
            }
            for (var y = writeIndex; y >= 0; y--) {
                var type = Math.floor(Math.random() * ITEM_TYPES);
                var item = new GameItem(type, x, y);
                item.screenY = -CELL_SIZE;
                item.startFallAnimation(y * CELL_SIZE + CELL_SIZE / 2);
                this.grid[y][x] = item;
                itemsDropped = true;
            }
        }
        if (itemsDropped) {
            setTimeout(function () {
                _this.processMatches();
            }, 500);
        }
        else {
            this.checkAnimationsComplete();
        }
    };
    Match3Game.prototype.checkAnimationsComplete = function () {
        var _this = this;
        var hasActiveAnimations = false;
        for (var y = 0; y < GRID_SIZE; y++) {
            for (var x = 0; x < GRID_SIZE; x++) {
                var item = this.grid[y] && this.grid[y][x] ? this.grid[y][x] : null;
                if (item && (item.swapping || item.falling || item.removing)) {
                    hasActiveAnimations = true;
                    break;
                }
            }
            if (hasActiveAnimations)
                break;
        }
        if (!hasActiveAnimations) {
            setTimeout(function () {
                _this.isAnimating = false;
            }, 100);
        }
        else {
            setTimeout(function () {
                _this.checkAnimationsComplete();
            }, 100);
        }
    };
    Match3Game.prototype.draw = function () {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        for (var x = 0; x <= GRID_SIZE; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * CELL_SIZE, 0);
            this.ctx.lineTo(x * CELL_SIZE, GRID_SIZE * CELL_SIZE);
            this.ctx.stroke();
        }
        for (var y = 0; y <= GRID_SIZE; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * CELL_SIZE);
            this.ctx.lineTo(GRID_SIZE * CELL_SIZE, y * CELL_SIZE);
            this.ctx.stroke();
        }
        for (var y = 0; y < GRID_SIZE; y++) {
            for (var x = 0; x < GRID_SIZE; x++) {
                var item = this.grid[y] && this.grid[y][x] ? this.grid[y][x] : null;
                if (item) {
                    item.draw(this.ctx);
                }
            }
        }
        if (this.selectedItem && !this.isSwapping && !this.isAnimating) {
            var x = this.selectedItem.x * CELL_SIZE;
            var y = this.selectedItem.y * CELL_SIZE;
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }
    };
    Match3Game.prototype.update = function () {
        for (var y = 0; y < GRID_SIZE; y++) {
            for (var x = 0; x < GRID_SIZE; x++) {
                var item = this.grid[y] && this.grid[y][x] ? this.grid[y][x] : null;
                if (item) {
                    var isAnimating = item.update();
                    if (item.scale <= 0) {
                        this.grid[y][x] = null;
                    }
                }
            }
        }
    };
    Match3Game.prototype.gameLoop = function () {
        var _this = this;
        this.update();
        this.draw();
        requestAnimationFrame(function () { return _this.gameLoop(); });
    };
    return Match3Game;
}());
var canvasElement = document.getElementById('gameCanvas');
if (canvasElement) {
    try {
        var game = new Match3Game(canvasElement);
    }
    catch (error) {
        console.error('Failed to initialize game:', error);
    }
}

else {
    console.error('Canvas element not found');
}
