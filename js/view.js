import { TILE, DIR } from './constants.js';

export class View {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.statusMsg = document.getElementById('statusMessage');
        this.charQueueEl = document.getElementById('charQueue');
        this.stageSelect = document.getElementById('stageSelect');
        this.stageLabel = document.getElementById('stageLabel');
        this.startBtn = document.getElementById('startBtn');
        this.prevStageBtn = document.getElementById('prevStageBtn');
        this.nextStageBtn = document.getElementById('nextStageBtn');
        this.slowBtn = document.getElementById('slow-btn');
        
        this.TILE_SIZE = 40;
        this.GRID_OFFSET_X = 0;
        this.GRID_OFFSET_Y = 0;
    }

    // キャンバスサイズの初期化
    initCanvas(mapData) {
        const mapCols = mapData[0].length;
        const mapRows = mapData.length;
        const margin = 40;
        this.canvas.width = mapCols * this.TILE_SIZE + margin * 2;
        this.canvas.height = mapRows * this.TILE_SIZE + margin * 2;
        this.GRID_OFFSET_X = margin;
        this.GRID_OFFSET_Y = margin;
    }
    renderStageList(stages) {
        this.stageSelect.innerHTML = ''; // 一旦空にする

        let customCount = 0;

        stages.forEach((stage, index) => {
            const option = document.createElement('option');
            option.value = index;
            
            // 表示名の設定
            if (stage.id === 999) {
                customCount++;
                option.text = `Custom ${customCount}`; // カスタムステージの場合
            } else {
                option.text = `Stage ${index + 1}`;
            }
            
            this.stageSelect.appendChild(option);
        });
    }

    // ステージ情報の表示更新
    updateStageInfo(index, total, stageId) {
        // プルダウンの選択位置を合わせる
        this.stageSelect.value = index;

        // ボタンの有効/無効切り替え
        this.prevStageBtn.disabled = (index === 0);
        this.nextStageBtn.disabled = (index === total - 1);
    }

    updateStatus(text, isClear = null, isRunning = false) {
        this.statusMsg.innerText = text;
        if (isClear === true) {
            this.statusMsg.style.backgroundColor = '#d1fae5';
            this.statusMsg.style.color = '#065f46';
        } else if (isClear === false) {
            this.statusMsg.style.backgroundColor = '#fee2e2';
            this.statusMsg.style.color = '#991b1b';
        } else {
            this.statusMsg.style.backgroundColor = '#e0f2fe';
            this.statusMsg.style.color = '#0284c7';
        }
        this.startBtn.disabled = isRunning || (isClear !== null); // クリア/失敗時または実行中は無効
    }

    updateCharQueue(characters, placedCount) {
        this.charQueueEl.innerHTML = ''; 
        characters.forEach((dir, index) => {
            const div = document.createElement('div');
            div.className = 'queue-item';
            
            let arrow = '';
            if (dir === DIR.UP) arrow = '⬆️';
            else if (dir === DIR.DOWN) arrow = '⬇️';
            else if (dir === DIR.LEFT) arrow = '⬅️';
            else if (dir === DIR.RIGHT) arrow = '➡️';

            div.innerText = `${index + 1}: ${arrow}`;

            if (index < placedCount) {
                div.classList.add('done');
            } else if (index === placedCount) {
                div.classList.add('active');
            }
            this.charQueueEl.appendChild(div);
        });
    }

    enableStartBtn(enable) {
        this.startBtn.disabled = !enable;
    }

    updateSlowBtn(isSlow) {
        if (isSlow) {
            this.slowBtn.innerText = "🐢 スロー中";
            this.slowBtn.classList.add('active');
        } else {
            this.slowBtn.innerText = "🐢 スロー";
            this.slowBtn.classList.remove('active');
        }
    }

    // 座標変換ヘルパー
    getGridFromScreen(mouseX, mouseY) {
        const rect = this.canvas.getBoundingClientRect();
        
        // ★追加: 表示サイズ(rect)と本来のサイズ(this.canvas)の比率を計算
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        // ★変更: マウス座標にスケール倍率を掛けて、本来の座標に戻す
        // (mouseX - rect.left) は「画面上の見た目の座標」
        // それに scaleX を掛けることで「キャンバス内部の座標」に変換します
        const internalX = (mouseX - rect.left) * scaleX;
        const internalY = (mouseY - rect.top) * scaleY;

        const x = Math.floor((internalX - this.GRID_OFFSET_X) / this.TILE_SIZE);
        const y = Math.floor((internalY - this.GRID_OFFSET_Y) / this.TILE_SIZE);
        
        return { x, y };
    }

    // --- 描画メイン ---
    draw(gameData, tweenValue = 1.0) {
        const { mapData, objects, items, players, state } = gameData;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. 地形 & オブジェクト
        for (let y = 0; y < mapData.length; y++) {
            for (let x = 0; x < mapData[y].length; x++) {
                const tile = mapData[y][x];
                const px = this.GRID_OFFSET_X + x * this.TILE_SIZE;
                const py = this.GRID_OFFSET_Y + y * this.TILE_SIZE;

                if (tile === TILE.NONE) continue;

                if (tile === TILE.MOVING_FLOOR) {
                    const movingRider = players.find(p => p.x === x && p.y === y && p.isMovingWithFloor);
                    if (movingRider) {
                        continue; 
                    }
                }

                // 床
                this.ctx.fillStyle = ((x + y) % 2 === 0) ? '#f5deb3' : '#deb887';
                this.ctx.fillRect(px, py, this.TILE_SIZE, this.TILE_SIZE);
            
                if (tile === TILE.FLOWER) {
                    this.drawEmoji(px, py, '🌱'); 
                } 
                else if (tile === TILE.ARROW) {
                    const obj = objects.find(o => o.x === x && o.y === y);
                    this.drawArrowTile(px, py, obj);
                }
                else if (tile === TILE.WARP) {
                    const obj = objects.find(o => o.x === x && o.y === y);
                    this.drawWarpTile(px, py, obj);
                }
                else if (tile === TILE.GLASS) {
                    const obj = objects.find(o => o.x === x && o.y === y);
                    this.drawGlassTile(px, py, obj);
                }
                else if (tile === TILE.SPRING) {
                    this.drawSpringTile(px, py);
                }
                else if (tile === TILE.SWITCH) {
                    const obj = objects.find(o => o.x === x && o.y === y);
                    this.drawSwitchTile(px, py, obj);
                }
                else if (tile === TILE.MOVING_FLOOR) { 
                    // 上でスキップされなかった（誰も乗っていない、または歩いて乗っただけの）床を描画
                    this.drawMovingFloor(px, py, null);
                }
                else if (tile === TILE.DRAGON) {
                    const obj = objects.find(o => o.x === x && o.y === y);
                    this.drawDragon(px, py, obj);
                }
                else if (tile === TILE.FIRE_BUTTON) {
                    const obj = objects.find(o => o.x === x && o.y === y);
                    this.drawFireButton(px, py, obj);
                }
                else if (tile === TILE.BLOOM_FLOWER) {
                    this.drawEmoji(px, py, '🌷'); 
                } 
            }
        }
        this.drawMovingFloorGuides(gameData);

        // 2. アイテム
        items.forEach(it => {
            const px = this.GRID_OFFSET_X + it.x * this.TILE_SIZE;
            const py = this.GRID_OFFSET_Y + it.y * this.TILE_SIZE;
            if (it.type === 'can') this.drawEmoji(px, py, '💧');
        });
        this.drawActiveFire(gameData);
        // 3. プレイヤー
        const sortedPlayers = [...players].sort((a, b) => a.y - b.y);

        sortedPlayers.forEach(p => {
            if (p.justWarped) return;
            
            let drawX = p.x;
            let drawY = p.y;

            // 通常の1マス移動かどうか
            const dist = Math.abs(p.x - p.prevX) + Math.abs(p.y - p.prevY);
            
            if ((dist <= 1) && state === 'RUN') {
                const prevX = (p.prevX !== undefined) ? p.prevX : p.x;
                const prevY = (p.prevY !== undefined) ? p.prevY : p.y;

                drawX = prevX + (p.x - prevX) * tweenValue;
                drawY = prevY + (p.y - prevY) * tweenValue;

                // ★★★ ジャンプのアニメーション処理 ★★★
                const jumpHeight = 0.8; 
                
                if (p.isJumping) {
                    // 【前半: 上昇】 (Spring -> 空中)
                    // sin(0 〜 π/2) = 0 〜 1
                    const angle = tweenValue * (Math.PI / 2);
                    drawY -= Math.sin(angle) * jumpHeight;
                } 
                else if (p.prevIsJumping) {
                    // 【後半: 下降】 (空中 -> 着地)
                    // sin(π/2 〜 π) = 1 〜 0
                    const angle = (Math.PI / 2) + (tweenValue * (Math.PI / 2));
                    drawY -= Math.sin(angle) * jumpHeight;
                }
            }

            const px = this.GRID_OFFSET_X + drawX * this.TILE_SIZE;
            const py = this.GRID_OFFSET_Y + drawY * this.TILE_SIZE;
            if (p.isMovingWithFloor) {
                this.drawMovingFloor(px, py, p.dir);
            }
            
            this.drawDeformedChar(px, py, p.dir, state); 
            
            if (p.hasCan) this.drawEmoji(px, py - 25, '💧');
        });
    }
    

    // 矢印床の描画
    drawArrowTile(px, py, obj) {
        if (!obj || obj.type !== 'arrow' || !obj.dir) return;
        
        let angle = 0;
        const d = obj.dir;
        if (d === 'UP' || (d.y === -1)) angle = 0;
        else if (d === 'RIGHT' || (d.x === 1)) angle = Math.PI / 2;
        else if (d === 'DOWN' || (d.y === 1)) angle = Math.PI;
        else if (d === 'LEFT' || (d.x === -1)) angle = -Math.PI / 2;

        const cx = px + this.TILE_SIZE / 2;
        const cy = py + this.TILE_SIZE / 2;

        this.ctx.save();
        this.ctx.translate(cx, cy);

        // オレンジパネル
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(-this.TILE_SIZE/2 + 2, -this.TILE_SIZE/2 + 4, this.TILE_SIZE - 4, this.TILE_SIZE - 4);
        this.ctx.fillStyle = '#e67e22';
        this.ctx.fillRect(-this.TILE_SIZE/2 + 2, -this.TILE_SIZE/2 + 2, this.TILE_SIZE - 4, this.TILE_SIZE - 6);

        // ネジ
        this.ctx.fillStyle = '#a04000';
        const screwOffset = this.TILE_SIZE / 2 - 6;
        [[1,1], [1,-1], [-1,1], [-1,-1]].forEach(([sx, sy]) => {
            this.ctx.beginPath();
            this.ctx.arc(sx * screwOffset, sy * screwOffset - 2, 2, 0, Math.PI*2);
            this.ctx.fill();
        });

        // 中央の円
        if (obj.isHighlighted) {
            this.ctx.fillStyle = '#fff176'; // 黄色
            this.ctx.shadowColor = '#fff176';
            this.ctx.shadowBlur = 10; // 少し光らせる
        } else {
            this.ctx.fillStyle = '#fff'; // 白
            this.ctx.shadowBlur = 0;
        }

        this.ctx.beginPath();
        this.ctx.arc(0, -1, this.TILE_SIZE / 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 枠線
        this.ctx.shadowBlur = 0; // 影リセット
        this.ctx.strokeStyle = '#f39c12';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // 矢印
        this.ctx.rotate(angle);
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.strokeStyle = '#c0392b';
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        this.ctx.moveTo(0, -10);
        this.ctx.lineTo(8, -2);
        this.ctx.lineTo(4, -2);
        this.ctx.lineTo(4, 8);
        this.ctx.lineTo(-4, 8);
        this.ctx.lineTo(-4, -2);
        this.ctx.lineTo(-8, -2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.restore();
    }

    // ワープ床の描画
    drawWarpTile(px, py, obj) {
        if (!obj || obj.type !== 'warp') return;

        // obj.color があれば使い、なければデフォルトでピンクにする
        const baseColor = obj.color || '#FF1493'; 

        // 方向に基づいて回転角度を決定
        let angle = 0;
        if (obj.dir) {
            const d = obj.dir;
            if (d === 'UP' || d.y === -1) angle = -Math.PI / 2;
            else if (d === 'RIGHT' || d.x === 1) angle = 0;
            else if (d === 'DOWN' || d.y === 1) angle = Math.PI / 2;
            else if (d === 'LEFT' || d.x === -1) angle = Math.PI;
        }

        const cx = px + this.TILE_SIZE / 2;
        const cy = py + this.TILE_SIZE / 2;
        const radius = this.TILE_SIZE / 2 - 6;

        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.rotate(angle);

        // --- 1. 背景のガラス面（globalAlphaで透明化） ---
        this.ctx.save(); // 色設定の一時保存
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius - 2, 0, Math.PI * 2);
        
        this.ctx.fillStyle = baseColor; // ベースの色をセット
        this.ctx.globalAlpha = 0.5;     // ★Canvasの機能で透明度を40%にする
        
        this.ctx.fill();
        this.ctx.restore(); // 透明度設定を元に戻す

        // --- 2. 本体フレーム（C型） ---
        const startAngle = Math.PI / 5;
        const endAngle = -Math.PI / 5;

        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, startAngle, endAngle, false);
        
        this.ctx.strokeStyle = baseColor; // 線の色
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        
        // ★Canvasの機能で発光させる（同じ色を影として使うと光って見える）
        this.ctx.shadowColor = baseColor; 
        this.ctx.shadowBlur = 15;         
        
        this.ctx.stroke();
        
        this.ctx.shadowBlur = 0; // 影をリセット

        // --- 3. 入り口の強調 ---
        const dotRadius = 2.5;
        const tip1X = Math.cos(startAngle) * radius;
        const tip1Y = Math.sin(startAngle) * radius;
        const tip2X = Math.cos(endAngle) * radius;
        const tip2Y = Math.sin(endAngle) * radius;

        this.ctx.fillStyle = baseColor; // 点の色
        this.ctx.beginPath();
        this.ctx.arc(tip1X, tip1Y, dotRadius, 0, Math.PI * 2);
        this.ctx.arc(tip2X, tip2Y, dotRadius, 0, Math.PI * 2);
        
        this.ctx.shadowColor = baseColor;
        this.ctx.shadowBlur = 8;
        
        this.ctx.fill();

        this.ctx.restore();
    }

    drawGlassTile(px, py, obj) {
        if (!obj) return;

        // isSafe が false なら「ヒビが入っている」とみなす
        const isCracked = (obj.isSafe === false);

        const cx = px + this.TILE_SIZE / 2;
        const cy = py + this.TILE_SIZE / 2;
        
        this.ctx.save();
        
        // 1. ガラスのベース
        this.ctx.fillStyle = "rgba(135, 206, 250, 0.4)";
        this.ctx.fillRect(px, py, this.TILE_SIZE, this.TILE_SIZE);
        
        // 2. ガラスの枠
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(px + 2, py + 2, this.TILE_SIZE - 4, this.TILE_SIZE - 4);

        // 3. ヒビの描画（isSafe: false の時だけ描画）
        if (isCracked) {
            this.ctx.translate(cx, cy);
            this.ctx.beginPath();
            
            // 白く目立つヒビ
            this.ctx.strokeStyle = "rgba(255, 255, 255, 0.9)"; 
            this.ctx.lineWidth = 2;
            
            // バツ印のようなヒビ
            this.ctx.moveTo(-10, -10);
            this.ctx.lineTo(10, 10);
            this.ctx.moveTo(10, -10);
            this.ctx.lineTo(-10, 10);
            
            this.ctx.stroke();
        }

        this.ctx.restore();
    }
    // ジャンプ台の描画
    drawSpringTile(px, py) {
        const cx = px + this.TILE_SIZE / 2;
        const cy = py + this.TILE_SIZE / 2;

        this.ctx.save();
        this.ctx.translate(cx, cy);

        // 1. 土台 (ピンクの板)
        this.ctx.fillStyle = '#e91e63'; // 濃いピンク
        this.ctx.beginPath();
        // 楕円: ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle)
        this.ctx.ellipse(0, 12, 16, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 2. バネ (グレーのグルグル)
        this.ctx.strokeStyle = '#bdc3c7'; // シルバーっぽいグレー
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        
        // 下から上へ3回くらい巻く
        for (let i = 0; i < 3; i++) {
            const coilY = 8 - (i * 6);
            this.ctx.ellipse(0, coilY, 6, 3, 0, 0, Math.PI * 2);
        }
        this.ctx.stroke();

        // 3. 上面のターゲット (ピンク・白・ピンク)
        const topY = -8; // 少し上に配置
        
        // 外側のピンク
        this.ctx.fillStyle = '#ff69b4'; // HotPink
        this.ctx.beginPath();
        this.ctx.ellipse(0, topY, 16, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 内側の白
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.ellipse(0, topY, 10, 5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 中心のピンク
        this.ctx.fillStyle = '#ff69b4';
        this.ctx.beginPath();
        this.ctx.ellipse(0, topY, 4, 2, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }
    
    drawSwitchTile(px, py, obj) {
        const cx = px + this.TILE_SIZE / 2;
        const cy = py + this.TILE_SIZE / 2;
        
        // 押されているかどうか
        const isPressed = obj ? obj.isPressed : false;

        this.ctx.save();
        this.ctx.translate(cx, cy);

        // 1. 土台 (茶色の四角)
        this.ctx.fillStyle = '#8B4513'; // SaddleBrown
        // 下の方に配置
        this.ctx.fillRect(-16, 5, 32, 12); 

        // 2. ボタン本体 (円筒形)
        // 押されていたら低くする（Y座標を下げる）
        const buttonY = isPressed ? 8 : 0; 
        const buttonHeight = isPressed ? 4 : 10;
        
        // 側面 (暗い黄色)
        this.ctx.fillStyle = isPressed ? '#B8860B' : '#DAA520';
        this.ctx.beginPath();
        this.ctx.ellipse(0, buttonY + buttonHeight, 14, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillRect(-14, buttonY, 28, buttonHeight);

        // 上面 (明るい黄色 - 画像1のようなゴールド感)
        this.ctx.fillStyle = isPressed ? '#DAA520' : '#FFD700'; // Gold
        this.ctx.beginPath();
        this.ctx.ellipse(0, buttonY, 14, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 側面の枠線
        this.ctx.strokeStyle = '#B8860B';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // 3. マーク (画像2の赤い両矢印)
        // 押されていたら少し暗くする
        this.ctx.strokeStyle = isPressed ? '#8B0000' : '#FF4500'; // OrangeRed
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // ボタンの上面に合わせて変形・移動
        this.ctx.translate(0, buttonY);
        this.ctx.scale(1, 0.5); // 楕円に合わせて縦を潰す

        this.ctx.beginPath();
        // 左矢印の先端
        this.ctx.moveTo(-8, 2);
        this.ctx.lineTo(-10, -2);
        this.ctx.lineTo(-5, -2);
        // アーチ (二次ベジェ曲線)
        this.ctx.quadraticCurveTo(0, -8, 5, -2);
        // 右矢印の先端
        this.ctx.lineTo(10, -2);
        this.ctx.lineTo(8, 2);
        this.ctx.stroke();

        this.ctx.restore();
    }
    drawMovingFloor(px, py, riderDir) {
        const cx = px + this.TILE_SIZE / 2;
        const cy = py + this.TILE_SIZE / 2;
    
        this.ctx.save();
        this.ctx.translate(cx, cy);
    
        // 1. ベースの床（少しメカニカルなグレー）
        this.ctx.fillStyle = '#bdc3c7'; 
        this.ctx.fillRect(-this.TILE_SIZE/2, -this.TILE_SIZE/2, this.TILE_SIZE, this.TILE_SIZE);
        
        // 2. 四辺のオレンジ矢頭 (▲)
        const arrowSize = 6;
        const offset = this.TILE_SIZE / 2 - 2;
    
        this.ctx.fillStyle = '#e67e22'; // Orange
        
        // 4方向のループ (0, 90, 180, 270度回転)
        for(let i=0; i<4; i++) {
            this.ctx.save();
            this.ctx.rotate((Math.PI / 2) * i);
            this.ctx.beginPath();
            this.ctx.moveTo(0, -offset - arrowSize); // 外側
            this.ctx.lineTo(arrowSize, -offset);     // 右下
            this.ctx.lineTo(-arrowSize, -offset);    // 左下
            this.ctx.fill();
            this.ctx.restore();
        }
    
        // 3. 内側の装飾（正方形の枠）
        this.ctx.strokeStyle = '#7f8c8d';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-10, -10, 20, 20);
    
        this.ctx.restore();
    }

    drawMovingFloorGuides(gameData) {
        const { mapData, players } = gameData;
    
        // マップ上のすべての平行移動床を探す
        for (let y = 0; y < mapData.length; y++) {
            for (let x = 0; x < mapData[y].length; x++) {
                if (mapData[y][x] === TILE.MOVING_FLOOR) {
                    
                    // この床に乗っているプレイヤーがいるか？
                    const rider = players.find(p => p.x === x && p.y === y);
    
                    // 調査する方向リスト
                    let checkDirs = [];
                    if (rider) {
                        // 乗っている時: 進行方向 と その反対 のみ
                        checkDirs.push(rider.dir);
                        checkDirs.push({ x: -rider.dir.x, y: -rider.dir.y });
                    } else {
                        // 誰もいない時: 全4方向
                        if (y > 0 && mapData[y - 1][x] !== TILE.NONE) {
                            checkDirs.push(DIR.DOWN);
                        }
                        // 下を確認 (y+1) -> 穴じゃなければ、上へ
                        if (y < mapData.length - 1 && mapData[y + 1][x] !== TILE.NONE) {
                            checkDirs.push(DIR.UP);
                        }
                        // 左を確認 (x-1) -> 穴じゃなければ、右へ
                        if (x > 0 && mapData[y][x - 1] !== TILE.NONE) {
                            checkDirs.push(DIR.RIGHT);
                        }
                        // 右を確認 (x+1) -> 穴じゃなければ、左へ
                        if (x < mapData[0].length - 1 && mapData[y][x + 1] !== TILE.NONE) {
                            checkDirs.push(DIR.LEFT);
                        }
                        
                    }
    
                    // 各方向について、穴が続く限り緑の丸を描く
                    checkDirs.forEach(d => {
                        let dist = 1;
                        while (true) {
                            const tx = x + d.x * dist;
                            const ty = y + d.y * dist;
    
                            // 画面外チェック
                            if (ty < 0 || ty >= mapData.length || tx < 0 || tx >= mapData[0].length) break;
    
                            const targetTile = mapData[ty][tx];
    
                            // 穴 (NONE) の上ならガイドを描画して次へ
                            if (targetTile === TILE.NONE) {

                                
                                const px = this.GRID_OFFSET_X + tx * this.TILE_SIZE;
                                const py = this.GRID_OFFSET_Y + ty * this.TILE_SIZE;
                                
                                // 薄い緑の丸
                                this.ctx.fillStyle = 'rgba(46, 204, 113, 0.5)'; // 緑、半透明
                                this.ctx.beginPath();
                                this.ctx.arc(px + this.TILE_SIZE/2, py + this.TILE_SIZE/2, 6, 0, Math.PI*2);
                                this.ctx.fill();
                                
                                dist++;
                            } else {
                                // 穴以外（床や壁）にぶつかったら終了
                                break;
                            }
                        }
                    });
                }
            }
        }
    }

    drawDeformedChar(px, py, dir, gameState) {
        const cx = px + this.TILE_SIZE / 2;
        const cy = py + this.TILE_SIZE / 2;
        const yOffset = cy;

        this.ctx.save();
        this.ctx.translate(cx, yOffset);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2.5;
        this.ctx.fillStyle = '#fff';
        if (dir === DIR.LEFT) this.ctx.scale(-1, 1);

        // 体
        this.ctx.beginPath();
        this.ctx.moveTo(-7, 0); 
        this.ctx.bezierCurveTo(-10, 12, 10, 12, 7, 0); 
        this.ctx.fill(); this.ctx.stroke();

        // 足
        this.ctx.beginPath();
        // roundRect ではなく rect を使用
        this.ctx.rect(-7, 10, 5, 6); 
        this.ctx.rect(2, 10, 5, 6);  
        this.ctx.fill(); 
        this.ctx.stroke();

        // 手
        this.ctx.beginPath();
        if (dir === DIR.LEFT || dir === DIR.RIGHT) {
            this.ctx.ellipse(0, 5, 2.5, 5, 0, 0, Math.PI*2);
        } else {
            this.ctx.ellipse(-9, 4, 2.5, 5, 0.2, 0, Math.PI*2); 
            this.ctx.ellipse(9, 4, 2.5, 5, -0.2, 0, Math.PI*2);
        }
        this.ctx.fill(); this.ctx.stroke();

        // 頭
        this.ctx.beginPath();
        this.ctx.arc(0, -10, 14, 0, Math.PI * 2);
        this.ctx.fill(); this.ctx.stroke();

        // 目
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        const eyeY = -10;
        const eyeX = 4; 
        if (dir === DIR.DOWN) {
            this.ctx.arc(-eyeX, eyeY, 1.5, 0, Math.PI*2);
            this.ctx.arc(eyeX, eyeY, 1.5, 0, Math.PI*2);
        } else if (dir !== DIR.UP) {
            this.ctx.arc(9, eyeY, 1.5, 0, Math.PI*2);
        }
        this.ctx.fill();
        this.ctx.restore();

        if (gameState === 'EDIT') {
            this.ctx.fillStyle = '#000';
            this.ctx.font = 'bold 40px Arial'; 
            this.ctx.textAlign = 'center';
            let label = '';
            if (dir === DIR.UP) label = '↑';
            else if (dir === DIR.RIGHT) label = '→';
            else if (dir === DIR.DOWN) label = '↓';
            else if (dir === DIR.LEFT) label = '←';
            this.ctx.fillText(label, cx, yOffset - 25); 
        }
    }
    drawDragon(px, py, obj) {
        if (!obj) return;
        const cx = px + this.TILE_SIZE / 2;
        const cy = py + this.TILE_SIZE / 2;
        
        // 向きの角度計算
        let angle = 0;
        const d = obj.dir;
        if (d === 'UP' || (d && d.y === -1)) angle = 0;
        else if (d === 'RIGHT' || (d && d.x === 1)) angle = Math.PI / 2;
        else if (d === 'DOWN' || (d && d.y === 1)) angle = Math.PI;
        else if (d === 'LEFT' || (d && d.x === -1)) angle = -Math.PI / 2;

        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.rotate(angle);

        // 1. 石の土台 (四角いブロック)
        this.ctx.fillStyle = '#7f8c8d'; // 濃いグレー
        this.ctx.fillRect(-16, -14, 32, 28);
        
        // 石の質感（ハイライト）
        this.ctx.strokeStyle = '#95a5a6';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-16, -14, 32, 28);

        // 2. 頭部 (少し前に出っ張る)
        this.ctx.fillStyle = '#95a5a6'; // 明るいグレー
        this.ctx.fillRect(-10, -18, 20, 18);
        this.ctx.strokeRect(-10, -18, 20, 18);

        // 3. 目 (常に黒)
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(-5, -12, 2, 0, Math.PI * 2); // 左目
        this.ctx.arc(5, -12, 2, 0, Math.PI * 2);  // 右目
        this.ctx.fill();

        // 4. 鼻先 (さらに前へ)
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.fillRect(-6, -22, 12, 6);

        this.ctx.restore();
    }

    // 解除ボタンの描画
    drawFireButton(px, py, obj) {
        if (!obj) return;
        const cx = px + this.TILE_SIZE / 2;
        const cy = py + this.TILE_SIZE / 2;
        const isPressed = obj.isPressed;
        
        // ★変更点1: ボタン本体の色は objects の color を使う (指定なしなら赤)
        const btnColor = obj.color || '#e74c3c';

        // ★変更点2: 土台(Base)の色を「床に近い茶色」にする
        // 床(#f5deb3, #deb887)より少し濃い木目色などを設定
        const baseColor = '#cd853f';    // Peru (少し明るい茶色)
        const baseTopColor = '#a0522d'; // Sienna (影になる面)

        this.ctx.save();
        this.ctx.translate(cx, cy);

        // 1. 高い台座 (茶色に変更)
        this.ctx.fillStyle = baseTopColor; // 側面/影
        this.ctx.fillRect(-16, -8, 32, 24); 
        
        this.ctx.fillStyle = baseColor;    // 上面
        this.ctx.fillRect(-16, -14, 32, 12);
        
        // 2. ボタン本体 (指定された色で描画)
        const pressOffset = isPressed ? 4 : 0;
        
        // 側面/影 (指定色を少し暗くする)
        this.ctx.fillStyle = this.adjustColor(btnColor, -40);
        this.ctx.beginPath();
        this.ctx.ellipse(0, -6 + pressOffset, 12, 5, 0, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.fillRect(-12, -12 + pressOffset, 24, 6);

        // 上面 (指定色)
        this.ctx.fillStyle = btnColor;
        this.ctx.beginPath();
        this.ctx.ellipse(0, -12 + pressOffset, 12, 5, 0, 0, Math.PI*2);
        this.ctx.fill();

        this.ctx.restore();
    }

    //  炎の描画
    drawActiveFire(gameData) {
        if (typeof gameData.calculateFireTiles !== 'function') return;
        const fireTiles = gameData.calculateFireTiles();

        fireTiles.forEach(tile => {
            const px = this.GRID_OFFSET_X + tile.x * this.TILE_SIZE;
            const py = this.GRID_OFFSET_Y + tile.y * this.TILE_SIZE;
            const cx = px + this.TILE_SIZE / 2;
            const cy = py + this.TILE_SIZE / 2;

            let angle = 0;
            if (tile.dir.y === -1) angle = 0;
            else if (tile.dir.x === 1) angle = Math.PI / 2;
            else if (tile.dir.y === 1) angle = Math.PI;
            else if (tile.dir.x === -1) angle = -Math.PI / 2;

            this.ctx.save();
            this.ctx.translate(cx, cy);
            this.ctx.rotate(angle);

            // ★変更点1: 色はオブジェクトの指定色を使う (game.jsで渡されている前提)
            const baseColor = tile.color || '#FF4500';

            // ★変更点2: 幅をもっと細くする (0.3倍くらい)
            const w = this.TILE_SIZE * 0.3; 
            
            // 根本から先端まで。隣のセルと繋がるように少し長め(overlap)にする
            // 先端(isTip)の場合はそこまで伸ばさず丸める
            let h = this.TILE_SIZE + 8; 

            // グラデーション作成
            const grad = this.ctx.createLinearGradient(-w/2, 0, w/2, 0);
            grad.addColorStop(0, baseColor); 
            grad.addColorStop(0.5, '#FFFFFF'); // 中心は熱く白
            grad.addColorStop(1, baseColor);

            this.ctx.fillStyle = grad;
            this.ctx.globalAlpha = 0.9; 

            this.ctx.beginPath();

            // ★変更点3: 形状を描画 (先端を丸める)
            if (tile.isTip) {
                // 先端の場合：カプセルの片側のような形
                // 根本側(-h/2)からスタート
                this.ctx.moveTo(-w/2, h/2); 
                this.ctx.lineTo(-w/2, -h/2 + w); // 先端手前まで直線を引く
                
                // 先端を丸く閉じる (半円)
                // arc(x, y, r, startAngle, endAngle)
                this.ctx.arc(0, -h/2 + w, w/2, Math.PI, 0);
                
                this.ctx.lineTo(w/2, h/2); // 根本側へ戻る
            } else {
                // 途中(Tip以外)の場合：単純な長方形でつなぐ
                this.ctx.rect(-w/2, -h/2, w, h);
            }
            
            // 根本側の処理（スタート地点なら丸く、そうでなければ四角くつなぐ）
            if (tile.isStart) {
                 // スタート地点（ドラゴンの口元）は少し丸くしておくときれい
                 this.ctx.fill(); 
                 // 必要ならここにarcを追加してもよいですが、口の中に隠れるのでfillRectのままでもOK
            } else {
                 this.ctx.fill();
            }

            // 発光エフェクト
            this.ctx.shadowColor = baseColor;
            this.ctx.shadowBlur = 15;
            this.ctx.fill();

            this.ctx.restore();
        });
    }
    adjustColor(color, amount) {
        let usePound = false;
        if (color[0] == "#") {
            color = color.slice(1);
            usePound = true;
        }
        let num = parseInt(color, 16);
        let r = (num >> 16) + amount;
        if (r > 255) r = 255; else if (r < 0) r = 0;
        let b = ((num >> 8) & 0x00FF) + amount;
        if (b > 255) b = 255; else if (b < 0) b = 0;
        let g = (num & 0x0000FF) + amount;
        if (g > 255) g = 255; else if (g < 0) g = 0;
        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
    }

    drawEmoji(x, y, char) {
        const cx = x + this.TILE_SIZE / 2;
        const cy = y + this.TILE_SIZE / 2;
        this.ctx.save();
        this.ctx.globalAlpha = 1.0;
        this.ctx.font = '34px Arial'; 
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(char, cx, cy + 2); 
        this.ctx.restore(); 
    }
}