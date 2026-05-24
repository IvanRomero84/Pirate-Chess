<template>
  <div class="game-container">
    <!-- 2D Board Overlay -->
    <Board2D 
      v-if="gameStore.viewMode === '2d'" 
      :manager="(manager as any)"
      class="board-2d-overlay"
    />

    <!-- 3D Canvas -->
    <canvas 
      v-show="gameStore.viewMode === '3d'" 
      ref="renderCanvas" 
      class="render-canvas"
    ></canvas>
    
    <!-- UI Overlay -->
    <div class="ui-overlay">
      <div class="hud-top">
        <div class="player-profile left" :class="{ active: gameStore.status.turn === 'w' }">
          <img src="../assets/textures/luffy.png" class="portrait" />
          <div class="player-info">
            <span class="name">Straw Hats</span>
            <div class="captured-pieces">
              <span v-for="p in blackCaptured" :key="p" class="piece-icon">{{ p }}</span>
            </div>
          </div>
        </div>

        <div class="game-center">
          <h1>Grand Line</h1>
          <div class="timer">{{ formattedTime }}</div>
        </div>

        <div class="player-profile right" :class="{ active: gameStore.status.turn === 'b' }">
          <div class="player-info">
            <span class="name">The Marines</span>
            <div class="captured-pieces">
              <span v-for="p in whiteCaptured" :key="p" class="piece-icon">{{ p }}</span>
            </div>
          </div>
          <img src="../assets/textures/marines.png" class="portrait" />
        </div>
      </div>

      <Transition name="fade">
        <div class="game-status-overlay" v-if="gameStore.status.isGameOver">
          <div class="game-over-content">
            <h2 class="outcome-title">{{ gameStore.status.winner === 'w' ? 'Straw Hat Crew Wins!' : 'The Marines Prevail!' }}</h2>
            <div class="outcome-decoration"></div>
            <p class="outcome-subtitle">The King of the Pirates has been decided.</p>
            <div class="game-over-actions">
              <button @click="handleNewVoyage" class="btn-epic">New Voyage</button>
              <button @click="handleBack" class="btn-ghost">Return to Menu</button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Float Action Controls (2D/3D & Chat Toggle) -->
      <div class="action-controls-bar">
        <div class="toggle-group-premium">
          <button 
            class="btn-toggle-view" 
            :class="{ active: gameStore.viewMode === '2d' }" 
            @click="gameStore.setViewMode('2d')"
            title="Vista 2D"
          >
            <Grid class="icon-ctrl" />
            <span>2D</span>
          </button>
          <button 
            class="btn-toggle-view" 
            :class="{ active: gameStore.viewMode === '3d' }" 
            @click="gameStore.setViewMode('3d')"
            :disabled="!!gameStore.engineError"
            title="Vista 3D"
          >
            <Rotate3d class="icon-ctrl" />
            <span>3D</span>
          </button>
        </div>

        <button 
          class="btn-toggle-chat-bubble" 
          :class="{ 'chat-open': gameStore.chatExpanded }"
          @click="gameStore.toggleChat"
          title="Chat de Batalla"
        >
          <MessageSquare v-if="gameStore.chatExpanded" class="icon-ctrl" />
          <MessageSquareOff v-else class="icon-ctrl" />
          <span 
            v-if="!gameStore.chatExpanded && gameStore.unreadMessages > 0" 
            class="unread-badge animate-pulse"
          >
            {{ gameStore.unreadMessages }}
          </span>
        </button>

        <button 
          class="btn-toggle-legend" 
          @click="showLegend = true"
          title="Ver Equivalencias de Piezas"
        >
          <HelpCircle class="icon-ctrl" />
        </button>
      </div>

      <!-- Collapsible Battle Chat Panel -->
      <div 
        class="battle-chat-panel" 
        :class="{ 'expanded': gameStore.chatExpanded }"
      >
        <div class="chat-header">
          <div class="chat-title">
            <MessageSquare class="icon-chat-header" />
            <span>Bitácora</span>
          </div>
          <button class="btn-close-chat" @click="gameStore.toggleChat">
            <X class="icon-close-chat" />
          </button>
        </div>
        <div class="messages" ref="chatScroll">
          <div v-for="(msg, i) in multiplayerStore.messages" :key="i" class="message">
            <span class="sender">{{ msg.senderName }}:</span>
            <span class="text">{{ msg.text }}</span>
          </div>
        </div>
        <div class="chat-input">
          <input 
            v-model="newMessage" 
            @keyup.enter="sendChat" 
            placeholder="Escribe un mensaje..." 
            type="text"
          />
        </div>
      </div>

      <!-- General Overlay elements (Surrender) -->
      <div class="hud-bottom">
        <button @click="handleSurrender" class="btn-surrender">Surrender</button>
      </div>

      <!-- Low Performance Fallback Alert Dialog -->
      <Transition name="fade">
        <div class="fps-prompt-overlay" v-if="showFpsPrompt">
          <div class="fps-prompt-content">
            <AlertTriangle class="icon-alert-warning" />
            <h3>¿Rendimiento Bajo?</h3>
            <p>El juego está experimentando caídas de fotogramas. Para una experiencia fluida y rápida en tu dispositivo móvil, te sugerimos cambiar al modo de tablero 2D.</p>
            <div class="fps-prompt-actions">
              <button @click="handleFpsFallback" class="btn-epic-alert">Cambiar a 2D</button>
              <button @click="showFpsPrompt = false" class="btn-ghost-alert">Ignorar</button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- WebGL / Init Failure Banner -->
      <Transition name="fade">
        <div class="engine-error-alert" v-if="gameStore.engineError">
          <AlertTriangle class="icon-alert-danger" />
          <div class="error-msg-content">
            <h4>Renderizado 3D Desactivado</h4>
            <p>{{ gameStore.engineError }}</p>
          </div>
          <button class="btn-error-dismiss" @click="gameStore.engineError = null">Entendido</button>
        </div>
      </Transition>

      <!-- Hover 3D Tooltip Premium Overlay -->
      <Transition name="slide-fade">
        <div 
          v-if="gameStore.viewMode === '3d' && gameStore.hoveredPiece" 
          class="hover-3d-tooltip"
          :class="[gameStore.hoveredPiece.color]"
        >
          <div class="hover-3d-portrait-wrapper">
            <img :src="getPieceImage3D(gameStore.hoveredPiece.type, gameStore.hoveredPiece.color)" class="hover-3d-portrait" />
          </div>
          <div class="hover-3d-info">
            <span class="hover-3d-faction-title">
              {{ gameStore.hoveredPiece.color === 'w' ? 'Sombreros de Paja' : 'La Marina' }}
            </span>
            <h3 class="hover-3d-char-name">{{ gameStore.hoveredPiece.character }}</h3>
            <div class="hover-3d-role-row">
              <span class="hover-3d-role-icon" v-html="CHESS_ICONS[gameStore.hoveredPiece.type]"></span>
              <span class="hover-3d-role-label">{{ getPieceChessRoleName(gameStore.hoveredPiece.type) }} ({{ gameStore.hoveredPiece.square.toUpperCase() }})</span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Leyenda / Modal de Equivalencias -->
      <Transition name="fade">
        <div class="legend-modal-overlay" v-if="showLegend" @click.self="showLegend = false">
          <div class="legend-modal-content">
            <div class="legend-header">
              <h2>Equivalencias de Batalla</h2>
              <button class="btn-close-legend" @click="showLegend = false">
                <X class="icon-close-chat" />
              </button>
            </div>
            
            <div class="legend-body">
              <div class="legend-faction white-faction">
                <h3>Sombreros de Paja (Blancas)</h3>
                <div class="legend-grid">
                  <div v-for="item in whiteLegend" :key="item.type" class="legend-item">
                    <div class="legend-badge" v-html="CHESS_ICONS[item.type]"></div>
                    <img :src="item.img" class="legend-img" />
                    <div class="legend-text">
                      <span class="role">{{ item.role }}</span>
                      <span class="char">{{ item.char }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="legend-faction black-faction">
                <h3>La Marina (Negras)</h3>
                <div class="legend-grid">
                  <div v-for="item in blackLegend" :key="item.type" class="legend-item">
                    <div class="legend-badge" v-html="CHESS_ICONS[item.type]"></div>
                    <img :src="item.img" class="legend-img" />
                    <div class="legend-text">
                      <span class="role">{{ item.role }}</span>
                      <span class="char">{{ item.char }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { GameEngine } from '../engine/GameEngine';
import { GameManager } from '../engine/GameManager';
import { ChessAI } from '../ai/ChessAI';
import { useGameStore } from '../stores/gameStore';
import { useMultiplayerStore } from '../stores/multiplayerStore';
import { useStatsStore } from '../stores/statsStore';
import { 
  MessageSquare, 
  MessageSquareOff, 
  Grid, 
  Rotate3d, 
  AlertTriangle, 
  X,
  HelpCircle
} from 'lucide-vue-next';
import Board2D from '../components/Board2D.vue';

const router = useRouter();
const renderCanvas = ref<HTMLCanvasElement | null>(null);

const showLegend = ref(false);

const CHESS_ICONS: Record<string, string> = {
  k: `<svg viewBox="0 0 24 24" fill="currentColor" style="width: 100%; height: 100%; display: block;"><path d="M12 2l1.5 3h3L15 7.5l1.5 3.5h-9L9 7.5 7.5 5h3L12 2zm-8 18h16v2H4v-2zm2-2h12v-6H6v6z" /></svg>`,
  q: `<svg viewBox="0 0 24 24" fill="currentColor" style="width: 100%; height: 100%; display: block;"><path d="M12 2a2 2 0 100 4 2 2 0 000-4zm-7 7l2.5 9h9l2.5-9-3.5 3.5L12 6l-3.5 6.5L5 9zm-1 11h16v2H4v-2z" /></svg>`,
  r: `<svg viewBox="0 0 24 24" fill="currentColor" style="width: 100%; height: 100%; display: block;"><path d="M5 2h3v2h3V2h2v2h3V2h3v4H5V2zm2 18h10v2H7v-2zm-1-2h12V8H6v10z" /></svg>`,
  b: `<svg viewBox="0 0 24 24" fill="currentColor" style="width: 100%; height: 100%; display: block;"><path d="M12 2a3 3 0 00-3 3c0 2.5 3 6.5 3 6.5s3-4 3-6.5a3 3 0 00-3-3zm-6 18h12v2H6v-2zm1-2h10V10H7v8z" /></svg>`,
  n: `<svg viewBox="0 0 24 24" fill="currentColor" style="width: 100%; height: 100%; display: block;"><path d="M19 22H5c0-4 2-7 3-9.5V11c0-2.5 1-4.5 3.5-4.5S15 8 15 10v2.5c0 1-1 2-2 2h-1v2.5c0 1.5 1 2.5 3 2.5h4v2.5z" /></svg>`,
  p: `<svg viewBox="0 0 24 24" fill="currentColor" style="width: 100%; height: 100%; display: block;"><path d="M12 3a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm-4 17h8v2H8v-2zm1-2h6v-6H9v6z" /></svg>`
};

const whiteLegend = [
  { type: 'k', role: 'Rey', char: 'Luffy', img: '/Luffy_2d.webp' },
  { type: 'q', role: 'Reina', char: 'Nami', img: '/Nami_2d.webp' },
  { type: 'b', role: 'Alfil', char: 'Zoro', img: '/Roronoa_Zoro_2d.webp' },
  { type: 'n', role: 'Caballo', char: 'Sanji', img: '/Sanji_2d.webp' },
  { type: 'r', role: 'Torre', char: 'Jimbei', img: '/Jinbe_2d.webp' },
  { type: 'p', role: 'Peón', char: 'Franky', img: '/Piratas_de_Sombrero_de_Paja_bandera.webp' }
];

const blackLegend = [
  { type: 'k', role: 'Rey', char: 'Sengoku', img: '/Sengoku_2d.webp' },
  { type: 'q', role: 'Reina', char: 'Akainu', img: '/Sakazuki_2d.webp' },
  { type: 'b', role: 'Alfil', char: 'Kuzan', img: '/Kuzan_2d.webp' },
  { type: 'n', role: 'Caballo', char: 'Kizaru', img: '/Borsalino_2d.webp' },
  { type: 'r', role: 'Torre', char: 'Fujitora', img: '/Fujitora_2d.webp' },
  { type: 'p', role: 'Peón', char: 'Marine', img: '/Marine_bandera.webp' }
];

const getPieceImage3D = (type: string, color: string): string => {
  const images: Record<string, Record<string, string>> = {
    w: {
      k: '/Luffy_2d.webp',
      q: '/Nami_2d.webp',
      b: '/Roronoa_Zoro_2d.webp',
      n: '/Sanji_2d.webp',
      r: '/Jinbe_2d.webp',
      p: '/Piratas_de_Sombrero_de_Paja_bandera.webp'
    },
    b: {
      k: '/Sengoku_2d.webp',
      q: '/Sakazuki_2d.webp',
      b: '/Kuzan_2d.webp',
      n: '/Borsalino_2d.webp',
      r: '/Fujitora_2d.webp',
      p: '/Marine_bandera.webp'
    }
  };
  return images[color]?.[type] || '';
};

const getPieceChessRoleName = (type: string): string => {
  const roles: Record<string, string> = {
    k: 'Rey',
    q: 'Reina',
    r: 'Torre',
    b: 'Alfil',
    n: 'Caballo',
    p: 'Peón'
  };
  return roles[type] || '';
};
const chatScroll = ref<HTMLElement | null>(null);
const gameStore = useGameStore();
const multiplayerStore = useMultiplayerStore();
const statsStore = useStatsStore();
const ai = new ChessAI();
const newMessage = ref('');

const whiteCaptured = computed(() => []);
const blackCaptured = computed(() => []);

const showFpsPrompt = ref(false);
let fpsInterval: any = null;
let lowFpsCount = 0;

// Timer State
const timeLeft = ref(600); // 10 minutes in seconds
let timerInterval: any = null;
const timerStarted = ref(false);

const formattedTime = computed(() => {
  const m = Math.floor(timeLeft.value / 60);
  const s = timeLeft.value % 60;
  return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
});

const startTimer = () => {
  if (timerInterval) clearInterval(timerInterval);
  timerStarted.value = true;
  timerInterval = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--;
    } else {
      // Time out!
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = null;
      gameStore.status.isGameOver = true;
      gameStore.status.winner = gameStore.status.turn === 'w' ? 'b' : 'w';
    }
  }, 1000);
};

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

