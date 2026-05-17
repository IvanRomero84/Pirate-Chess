<template>
  <div class="game-container">
    <canvas ref="renderCanvas" class="render-canvas"></canvas>
    
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
          <div class="timer">10:00</div>
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
              <button @click="gameStore.resetGame" class="btn-epic">New Voyage</button>
              <button @click="handleBack" class="btn-ghost">Return to Menu</button>
            </div>
          </div>
        </div>
      </Transition>

      <div class="hud-bottom">
        <!-- Battle Chat -->
        <div class="battle-chat">
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
              placeholder="Send message..." 
              type="text"
            />
          </div>
        </div>

        <button @click="handleBack" class="btn-surrender">Surrender</button>
      </div>
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

const router = useRouter();
const renderCanvas = ref<HTMLCanvasElement | null>(null);
const chatScroll = ref<HTMLElement | null>(null);
const gameStore = useGameStore();
const multiplayerStore = useMultiplayerStore();
const statsStore = useStatsStore();
const ai = new ChessAI();
const newMessage = ref('');

const whiteCaptured = computed(() => []);
const blackCaptured = computed(() => []);

watch(() => gameStore.status.isGameOver, (isOver) => {
  if (isOver) {
    if (gameStore.status.winner === gameStore.playerColor) {
      statsStore.recordWin();
    } else if (gameStore.status.winner) {
      statsStore.recordLoss();
    }
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
let manager: GameManager | null = null;

onMounted(() => {
  if (renderCanvas.value) {
    engine = new GameEngine(renderCanvas.value);
    manager = new GameManager(engine);
    gameStore.initGame();
    setTimeout(() => manager?.syncBoard(), 500);
  }
});

watch(() => gameStore.status.fen, () => {
  manager?.syncBoard();
});


const handleBack = () => {
  if (confirm('Are you sure you want to surrender and return to the East Blue?')) {
    router.push('/');
  }
};

onUnmounted(() => {
  if (engine) engine.dispose();
});
</script>

<style scoped>
.game-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(rgba(10, 24, 40, 0.4), rgba(3, 8, 14, 0.7)),
              url('../public/wallpaperOnePiece.jpg');
  background-size: cover;
  background-position: center;
}

.render-canvas {
  width: 100%;
  height: 100%;
  outline: none;
}

.controls-hint {
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.8rem;
  color: #666;
  text-align: center;
  width: 100%;
  pointer-events: none;
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
}

.ui-overlay > * {
  pointer-events: auto;
}

.hud-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 100%);
  padding: 1rem 2rem;
  width: 100%;
  box-sizing: border-box;
  z-index: 10;
  pointer-events: none; /* Allow clicks to pass through to the 3D scene */
}

.hud-top > * {
  pointer-events: auto; /* Re-enable for the actual profile/title */
}

.player-profile {
  display: flex;
  align-items: center;
  gap: 1rem;
  opacity: 0.8;
  background: rgba(0, 0, 0, 0.6);
  padding: 0.5rem 1.2rem;
  border-radius: 50px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  min-width: 150px;
}

.player-profile.active {
  opacity: 1;
  border-color: #d4af37;
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.4);
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

.hud-bottom {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 2rem;
  width: 100%;
  box-sizing: border-box;
  gap: 2rem;
  pointer-events: none;
}

.hud-bottom > * {
  pointer-events: auto;
}

.battle-chat {
  width: 320px;
  max-height: 250px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.messages {
  height: 160px;
  overflow-y: auto;
  padding: 1rem;
  font-size: 0.9rem;
}

.sender {
  color: #d4af37;
  font-weight: bold;
  margin-right: 5px;
}

.chat-input input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-top: 1px solid rgba(212, 175, 55, 0.2);
  color: white;
  padding: 12px 15px;
  outline: none;
  font-family: inherit;
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
}

.outcome-title {
  font-size: 3.5rem;
  margin: 0;
  background: linear-gradient(#d4af37, #f1d592);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 6px;
}

.btn-epic {
  background: #d4af37;
  color: black;
  border: none;
  padding: 1rem 2rem;
  font-family: 'Cinzel', serif;
  font-size: 1.2rem;
  cursor: pointer;
}

.btn-ghost {
  background: transparent;
  border: 1px solid white;
  color: white;
  padding: 1rem 2rem;
  font-family: 'Cinzel', serif;
  cursor: pointer;
  margin-left: 1rem;
}

/* Responsiveness Overhaul */
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
  .battle-chat { width: 100%; max-height: 120px; }
  .messages { height: 80px; }
  .btn-surrender { width: 100%; padding: 0.8rem; }
  .outcome-title { font-size: 2rem; }
}

@media (max-width: 480px) {
  .game-center h1 { display: none; }
  .player-info .name { font-size: 0.8rem; }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
