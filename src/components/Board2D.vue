<template>
  <div class="board-2d-container">
    <div class="board-2d-frame">
      <div class="board-grid">
        <template v-for="r in rows" :key="'row-' + r">
          <div 
            v-for="c in cols" 
            :key="'sq-' + r + '-' + c"
            class="square"
            :class="[
              (r + c) % 2 === 0 ? 'light' : 'dark',
              { 
                'selected': isSelected(getSquareName(r, c)),
                'has-valid-move': getValidMove(getSquareName(r, c)),
                'has-capture-move': getValidMove(getSquareName(r, c))?.captured
              }
            ]"
            @click="handleSquareClick(getSquareName(r, c))"
          >
            <!-- Coordinate Labels on Board Edges -->
            <span v-if="shouldShowColLabel(r, c)" class="label-col">
              {{ 'abcdefgh'[c] }}
            </span>
            <span v-if="shouldShowRowLabel(r, c)" class="label-row">
              {{ 8 - r }}
            </span>

            <!-- Piece Token -->
            <div 
              v-if="getPieceAt(r, c)" 
              class="piece-token"
              :class="[getPieceAt(r, c)?.color]"
              :style="{ boxShadow: getGlowShadow(getPieceAt(r, c)?.type || '', getPieceAt(r, c)?.color || '') }"
            >
              <div class="piece-icon-wrapper" v-html="getPieceSvg(getPieceAt(r, c)?.type || '')"></div>
              <span class="character-name">{{ getPieceCharacterName(getPieceAt(r, c)?.type || '', getPieceAt(r, c)?.color || '') }}</span>
            </div>

            <!-- Valid Move Overlay Dot / Ring -->
            <div v-if="getValidMove(getSquareName(r, c))" class="move-indicator"></div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { GameManager } from '../engine/GameManager';

const props = defineProps<{
  manager: GameManager | null;
}>();

const gameStore = useGameStore();

const board = computed(() => gameStore.game.getBoard());

// Rows (ranks) 0 represents rank 8, 7 represents rank 1
const rows = computed(() => {
  const list = [0, 1, 2, 3, 4, 5, 6, 7];
  if (gameStore.playerColor === 'b') {
    return list.slice().reverse();
  }
  return list;
});

// Cols (files) 0 represents 'a', 7 represents 'h'
const cols = computed(() => {
  const list = [0, 1, 2, 3, 4, 5, 6, 7];
  if (gameStore.playerColor === 'b') {
    return list.slice().reverse();
  }
  return list;
});

const getSquareName = (r: number, c: number): string => {
  const files = 'abcdefgh';
  return `${files[c]}${8 - r}`;
};

const getPieceAt = (r: number, c: number) => {
  if (!board.value || !board.value[r]) return null;
  return board.value[r][c];
};

const isSelected = (squareName: string) => {
  return gameStore.selectedSquare === squareName;
};

const getValidMove = (squareName: string) => {
  return gameStore.validMoves.find(m => m.to === squareName);
};

// Handle clicks via the GameManager's 2D click action
const handleSquareClick = async (squareName: string) => {
  if (props.manager) {
    await props.manager.handle2DSquareClick(squareName);
  }
};

// Edge coordinate labels helper
const shouldShowColLabel = (r: number, c: number) => {
  // Show at the bottom of the board
  if (gameStore.playerColor === 'b') {
    return r === 0; // Rank 8 (raw row 0) is at the bottom when flipped
  }
  return r === 7; // Rank 1 (raw row 7) is at the bottom normally
};

const shouldShowRowLabel = (r: number, c: number) => {
  // Show on the left edge
  if (gameStore.playerColor === 'b') {
    return c === 7; // File 'h' (raw col 7) is on the left when flipped
  }
  return c === 0; // File 'a' (raw col 0) is on the left normally
};