const resetTimer = () => {
  stopTimer();
  timerStarted.value = false;
  timeLeft.value = 600;
};

const handleSurrender = () => {
  gameStore.status.isGameOver = true;
  gameStore.status.winner = gameStore.playerColor === 'w' ? 'b' : 'w';
  stopTimer();
};

const handleNewVoyage = () => {
  gameStore.resetGame();
  resetTimer();
};

// Watch game over to record stats & stop timer
watch(() => gameStore.status.isGameOver, (isOver) => {
  if (isOver) {
    stopTimer();
    if (gameStore.status.winner === gameStore.playerColor) {
      statsStore.recordWin();
    } else if (gameStore.status.winner) {
      statsStore.recordLoss();
    }
  }
});

// Watch messages for unread notifications and auto-scroll
watch(() => multiplayerStore.messages.length, (newVal, oldVal) => {
  if (!gameStore.chatExpanded && newVal > oldVal) {
    gameStore.incrementUnread();
  }
  
  if (gameStore.chatExpanded) {
    setTimeout(() => {
      if (chatScroll.value) chatScroll.value.scrollTop = chatScroll.value.scrollHeight;
    }, 100);
  }
});

// Watch view mode to enable/disable rendering loop dynamically
watch(() => gameStore.viewMode, (mode) => {
  if (engine) {
    engine.setRenderLoopEnabled(mode === '3d');
  }
});

