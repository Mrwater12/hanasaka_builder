import { TILE, DIR } from './constants.js';
import { View } from './view.js';

// エディタ設定
const MAX_SIZE = 30;
const MIN_SIZE = 5;
const COLORS = ['#ff4d4d', '#4d4dff', '#2ecc71', '#f1c40f', '#e67e22', '#9b59b6', '#1abc9c', '#e91e63'];

class Editor {
    constructor() {
        this.view = new View(); 
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // エディタの状態
        this.mapCols = 10;
        this.mapRows = 10;
        this.mapData = [];
        this.objects = [];
        this.items = [];
        this.characters = []; 
        
        // JSON出力用のキャラクターリスト
        this.roster = [ "UP" ]; 

        this.selectedTool = { type: 'tile', id: TILE.EMPTY }; 
        this.selectedColor = COLORS[0];
        this.isPainting = false;
        this.lastInputGrid = null;

        this.initMap();
        this.initTools();
        this.setupEvents();
        this.renderRoster(); 
        
        this.drawLoop();
    }

    initMap() {
        this.mapData = [];
        for (let y = 0; y < this.mapRows; y++) {
            const row = [];
            for (let x = 0; x < this.mapCols; x++) row.push(TILE.EMPTY);
            this.mapData.push(row);
        }
        this.view.initCanvas(this.mapData);
        this.updateInfo();
    }

    initTools() {
        const tools = [
            { cat: 'terrain', label: '床', type: 'tile', id: TILE.EMPTY },
            { cat: 'terrain', label: '穴', type: 'tile', id: TILE.NONE },
            { cat: 'terrain', label: '花 (ゴール)', type: 'tile', id: TILE.FLOWER },
            
            { cat: 'object', label: '矢印床', type: 'obj', id: TILE.ARROW, objType: 'arrow' },
            { cat: 'object', label: 'ワープ', type: 'obj', id: TILE.WARP, objType: 'warp', hasColor: true },
            { cat: 'object', label: 'ガラス(安全)', type: 'obj', id: TILE.GLASS, objType: 'glass', props: { isSafe: true } },
            { cat: 'object', label: 'ガラス(割れ)', type: 'obj', id: TILE.GLASS, objType: 'glass', props: { isSafe: false } },
            { cat: 'object', label: 'ジャンプ台', type: 'tile', id: TILE.SPRING },
            { cat: 'object', label: 'スイッチ', type: 'obj', id: TILE.SWITCH, objType: 'switch' },
            { cat: 'object', label: '平行移動床', type: 'tile', id: TILE.MOVING_FLOOR },
            { cat: 'object', label: 'ドラゴン', type: 'obj', id: TILE.DRAGON, objType: 'dragon', hasColor: true, props: { isActive: true } },
            { cat: 'object', label: '解除ボタン', type: 'obj', id: TILE.FIRE_BUTTON, objType: 'fire_button', hasColor: true },

            { cat: 'item', label: 'じょうろ', type: 'item', itemType: 'can' },

            // マップ配置用
            { cat: 'char', label: '配置用(↑)', type: 'char', dir: DIR.UP },
            { cat: 'char', label: '配置用(→)', type: 'char', dir: DIR.RIGHT },
            { cat: 'char', label: '配置用(↓)', type: 'char', dir: DIR.DOWN },
            { cat: 'char', label: '配置用(←)', type: 'char', dir: DIR.LEFT },
        ];

        tools.forEach(t => {
            const container = document.getElementById(`tools-${t.cat}`);
            if (!container) return;

            const btn = document.createElement('div');
            btn.className = 'tool-btn';
            btn.onclick = () => this.selectTool(t, btn);
            
            const cvs = document.createElement('canvas');
            cvs.width = 40; cvs.height = 40;
            const ctx = cvs.getContext('2d');
            
            this.drawToolPreview(ctx, t);
            
            btn.appendChild(cvs);
            container.appendChild(btn);
        });

        const palette = document.getElementById('color-palette');
        COLORS.forEach(c => {
            const chip = document.createElement('div');
            chip.className = 'color-chip';
            chip.style.backgroundColor = c;
            chip.onclick = () => {
                this.selectedColor = c;
                this.updateColorPaletteUI();
            };
            chip.dataset.color = c;
            palette.appendChild(chip);
        });
        
        this.selectTool(tools[0], document.querySelector('.tool-btn'));
    }