// Standard highly detailed, clean minimalist SVGs
const SVG_ICONS: Record<string, string> = {
  p: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="7" r="3.25"/><path d="M12 11c-2.8 0-4 2.8-4 5.5h8c0-2.7-1.2-5.5-4-5.5zm-5 7h10v1.5H7V18z" stroke="currentColor" stroke-width="0.5"/></svg>`,
  r: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M5 4v3h1.5V5.5h3v2h3v-2h3v2h3v-2h1.5V4H5zm2 4.5h10V10H7V8.5zm1 3c-1.2 0-2 2-2 4h12c0-2-.8-4-2-4H8zm-1.5 5.5h11v2h-11v-2z" stroke="currentColor" stroke-width="0.5"/></svg>`,
  n: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19.5 11c-1.2-2.3-3.2-3.3-5-3.8.3-.7-.2-2.2-2.5-2.2-4 0-5.5 3.5-5.5 6.5 0 2.2 1.2 4.2 3 4.8V15c.5.5 1.5 1 2.5.5h-1c1-.8 2-1.8 2.5-3.2.3-1 .5-2 0-3.2.8.2 1.2.8 1.2 1.5 0 .8-.5 1.5-1 2.2-.2.3.2.8.8.5 1-1 1.8-2.2 1.5-3.8zM12 8.5c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7z" stroke="currentColor" stroke-width="0.5"/></svg>`,
  b: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="4.5" r="1.25"/><path d="M12 6.5c-2.2 0-3.5 2.2-3.5 5.2 0 1.8.8 3.2 1.8 4.2h3.4c1-1 1.8-2.4 1.8-4.2 0-3-1.3-5.2-3.5-5.2zm-2.5 11h5v1.8h-5v-1.8z" stroke="currentColor" stroke-width="0.5"/></svg>`,
  q: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="3.5" r="1"/><path d="M5.5 7.5l2.5 4.5 4-6 4 6 2.5-4.5v2c0 1.8-1.8 3.5-4.5 3.5h-5C6.8 13 5.5 11.3 5.5 9.5v-2zm1.5 8h10v1.8H7v-1.8z" stroke="currentColor" stroke-width="0.5"/></svg>`,
  k: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M11 2h2v1.5h1.5v2H13V7h-2V5.5H9.5v-2H11V2zm-5.5 6l2.5 2.5 4-3.5 4 3.5 2.5-2.5v2.5c0 1.8-1.3 3.5-4 3.5H9.5c-2.7 0-4-1.7-4-3.5V8zm1.5 8h10v1.8H7v-1.8z" stroke="currentColor" stroke-width="0.5"/></svg>`
};

const getPieceSvg = (type: string) => {
  return SVG_ICONS[type] || '';
};

// Canon character naming matching PieceRenderer.ts and AssetManager.ts
const PIECE_NAMES: Record<string, Record<string, string>> = {
  w: {
    k: 'Luffy',
    q: 'Nami',
    b: 'Zoro',
    n: 'Sanji',
    r: 'Jimbei',
    p: 'Franky'
  },
  b: {
    k: 'Sengoku',
    q: 'Akainu',
    b: 'Kuzan',
    n: 'Kizaru',
    r: 'Fujitora',
    p: 'Marine'
  }
};

const getPieceCharacterName = (type: string, color: string) => {
  return PIECE_NAMES[color]?.[type] || '';
};

// Elegant, ultra-vibrant colored shadows representing dynamic powers!
const GLOW_SHADOWS: Record<string, Record<string, string>> = {
  w: {
    k: '0 0 16px rgba(255, 60, 60, 0.95), inset 0 0 6px rgba(255, 60, 60, 0.5)',     // Luffy (Red fire)
    q: '0 0 16px rgba(255, 145, 0, 0.95), inset 0 0 6px rgba(255, 145, 0, 0.5)',     // Nami (Orange sky)
    b: '0 0 16px rgba(46, 213, 115, 0.95), inset 0 0 6px rgba(46, 213, 115, 0.5)',   // Zoro (Green swords)
    n: '0 0 16px rgba(255, 215, 0, 0.95), inset 0 0 6px rgba(255, 215, 0, 0.5)',     // Sanji (Yellow kick)
    r: '0 0 16px rgba(30, 144, 255, 0.95), inset 0 0 6px rgba(30, 144, 255, 0.5)',   // Jinbei (Ocean blue)
    p: '0 0 16px rgba(0, 240, 255, 0.95), inset 0 0 6px rgba(0, 240, 255, 0.5)'      // Franky (Cyan machine)
  },
  b: {
    k: '0 0 18px rgba(212, 175, 55, 0.95), inset 0 0 6px rgba(212, 175, 55, 0.6)',   // Sengoku (Bright Buddha gold)
    q: '0 0 18px rgba(220, 10, 10, 0.95), inset 0 0 6px rgba(220, 10, 10, 0.6)',     // Akainu (Lava crimson)
    b: '0 0 18px rgba(130, 224, 255, 0.95), inset 0 0 6px rgba(130, 224, 255, 0.6)', // Kuzan (Glacier ice teal)
    n: '0 0 18px rgba(255, 255, 90, 0.95), inset 0 0 6px rgba(255, 255, 90, 0.6)',   // Kizaru (Yellow laser light)
    r: '0 0 18px rgba(157, 112, 230, 0.95), inset 0 0 6px rgba(157, 112, 230, 0.6)', // Fujitora (Purple gravity)
    p: '0 0 8px rgba(176, 196, 222, 0.7), inset 0 0 3px rgba(176, 196, 222, 0.3)'    // Marine (Navy steel silver)
  }
};