const sendChat = () => {
  if (newMessage.value.trim()) {
    multiplayerStore.sendMessage(newMessage.value);
    newMessage.value = '';
    setTimeout(() => {
      if (chatScroll.value) chatScroll.value.scrollTop = chatScroll.value.scrollHeight;
    }, 100);
  }
};

let engine: GameEngine | null = null;
const manager = ref<GameManager | null>(null);

const startFpsMonitor = () => {
  const isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
  if (!isMobile) return;

  fpsInterval = setInterval(() => {
    if (engine && gameStore.viewMode === '3d') {
      const fps = engine.getFps();
      // BabylonJS engine needs a few frames to settle, ignore 0
      if (fps > 0 && fps < 20) {
        lowFpsCount++;
        if (lowFpsCount >= 3) {
          showFpsPrompt.value = true;
          clearInterval(fpsInterval);
        }
      } else {
        lowFpsCount = 0;
      }
    }
  }, 1000);
};

const handleFpsFallback = () => {
  gameStore.setViewMode('2d');
  showFpsPrompt.value = false;
};

onMounted(() => {
  // Mobile initial chat setup: fold chat by default to prioritize the board
  if (window.innerWidth < 768) {
    gameStore.chatExpanded = false;
  }

  try {
    if (renderCanvas.value) {
      engine = new GameEngine(renderCanvas.value);
      manager.value = new GameManager(engine);
      gameStore.initGame();
      
      // Auto-pause render loop if mode is 2D at start
      if (gameStore.viewMode === '2d') {
        engine.setRenderLoopEnabled(false);
      }

      setTimeout(() => manager.value?.syncBoard(), 500);
      startFpsMonitor();
    }
  } catch (err) {
    console.error('Failed to initialize 3D Engine:', err);
    gameStore.viewMode = '2d';
    gameStore.engineError = 'El renderizador 3D no es compatible con este dispositivo. Se ha activado el modo 2D automáticamente.';
    gameStore.initGame();
  }
});

