// js/constants.js
// ■ マップID（地形のベースのみ）
export const TILE = {
  EMPTY: 0,//普通の床
  NONE: 1,//穴
  FLOWER: 2,//花壇、花
  ARROW: 3,//矢印床
  WARP: 4,//ワープゲート
  GLASS: 5,//ガラス床
  SPRING: 6,//ジャンプ台
  SWITCH: 7,//矢印反転床
  MOVING_FLOOR: 8,//平行移動床
  BLOOM_FLOWER: 9,//咲いた花
  DRAGON: 10,      // ドラゴン石像
  FIRE_BUTTON: 11  // 解除ボタン
};

export const OBJ_TYPE = {
  ARROW: 'arrow',
  WARP: 'warp',
  GLASS: 'glass', // ★ 追加：オブジェクトのタイプ名
  SWITCH: 'switch',
};

// ■ アイテムの種類（拾えるもの）
export const ITEM_TYPE = {
  CAN: 'can'      // じょうろ
};

// ■ 方向定義
export const DIR = {
  UP:    { x: 0, y: -1, label:"↑"},
  RIGHT: { x: 1, y: 0, label:"→"},
  DOWN:  { x: 0, y: 1, label: "↓"},
  LEFT:  { x: -1, y: 0, label: "←"}
};