const getGlowShadow = (type: string, color: string) => {
  return GLOW_SHADOWS[color]?.[type] || '';
};
</script>

<style scoped>
.board-2d-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  max-width: 620px;
  max-height: 620px;
  margin: 0 auto;
  box-sizing: border-box;
}

.board-2d-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: linear-gradient(135deg, #d4af37 0%, #aa8412 50%, #f1d592 100%);
  padding: 8px;
  border-radius: 16px;
  box-shadow: 0 15px 45px rgba(0, 0, 0, 0.65), 0 0 30px rgba(212, 175, 55, 0.25);
  box-sizing: border-box;
}

.board-grid {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  bottom: 8px;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  background: #03080e;
  border-radius: 10px;
  overflow: hidden;
}

.square {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-sizing: border-box;
}

/* Glassmorphism clear & dark ocean styling */
.square.light {
  background: rgba(226, 205, 161, 0.15);
  backdrop-filter: blur(8px);
}

.square.dark {
  background: rgba(10, 36, 68, 0.35);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.02);
}

.square:hover {
  background: rgba(212, 175, 55, 0.2);
}

/* Selected square glow ring */
.square.selected {
  outline: 3px solid #00d2ff !important;
  outline-offset: -3px;
  background: rgba(0, 210, 255, 0.15) !important;
  box-shadow: inset 0 0 15px rgba(0, 210, 255, 0.4);
  z-index: 2;
}

/* Move dots and target rings */
.move-indicator {
  width: 16px;
  height: 16px;
  background: rgba(46, 213, 115, 0.8);
  border-radius: 50%;
  pointer-events: none;
  box-shadow: 0 0 8px rgba(46, 213, 115, 0.6);
  z-index: 1;
}

.square.has-capture-move .move-indicator {
  width: 90%;
  height: 90%;
  background: transparent;
  border: 3px solid rgba(255, 71, 87, 0.9);
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(255, 71, 87, 0.6), inset 0 0 5px rgba(255, 71, 87, 0.3);
}

/* Coordinate labels styled small and gold */
.label-col {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 0.65rem;
  color: rgba(212, 175, 55, 0.6);
  font-family: 'Cinzel', serif;
  font-weight: bold;
  pointer-events: none;
}

.label-row {
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 0.65rem;
  color: rgba(212, 175, 55, 0.6);
  font-family: 'Cinzel', serif;
  font-weight: bold;
  pointer-events: none;
}

/* Piece token styled like premium metallic/carbon coin */
.piece-token {
  position: relative;
  width: 78%;
  height: 78%;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 3;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-sizing: border-box;
}

.piece-token:hover {
  transform: scale(1.1) translateY(-2px);
}

/* Straw Hat white pieces: Warm golden-ivory theme */
.piece-token.w {
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 40%, #c4a747 100%);
  border: 2px solid #d4af37;
  color: #1a0f00;
}

/* Marine black pieces: Dark slate-carbon theme */
.piece-token.b {
  background: linear-gradient(135deg, #2a3545 0%, #111823 45%, #050a12 100%);
  border: 2px solid rgba(212, 175, 55, 0.4);
  color: #ffffff;
}

.piece-icon-wrapper {
  width: 50%;
  height: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.piece-icon-wrapper :deep(svg) {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.3));
}

.piece-token.w .piece-icon-wrapper :deep(svg) {
  color: #2c1d0a;
}

.piece-token.b .piece-icon-wrapper :deep(svg) {
  color: #ffffff;
  filter: drop-shadow(0 0 6px rgba(255,255,255,0.4));
}

/* Beautiful micro label for character names */
.character-name {
  font-family: 'Cinzel', serif;
  font-size: 0.5rem;
  letter-spacing: 0.5px;
  margin-top: 1px;
  font-weight: 800;
  text-transform: uppercase;
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.85;
}

.piece-token.w .character-name {
  color: #4a3617;
}

.piece-token.b .character-name {
  color: #d4af37;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

/* Responsiveness overrides */
@media (max-width: 768px) {
  .piece-token {
    width: 82%;
    height: 82%;
  }
  .character-name {
    font-size: 0.45rem;
    letter-spacing: 0px;
  }
  .label-col, .label-row {
    font-size: 0.55rem;
  }
  .board-2d-frame {
    padding: 5px;
  }
  .board-grid {
    top: 5px;
    left: 5px;
    right: 5px;
    bottom: 5px;
  }
}
</style>