watch(() => gameStore.status.fen, () => {
  manager.value?.syncBoard();

  // Start timer on first move
  if (!timerStarted.value && gameStore.game.getGameState().history.length > 0) {
    startTimer();
  }
});

const handleBack = () => {
  router.push('/');
};

onUnmounted(() => {
  if (fpsInterval) clearInterval(fpsInterval);
  if (timerInterval) clearInterval(timerInterval);
  if (engine) engine.dispose();
});
</script>

<style scoped>
.game-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(rgba(10, 24, 40, 0.45), rgba(3, 8, 14, 0.75)),
              url('../public/wallpaperOnePiece.jpg');
  background-size: cover;
  background-position: center;
  display: flex;
  justify-content: center;
  align-items: center;
}

.render-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  outline: none;
  z-index: 1;
}

.board-2d-overlay {
  position: relative;
  z-index: 2;
  width: 90vmin;
  height: 90vmin;
  max-width: 600px;
  max-height: 600px;
}

.ui-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  color: white;
  font-family: 'Cinzel', serif;
  box-sizing: border-box;
  z-index: 10;
}

.ui-overlay > * {
  pointer-events: auto;
}

.hud-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to bottom, rgba(0,0,0,0.92) 0%, transparent 100%);
  padding: 1rem 2rem;
  width: 100%;
  box-sizing: border-box;
  z-index: 15;
  pointer-events: none;
}