    drawToolPreview(ctx, tool) {
        if (tool.cat !== 'terrain' || tool.id !== TILE.NONE) {
            ctx.fillStyle = '#f5deb3';
            ctx.fillRect(0,0,40,40);
        }

        const dummyObj = { type: tool.objType, x:0, y:0, dir: DIR.UP, color: COLORS[0], isSafe: true, isActive: true, ...tool.props };
        
        const originalCtx = this.view.ctx;
        const originalOffX = this.view.GRID_OFFSET_X;
        const originalOffY = this.view.GRID_OFFSET_Y;

        this.view.ctx = ctx;
        this.view.GRID_OFFSET_X = 0;
        this.view.GRID_OFFSET_Y = 0;
        
        try {
            if (tool.type === 'tile' || tool.type === 'obj') {
                if (tool.id === TILE.FLOWER) this.view.drawEmoji(0,0,'🌷');
                else if (tool.id === TILE.ARROW) this.view.drawArrowTile(0,0,dummyObj);
                else if (tool.id === TILE.WARP) this.view.drawWarpTile(0,0,dummyObj);
                else if (tool.id === TILE.GLASS) this.view.drawGlassTile(0,0,dummyObj);
                else if (tool.id === TILE.SPRING) this.view.drawSpringTile(0,0);
                else if (tool.id === TILE.SWITCH) this.view.drawSwitchTile(0,0,dummyObj);
                else if (tool.id === TILE.MOVING_FLOOR) this.view.drawMovingFloor(0,0,null);
                else if (tool.id === TILE.DRAGON) this.view.drawDragon(0,0,dummyObj);
                else if (tool.id === TILE.FIRE_BUTTON) this.view.drawFireButton(0,0,dummyObj);
            } else if (tool.type === 'item') {
                this.view.drawEmoji(0,0,'💧');
            } else if (tool.type === 'char') {
                this.view.drawDeformedChar(0,0, tool.dir, 'EDIT');
            }
        } catch (e) {
            console.error("Preview draw error:", e);
        }

        this.view.ctx = originalCtx;
        this.view.GRID_OFFSET_X = originalOffX;
        this.view.GRID_OFFSET_Y = originalOffY;
    }

    setupEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            this.isPainting = true;
            this.handleInput(e);
        });
        window.addEventListener('mousemove', (e) => {
            if (this.isPainting) this.handleInput(e);
        });
        window.addEventListener('mouseup', () => this.isPainting = false);
        
        this.canvas.addEventListener('touchstart', (e) => {
            this.isPainting = true;
            this.handleInput(e);
            e.preventDefault(); 
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            if (this.isPainting) this.handleInput(e);
            e.preventDefault(); 
        }, { passive: false });

        window.addEventListener('touchend', () => this.isPainting = false);

        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.handleRotateFromEvent(e);
        });

        document.getElementById('btn-rotate-canvas').addEventListener('click', () => {
            if (this.lastInputGrid) {
               this.rotateObjectAt(this.lastInputGrid.x, this.lastInputGrid.y);
            } else {
               alert("回転させたいものを先にタッチしてください");
            }
        });

        document.getElementById('btn-resize-h-inc').onclick = () => this.resizeMap(0, 1);
        document.getElementById('btn-resize-h-dec').onclick = () => this.resizeMap(0, -1);
        document.getElementById('btn-resize-w-inc').onclick = () => this.resizeMap(1, 0);
        document.getElementById('btn-resize-w-dec').onclick = () => this.resizeMap(-1, 0);

        document.getElementById('btn-validate').onclick = () => this.generateJSON();

        document.getElementById('btn-add-char').onclick = () => {
            this.roster.push("UP");
            this.renderRoster();
            this.updateInfo();
        };

        // スマホ用メニュー開閉
        const propToggle = document.getElementById('prop-toggle-btn');
        const propBar = document.getElementById('property-bar');
        if(propToggle) {
            propToggle.onclick = () => {
                propBar.classList.toggle('expanded');
                if (propBar.classList.contains('expanded')) {
                    propToggle.innerText = "⚙️ MENU / VALIDATION ▼";
                } else {
                    propToggle.innerText = "⚙️ MENU / VALIDATION ▲";
                }
            };
        }
    }

    renderRoster() {
        const container = document.getElementById('char-list-container');
        container.innerHTML = '';

        this.roster.forEach((dir, index) => {
            const div = document.createElement('div');
            div.className = 'char-item';
            
            const label = document.createElement('span');
            label.innerText = `Player ${index + 1}`;
            
            const select = document.createElement('select');
            select.className = 'char-dir-select';
            ['UP', 'RIGHT', 'DOWN', 'LEFT'].forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.text = d;
                if (d === dir) opt.selected = true;
                select.appendChild(opt);
            });
            
            select.onchange = (e) => {
                this.roster[index] = e.target.value;
                this.updateInfo();
            };

            const delBtn = document.createElement('button');
            delBtn.className = 'btn-remove-char';
            delBtn.innerText = '×';
            delBtn.onclick = () => {
                this.roster.splice(index, 1);
                this.renderRoster();
                this.updateInfo();
            };

            div.appendChild(label);
            div.appendChild(select);
            div.appendChild(delBtn);
            container.appendChild(div);
        });
    }

    selectTool(tool, btnElement) {
        this.selectedTool = tool;
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        if(btnElement) btnElement.classList.add('active');
        document.getElementById('selectedToolDisplay').innerText = `Tool: ${tool.label}`;

        const panel = document.getElementById('color-panel');
        if (tool.hasColor) {
            panel.style.display = 'block';
            this.updateColorPaletteUI();
        } else {
            panel.style.display = 'none';
        }
    }

    updateColorPaletteUI() {
        const type = this.selectedTool.objType;
        const usedColors = this.objects
            .filter(o => o.type === type)
            .map(o => o.color);

        document.querySelectorAll('.color-chip').forEach(chip => {
            const color = chip.dataset.color;
            chip.classList.remove('selected', 'disabled');
            
            if (color === this.selectedColor) chip.classList.add('selected');
            
            if (type !== 'warp' && usedColors.includes(color)) {
                chip.classList.add('disabled');
            }
        });
    }

    handleInput(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const internalX = (clientX - rect.left) * scaleX;
        const internalY = (clientY - rect.top) * scaleY;
        const x = Math.floor((internalX - this.view.GRID_OFFSET_X) / this.view.TILE_SIZE);
        const y = Math.floor((internalY - this.view.GRID_OFFSET_Y) / this.view.TILE_SIZE);

        if (x < 0 || x >= this.mapCols || y < 0 || y >= this.mapRows) return;

        this.lastInputGrid = { x, y }; 
        this.placeAt(x, y);
    }

    handleRotateFromEvent(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const internalX = (e.clientX - rect.left) * scaleX;
        const internalY = (e.clientY - rect.top) * scaleY;
        const x = Math.floor((internalX - this.view.GRID_OFFSET_X) / this.view.TILE_SIZE);
        const y = Math.floor((internalY - this.view.GRID_OFFSET_Y) / this.view.TILE_SIZE);
        
        this.rotateObjectAt(x, y);
    }

    rotateObjectAt(x, y) {
        if (x < 0 || x >= this.mapCols || y < 0 || y >= this.mapRows) return;

        const obj = this.objects.find(o => o.x === x && o.y === y);
        const char = this.characters.find(c => c.x === x && c.y === y);

        if (obj && obj.dir) {
            obj.dir = this.rotateDir(obj.dir);
        } else if (char) {
            char.dir = this.rotateDir(char.dir);
        }
    }

    rotateDir(currentDir) {
        if (currentDir === DIR.UP) return DIR.RIGHT;
        if (currentDir === DIR.RIGHT) return DIR.DOWN;
        if (currentDir === DIR.DOWN) return DIR.LEFT;
        if (currentDir === DIR.LEFT) return DIR.UP;
        return DIR.UP;
    }

    placeAt(x, y) {
        const tool = this.selectedTool;

        if (tool.type !== 'item' && tool.type !== 'char') {
            this.removeObjectAt(x, y);
            this.mapData[y][x] = TILE.EMPTY;
        }

        const fireTiles = this.latecalcuFireTiles();
        const isFire = fireTiles.some(f => f.x === x && f.y === y);

        if (tool.type === 'item') {
            const tile = this.mapData[y][x];
            const allowed = [TILE.EMPTY, TILE.ARROW, TILE.GLASS, TILE.MOVING_FLOOR];
            if (!allowed.includes(tile)) return;
            if (isFire) return;
            
            this.items = this.items.filter(i => i.x !== x || i.y !== y);
            this.items.push({ type: tool.itemType, x, y });

        } else if (tool.type === 'char') {
             const tile = this.mapData[y][x];
             if ([TILE.NONE, TILE.FLOWER, TILE.SWITCH, TILE.DRAGON, TILE.FIRE_BUTTON].includes(tile)) return;
             if (isFire) return;

             this.characters = this.characters.filter(c => c.x !== x || c.y !== y);
             this.characters.push({ x, y, dir: tool.dir });

        } else if (tool.type === 'tile') {
            this.mapData[y][x] = tool.id;
            this.cleanUpAt(x, y);

        } else if (tool.type === 'obj') {
            this.mapData[y][x] = tool.id;
            const newObj = {
                type: tool.objType,
                x, y,
                dir: DIR.UP,
                ...tool.props 
            };
            
            if (tool.hasColor) {
                if (tool.objType !== 'warp') {
                    const exists = this.objects.find(o => o.type === tool.objType && o.color === this.selectedColor);
                    if (exists) return;
                }
                newObj.color = this.selectedColor;
            }
            if (tool.objType === 'arrow') newObj.dir = DIR.DOWN; 
            
            this.objects.push(newObj);
            this.cleanUpAt(x, y);
        }
        
        this.updateInfo();
    }

    removeObjectAt(x, y) {
        this.objects = this.objects.filter(o => o.x !== x || o.y !== y);
        this.items = this.items.filter(i => i.x !== x || i.y !== y);
        this.characters = this.characters.filter(c => c.x !== x || c.y !== y);
    }

    cleanUpAt(x, y) {
        const tile = this.mapData[y][x];
        if (tile === TILE.NONE || tile === TILE.FLOWER) {
            this.items = this.items.filter(i => i.x !== x || i.y !== y);
            this.characters = this.characters.filter(c => c.x !== x || c.y !== y);
        }
    }

    resizeMap(dx, dy) {
        const newCols = this.mapCols + dx;
        const newRows = this.mapRows + dy;
        if (newCols < MIN_SIZE || newCols > MAX_SIZE) return;
        if (newRows < MIN_SIZE || newRows > MAX_SIZE) return;

        if (dx > 0) {
            this.mapData.forEach(row => row.push(TILE.EMPTY));
        } else if (dx < 0) {
            this.mapData.forEach(row => row.pop());
            this.removeOutOfBounds(newCols, this.mapRows);
        }

        if (dy > 0) {
            const row = Array(newCols).fill(TILE.EMPTY);
            this.mapData.push(row);
        } else if (dy < 0) {
            this.mapData.pop();
            this.removeOutOfBounds(newCols, newRows);
        }

        this.mapCols = newCols;
        this.mapRows = newRows;
        this.view.initCanvas(this.mapData);
        document.getElementById('mapSizeDisplay').innerText = `${newCols} x ${newRows}`;
        this.updateInfo(); 
    }

    removeOutOfBounds(w, h) {
        this.objects = this.objects.filter(o => o.x < w && o.y < h);
        this.items = this.items.filter(i => i.x < w && i.y < h);
        this.characters = this.characters.filter(c => c.x < w && c.y < h);
    }

    drawLoop() {
        const mockGame = {
            mapData: this.mapData,
            objects: this.objects,
            items: this.items,
            players: this.characters.map(c => ({
                ...c,
                prevX: c.x, prevY: c.y, 
                hasCan: false,
                isJumping: false, isMovingWithFloor: false
            })),
            state: 'RUN', 
            calculateFireTiles: () => this.calculateFireTiles() 
        };

        this.view.draw(mockGame, 1.0);
        requestAnimationFrame(() => this.drawLoop());
    }

    calculateFireTiles() {
        const fireTiles = [];
        const dragons = this.objects.filter(o => o.type === 'dragon' && o.isActive);

        dragons.forEach(d => {
            let dx = 0, dy = 0;
            const dir = d.dir;
            if (dir === DIR.UP || dir.y === -1) { dx = 0; dy = -1; }
            else if (dir === DIR.RIGHT || dir.x === 1) { dx = 1; dy = 0; }
            else if (dir === DIR.DOWN || dir.y === 1) { dx = 0; dy = 1; }
            else if (dir === DIR.LEFT || dir.x === -1) { dx = -1; dy = 0; }

            for (let i = 1; i <= 3; i++) {
                const tx = d.x + dx * i;
                const ty = d.y + dy * i;
                if (ty < 0 || ty >= this.mapRows || tx < 0 || tx >= this.mapCols) break;

                const tile = this.mapData[ty][tx];
                if ([TILE.WARP, TILE.SPRING, TILE.DRAGON, TILE.FIRE_BUTTON].includes(tile)) break;

                fireTiles.push({ 
                    x: tx, y: ty, 
                    color: d.color || 'red', 
                    dir: {x:dx, y:dy}, 
                    isStart: (i === 1), isTip: (i === 3) 
                });
            }
        });
        return fireTiles;
    }

    updateInfo() {
        let flowers = 0;
        this.mapData.forEach(row => row.forEach(t => { if(t === TILE.FLOWER) flowers++; }));
        
        const switches = this.objects.filter(o => o.type === 'switch').length;
        const buttons = this.objects.filter(o => o.type === 'fire_button').length;
        const cans = this.items.length;
        const rosterCount = this.roster.length; 

        // 1. 花の数 == じょうろの数
        const canCheck = (cans === flowers);
        
        // 2. キャラの数 == じょうろ + スイッチ + ボタン
        const requiredChars = cans + switches + buttons;
        const charCheck = (rosterCount === requiredChars);

        document.getElementById('val-flower').innerText = flowers;
        document.getElementById('val-switch').innerText = switches;
        document.getElementById('val-button').innerText = buttons;
        
        document.getElementById('val-real-can').innerText = cans;
        document.getElementById('val-real-can').className = canCheck ? 'status-val ok' : 'status-val ng';
        document.getElementById('msg-can').innerText = canCheck ? "OK" : `Must be ${flowers} cans (Same as flowers)`;

        document.getElementById('val-calc-char').innerText = requiredChars;
        document.getElementById('val-list-char').innerText = rosterCount;
        document.getElementById('val-list-char').className = charCheck ? 'status-val ok' : 'status-val ng';
        document.getElementById('msg-char').innerText = charCheck ? "OK" : `Must be ${requiredChars} chars (Cans+Switch+Btn)`;
    }

    generateJSON() {
        this.updateInfo();
        const flowers = this.mapData.flat().filter(t => t === TILE.FLOWER).length;
        const switches = this.objects.filter(o => o.type === 'switch').length;
        const buttons = this.objects.filter(o => o.type === 'fire_button').length;
        const cans = this.items.length;
        const rosterCount = this.roster.length;

        if (cans !== flowers) {
            alert(`完成できません！\nじょうろの数は花の数と同じにしてください。\n現在: ${cans}, 必要: ${flowers}`);
            return;
        }

        const reqChars = cans + switches + buttons;
        if (rosterCount !== reqChars) {
            alert(`完成できません！\nキャラの数が計算と合いません。\n必要数: ${reqChars} (じょうろ+スイッチ+解除ボタン)`);
            return;
        }

        const dragons = this.objects.filter(o => o.type === 'dragon');
        const fButtons = this.objects.filter(o => o.type === 'fire_button');
        const colors = new Set([...dragons.map(o=>o.color), ...fButtons.map(o=>o.color)]);
        for(let c of colors) {
            const dCount = dragons.filter(o=>o.color === c).length;
            const bCount = fButtons.filter(o=>o.color === c).length;
            if (dCount !== bCount) {
                alert(`完成できません！\nドラゴンと解除ボタンの数が一致しません (色: ${c})`);
                return;
            }
        }
        
        const warps = this.objects.filter(o => o.type === 'warp');
        const wColors = new Set(warps.map(o=>o.color));
        for(let c of wColors) {
            const count = warps.filter(o=>o.color === c).length;
            if (count !== 2) {
                alert(`完成できません！\nワープ(${c})は必ずペア(2個)で置いてください。現在: ${count}個`);
                return;
            }
        }

        const cleanObjects = this.objects.map(o => {
            const copy = { ...o };
            if (copy.dir) {
                if (copy.dir === DIR.UP) copy.dir = "UP";
                else if (copy.dir === DIR.RIGHT) copy.dir = "RIGHT";
                else if (copy.dir === DIR.DOWN) copy.dir = "DOWN";
                else if (copy.dir === DIR.LEFT) copy.dir = "LEFT";
            }
            return copy;
        });

        const data = {
            map: this.mapData,
            objects: cleanObjects,
            items: this.items,
            characters: this.roster 
        };

        let jsonStr = JSON.stringify(data, null, 2);

        // 圧縮処理
        jsonStr = jsonStr.replace(/\[\s*([\d,\s]+?)\s*\]/g, (match, content) => {
            return '[' + content.replace(/\s+/g, '').replace(/,/g, ', ') + ']';
        });
        jsonStr = jsonStr.replace(/\{\s*([^{}]+?)\s*\}/g, (match, content) => {
            return '{ ' + content.replace(/\s+/g, ' ').trim() + ' }';
        });
        
        // ★ モード判定と characters の定数化
        const format = document.querySelector('input[name="format"]:checked').value;
        if (format === 'js') {
            jsonStr = jsonStr.replace(/"(\w+)":/g, '$1:');
            
            // ★ characters配列の中身を DIR.xxx に変換
            jsonStr = jsonStr.replace(/(characters:\s*\[[\s\S]*?\])/, (match) => {
                return match.replace(/"(UP|DOWN|LEFT|RIGHT)"/g, 'DIR.$1');
            });
        }
        
        document.getElementById('json-output').value = jsonStr;
        
        navigator.clipboard.writeText(jsonStr).then(() => {
            alert("コードをコピーしました！");
        });
    }
}

// 起動
window.editor = new Editor();
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-validate');
    if(btn) btn.onclick = () => window.editor.generateJSON();
    window.editor.updateInfo();
});