.hud-top > * {
  pointer-events: auto;
}

.player-profile {
  display: flex;
  align-items: center;
  gap: 1rem;
  opacity: 0.8;
  background: rgba(0, 0, 0, 0.65);
  padding: 0.5rem 1.2rem;
  border-radius: 50px;
  border: 1px solid rgba(212, 175, 55, 0.35);
  min-width: 160px;
  backdrop-filter: blur(5px);
}

.player-profile.active {
  opacity: 1;
  border-color: #d4af37;
  box-shadow: 0 0 25px rgba(212, 175, 55, 0.45);
}

.portrait {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  border: 2px solid #d4af37;
  object-fit: cover;
}

.player-info .name {
  font-size: 1rem;
  letter-spacing: 1px;
}

.game-center {
  text-align: center;
}

.game-center h1 {
  font-size: 1.8rem;
  margin: 0;
  letter-spacing: 4px;
  background: linear-gradient(#d4af37, #f1d592);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.timer {
  font-size: 1.1rem;
  color: #d4af37;
  font-family: monospace;
}

/* Floating controls bar - styled to perfection */
.action-controls-bar {
  position: absolute;
  top: 100px;
  right: 2rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  z-index: 99;
}

.toggle-group-premium {
  display: flex;
  background: rgba(4, 12, 22, 0.8);
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 30px;
  padding: 3px;
  backdrop-filter: blur(10px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
}

.btn-toggle-view {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  padding: 8px 16px;
  font-family: 'Cinzel', serif;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.btn-toggle-view.active {
  background: linear-gradient(135deg, #d4af37 0%, #aa8412 100%);
  color: #0d0800;
  box-shadow: 0 4px 10px rgba(212, 175, 55, 0.4);
  font-weight: bold;
}

.btn-toggle-view:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.icon-ctrl {
  width: 16px;
  height: 16px;
}

.btn-toggle-chat-bubble {
  position: relative;
  background: rgba(4, 12, 22, 0.8);
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #d4af37;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.btn-toggle-chat-bubble:hover {
  transform: scale(1.05);
  border-color: #d4af37;
  box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
}

.btn-toggle-chat-bubble.chat-open {
  background: linear-gradient(135deg, #d4af37 0%, #aa8412 100%);
  color: #0d0800;
  border-color: #d4af37;
  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
}

.unread-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ff4757;
  color: white;
  font-size: 0.7rem;
  font-family: sans-serif;
  font-weight: bold;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 4px;
  box-shadow: 0 0 10px #ff4757;
  border: 1px solid white;
}

/* Redesigned Collapsible Chat Panel */
.battle-chat-panel {
  position: absolute;
  top: 160px;
  right: 2rem;
  width: 320px;
  height: calc(100% - 280px);
  background: rgba(4, 10, 18, 0.85);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(212, 175, 55, 0.35);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
  transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.3s ease;
  z-index: 90;
  pointer-events: auto;
}

.battle-chat-panel:not(.expanded) {
  transform: translateX(130%);
  opacity: 0;
  pointer-events: none;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
  border-bottom: 1px solid rgba(212, 175, 55, 0.25);
  padding: 12px 16px;
}

.chat-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #d4af37;
  font-weight: bold;
  letter-spacing: 1px;
}

.icon-chat-header {
  width: 18px;
  height: 18px;
}

.btn-close-chat {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-close-chat:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.icon-close-chat {
  width: 16px;
  height: 16px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  font-size: 0.9rem;
  font-family: sans-serif;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message {
  line-height: 1.4;
  word-break: break-word;
}

.sender {
  color: #d4af37;
  font-weight: bold;
  margin-right: 6px;
  font-family: 'Cinzel', serif;
}

.chat-input input {
  width: 100%;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-top: 1px solid rgba(212, 175, 55, 0.25);
  color: white;
  padding: 14px 18px;
  outline: none;
  font-family: sans-serif;
  box-sizing: border-box;
}

.chat-input input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.hud-bottom {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 2rem;
  width: 100%;
  box-sizing: border-box;
  pointer-events: none;
  z-index: 15;
}

.hud-bottom > * {
  pointer-events: auto;
}

.btn-surrender {
  background: linear-gradient(rgba(255, 0, 0, 0.1), rgba(255, 0, 0, 0.2));
  border: 1px solid #ff4444;
  color: #ff4444;
  padding: 1rem 2.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Cinzel', serif;
  text-transform: uppercase;
  letter-spacing: 2px;
  transition: all 0.3s ease;
}

.btn-surrender:hover {
  background: linear-gradient(rgba(255, 0, 0, 0.25), rgba(255, 0, 0, 0.35));
  box-shadow: 0 0 15px rgba(255, 68, 68, 0.3);
}

/* Alert overlays: low performance fallbacks & errors */
.fps-prompt-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
  backdrop-filter: blur(10px);
}

.fps-prompt-content {
  background: rgba(8, 20, 36, 0.95);
  border: 2px solid #d4af37;
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
}

.icon-alert-warning {
  width: 48px;
  height: 48px;
  color: #eccc68;
  margin-bottom: 1rem;
}

.fps-prompt-content h3 {
  font-size: 1.5rem;
  color: #d4af37;
  margin-top: 0;
}

.fps-prompt-content p {
  color: rgba(255, 255, 255, 0.8);
  font-family: sans-serif;
  line-height: 1.6;
}

.fps-prompt-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-epic-alert {
  background: #d4af37;
  color: black;
  border: none;
  padding: 0.8rem 1.6rem;
  font-family: 'Cinzel', serif;
  font-weight: bold;
  cursor: pointer;
  border-radius: 4px;
}

.btn-ghost-alert {
  background: transparent;
  border: 1px solid white;
  color: white;
  padding: 0.8rem 1.6rem;
  font-family: 'Cinzel', serif;
  cursor: pointer;
  border-radius: 4px;
}

.engine-error-alert {
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(180, 10, 10, 0.9);
  border: 1.5px solid #ff4757;
  border-radius: 8px;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  z-index: 150;
  max-width: 80%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
}

.icon-alert-danger {
  width: 24px;
  height: 24px;
  color: white;
}

.error-msg-content h4 {
  margin: 0;
  font-size: 0.95rem;
  color: white;
}

.error-msg-content p {
  margin: 2px 0 0 0;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
  font-family: sans-serif;
}

.btn-error-dismiss {
  background: white;
  color: #b40a0a;
  border: none;
  padding: 5px 12px;
  font-family: 'Cinzel', serif;
  font-weight: bold;
  font-size: 0.75rem;
  border-radius: 4px;
  cursor: pointer;
}

.game-status-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  backdrop-filter: blur(15px);
}

.game-over-content {
  text-align: center;
  padding: 2rem;
  box-sizing: border-box;
}

.outcome-title {
  font-size: 3.5rem;
  margin: 0;
  background: linear-gradient(#d4af37, #f1d592);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 6px;
  font-weight: 900;
}

.outcome-decoration {
  width: 100px;
  height: 2px;
  background: linear-gradient(to right, transparent, #d4af37, transparent);
  margin: 1.25rem auto;
}

.outcome-subtitle {
  font-size: 1.1rem;
  color: #a0aec0;
  margin: 0 0 2.5rem;
  font-family: 'Poppins', sans-serif;
}

.game-over-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-top: 2.5rem;
  flex-wrap: wrap;
}

.btn-epic, .btn-ghost {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: 200px;
  height: 52px;
  padding: 0 2rem;
  font-family: 'Cinzel', serif;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-sizing: border-box;
  text-decoration: none;
}

.btn-epic {
  background: linear-gradient(135deg, #d4af37 0%, #aa8412 100%);
  color: #0d0800;
  border: none;
  box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
}

.btn-epic:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(212, 175, 55, 0.5);
  background: linear-gradient(135deg, #f1d592 0%, #d4af37 100%);
}

.btn-ghost {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: white;
  backdrop-filter: blur(5px);
}

.btn-ghost:hover {
  border-color: #d4af37;
  color: #d4af37;
  background: rgba(212, 175, 55, 0.05);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(212, 175, 55, 0.1);
}

/* Pulse animation for notifications */
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); box-shadow: 0 0 15px #ff4757; }
  100% { transform: scale(1); }
}

.animate-pulse {
  animation: pulse 1.5s infinite ease-in-out;
}

/* Responsiveness overrides */
@media (max-width: 1024px) {
  .game-center h1 { font-size: 1.4rem; }
}

@media (max-width: 768px) {
  .hud-top {
    padding: 0.5rem;
    flex-wrap: wrap;
    justify-content: space-around;
  }
  .game-center { width: 100%; order: -1; margin-bottom: 0.5rem; }
  .player-profile { min-width: 100px; padding: 0.3rem 0.6rem; }
  .portrait { width: 35px; height: 35px; }
  
  .hud-bottom {
    flex-direction: column;
    padding: 1rem;
    gap: 1rem;
  }
  .btn-surrender { width: 100%; padding: 0.8rem; }
  .outcome-title { font-size: 2rem; }
  
  .game-over-actions {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 1.25rem !important;
    width: 100% !important;
    max-width: 280px !important;
    margin: 2rem auto 0 !important;
  }
  
  .btn-epic, .btn-ghost {
    display: inline-flex !important;
    justify-content: center !important;
    align-items: center !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    margin: 0 !important;
    height: 50px !important;
    padding: 0 1.5rem !important;
    font-size: 1rem !important;
    box-sizing: border-box !important;
  }

  /* Mobile floating horizontal action controls bar - centered below the board to prevent overlapping pieces */
  .action-controls-bar {
    top: auto;
    bottom: 110px;
    left: 50%;
    transform: translateX(-50%);
    right: auto;
    flex-direction: row;
    gap: 16px;
  }

  .toggle-group-premium {
    flex-direction: row;
    border-radius: 30px;
  }

  .btn-toggle-view {
    padding: 10px 16px;
  }

  .btn-toggle-view span {
    display: inline; /* Keep text visible on mobile for high premium clarity */
  }

  /* Mobile slide-up chat panel */
  .battle-chat-panel {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 320px;
    border-radius: 24px 24px 0 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
    box-shadow: 0 -12px 35px rgba(0, 0, 0, 0.85);
    margin: 0;
    z-index: 110;
  }

  .battle-chat-panel:not(.expanded) {
    transform: translateY(110%);
    opacity: 0;
  }

  .messages {
    height: 200px;
  }
}

@media (max-width: 480px) {
  .game-center h1 { display: none; }
  .player-info .name { font-size: 0.8rem; }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Hover 3D Tooltip Style */
.hover-3d-tooltip {
  position: absolute;
  bottom: 2rem;
  left: 2rem;
  background: rgba(4, 10, 18, 0.9);
  backdrop-filter: blur(12px);
  border: 1.5px solid rgba(212, 175, 55, 0.35);
  border-radius: 12px;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  gap: 15px;
  max-width: 320px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(212, 175, 55, 0.2);
  z-index: 95;
  pointer-events: none;
}

.hover-3d-tooltip.w {
  border-color: rgba(212, 175, 55, 0.5);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(212, 175, 55, 0.25);
}

.hover-3d-tooltip.b {
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 255, 255, 0.15);
}

.hover-3d-portrait-wrapper {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #d4af37;
  background: #000;
  box-shadow: 0 0 8px rgba(212, 175, 55, 0.4);
}

.hover-3d-tooltip.b .hover-3d-portrait-wrapper {
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
}

.hover-3d-portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hover-3d-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hover-3d-faction-title {
  font-size: 0.58rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #a0aec0;
  font-weight: bold;
}

.hover-3d-char-name {
  font-size: 1.15rem;
  margin: 0;
  font-weight: 900;
  letter-spacing: 0.5px;
  background: linear-gradient(#ffffff, #e2e8f0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hover-3d-tooltip.w .hover-3d-char-name {
  background: linear-gradient(#ffd700, #b8860b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hover-3d-role-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
}

.hover-3d-role-icon {
  width: 14px;
  height: 14px;
  color: #ffd700;
  display: flex;
  align-items: center;
}

.hover-3d-tooltip.b .hover-3d-role-icon {
  color: #ffffff;
}

.hover-3d-role-label {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'Cinzel', serif;
  font-weight: bold;
}

/* Slide-Fade transition */
.slide-fade-enter-active, .slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.slide-fade-enter-from, .slide-fade-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}

/* Button Toggle Legend */
.btn-toggle-legend {
  background: rgba(4, 12, 22, 0.8);
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #eccc68;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.btn-toggle-legend:hover {
  transform: scale(1.05);
  border-color: #d4af37;
  box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
}

/* Legend Modal Style */
.legend-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 300;
  backdrop-filter: blur(12px);
}

.legend-modal-content {
  background: linear-gradient(135deg, rgba(8, 20, 36, 0.95) 0%, rgba(3, 8, 14, 0.98) 100%);
  border: 2px solid #d4af37;
  border-radius: 20px;
  width: 90%;
  max-width: 720px;
  max-height: 85vh;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(212, 175, 55, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalZoom 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

@keyframes modalZoom {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.legend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  background: rgba(0, 0, 0, 0.4);
  border-bottom: 1.5px solid rgba(212, 175, 55, 0.3);
}

.legend-header h2 {
  margin: 0;
  font-size: 1.6rem;
  letter-spacing: 2px;
  background: linear-gradient(#d4af37, #f1d592);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.btn-close-legend {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 6px;
  border-radius: 50%;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.btn-close-legend:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-color: #d4af37;
}

.legend-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  gap: 30px;
}

.legend-faction {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.legend-faction h3 {
  margin: 0;
  font-size: 1.15rem;
  letter-spacing: 1px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.white-faction h3 {
  color: #ffd700;
  border-bottom-color: rgba(212, 175, 55, 0.3);
}

.black-faction h3 {
  color: #ffffff;
  border-bottom-color: rgba(255, 255, 255, 0.15);
}

.legend-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255, 255, 255, 0.03);
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.03);
  transition: all 0.2s ease;
}

.legend-item:hover {
  background: rgba(212, 175, 55, 0.06);
  border-color: rgba(212, 175, 55, 0.2);
  transform: translateX(4px);
}

.black-faction .legend-item:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.15);
}

.legend-badge {
  width: 22px;
  height: 22px;
  color: #ffd700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.black-faction .legend-badge {
  color: #ffffff;
}

.legend-img {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid #d4af37;
  background: #000;
}

.black-faction .legend-img {
  border-color: rgba(255, 255, 255, 0.4);
}

.legend-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.legend-text .role {
  font-size: 0.68rem;
  text-transform: uppercase;
  color: #a0aec0;
  font-family: 'Cinzel', serif;
  font-weight: bold;
}

.legend-text .char {
  font-size: 0.95rem;
  font-weight: bold;
  color: white;
}

/* Responsiveness overrides for Legend Modal */
@media (max-width: 768px) {
  .legend-body {
    flex-direction: column;
    gap: 20px;
    padding: 16px;
  }
  
  .legend-modal-content {
    max-height: 90vh;
  }
  
  .legend-header h2 {
    font-size: 1.25rem;
  }

  .hover-3d-tooltip {
    bottom: auto;
    top: 90px;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    max-width: 300px;
    padding: 10px 14px;
    gap: 12px;
  }

  .hover-3d-portrait-wrapper {
    width: 44px;
    height: 44px;
  }

  .hover-3d-char-name {
    font-size: 1rem;
  }

  .slide-fade-enter-from, .slide-fade-leave-to {
    transform: translate(-50%, -20px);
    opacity: 0;
  }
}
</style>
