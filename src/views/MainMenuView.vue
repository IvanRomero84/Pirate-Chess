<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { useMultiplayerStore } from '../stores/multiplayerStore';
import { useGameStore } from '../stores/gameStore';

const authStore = useAuthStore();
const multiplayerStore = useMultiplayerStore();
const gameStore = useGameStore();
const router = useRouter();

const showSideSelection = ref(false);

onMounted(() => {
  authStore.init();
});

const handleMultiplayer = async () => {
  if (authStore.user) {
    router.push('/lobby');
  }
};

const selectSide = (side: 'w' | 'b') => {
  gameStore.setPlayerColor(side);
  gameStore.resetGame();
  showSideSelection.value = false;
  router.push('/game');
};
</script>

<template>
  <div class="main-menu">
    <div class="menu-content">
      <div class="title-section">
        <h1 class="game-title">One Piece</h1>
        <h2 class="sub-title">Grand Line Chess</h2>
      </div>

      <div class="auth-status" v-if="authStore.user">
        <p>Welcome, <span class="username">{{ authStore.user.displayName || 'Pirate' }}</span></p>
        <button @click="authStore.logout" class="btn-logout">Leave Grand Line</button>
      </div>
      <div class="auth-status" v-else>
        <button @click="authStore.loginWithGoogle" class="btn-login">Join the Crew</button>
      </div>

      <div class="menu-actions">
        <button @click="showSideSelection = true" class="menu-btn primary">
          <span class="btn-text">Local Battle</span>
          <span class="btn-desc">Challenge the AI or a Friend</span>
        </button>

        <button class="menu-btn secondary" :disabled="!authStore.user" @click="handleMultiplayer">
          <span class="btn-text">Multiplayer</span>
          <span class="btn-desc">{{ authStore.user ? 'Enter the Arena' : 'Login to Play Online' }}</span>
        </button>

        <button class="menu-btn ghost">
          <span class="btn-text">Settings</span>
        </button>
      </div>

      <div class="footer">
        <p>Become the King of the Pirates!</p>
      </div>
    </div>

    <!-- Side Selection Modal -->
    <Transition name="fade">
      <div v-if="showSideSelection" class="modal-overlay" @click.self="showSideSelection = false">
        <div class="modal-content side-selection">
          <h3>Choose Your Allegiance</h3>
          <p>The fate of the Grand Line depends on your decision.</p>
          
          <div class="side-options">
            <button @click="selectSide('w')" class="side-btn white">
              <div class="side-icon">☠️</div>
              <span class="side-name">Straw Hat Pirates</span>
              <span class="side-desc">Set sail with Luffy's crew</span>
            </button>

            <button @click="selectSide('b')" class="side-btn black">
              <div class="side-icon">⚓</div>
              <span class="side-name">The Navy / Marines</span>
              <span class="side-desc">Enforce absolute justice</span>
            </button>
          </div>

          <button @click="showSideSelection = false" class="btn-cancel">Back</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.main-menu {
  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle at center, #0a1f33 0%, #03080e 100%);
  background-size: cover;
  background-position: center;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-family: 'Cinzel', serif;
}

.menu-content {
  text-align: center;
  max-width: 600px;
  padding: 3rem;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 12px;
}

.game-title {
  font-size: 4rem;
  margin: 0;
  letter-spacing: 8px;
  background: linear-gradient(to bottom, #d4af37, #f1d592);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sub-title {
  font-size: 1.5rem;
  margin-top: -10px;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 4px;
}

.menu-actions {
  margin-top: 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.menu-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(212, 175, 55, 0.5);
  padding: 1.5rem;
  color: white;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.menu-btn:hover:not(:disabled) {
  background: rgba(212, 175, 55, 0.1);
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
  transform: translateY(-2px);
  border-color: #d4af37;
}

.menu-btn.primary {
  background: rgba(212, 175, 55, 0.15);
}

.menu-btn.primary:hover {
  background: rgba(212, 175, 55, 0.25);
}

.btn-text {
  font-size: 1.5rem;
  font-weight: bold;
  letter-spacing: 2px;
}

.btn-desc {
  font-size: 0.8rem;
  opacity: 0.6;
  margin-top: 5px;
}

.menu-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: #444;
}

.footer {
  margin-top: 4rem;
  font-size: 0.8rem;
  opacity: 0.4;
}

.auth-status {
  margin-top: 2rem;
  padding: 1rem;
  border-top: 1px solid rgba(212, 175, 55, 0.2);
}

.username {
  color: #d4af37;
  font-weight: bold;
}

.btn-login, .btn-logout {
  background: transparent;
  border: 1px solid #d4af37;
  color: #d4af37;
  padding: 0.5rem 1.5rem;
  margin-top: 10px;
  cursor: pointer;
  font-family: 'Cinzel', serif;
  transition: all 0.3s ease;
}

.btn-login:hover, .btn-logout:hover {
  background: #d4af37;
  color: #000;
}

@media (max-width: 600px) {
  .game-title { font-size: 2.5rem; letter-spacing: 4px; }
  .menu-content { padding: 1.5rem; width: 90vw; }
  .menu-btn { padding: 1rem; }
  .btn-text { font-size: 1.1rem; }
  .side-options { flex-direction: column; }
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.modal-content.side-selection {
  background: #0a0a0a;
  padding: 3rem;
  border-radius: 15px;
  border: 1px solid #d4af37;
  max-width: 800px;
  width: 90%;
  text-align: center;
  box-shadow: 0 0 50px rgba(212, 175, 55, 0.15);
}

h3 {
  font-size: 2.5rem;
  color: #d4af37;
  margin-bottom: 0.5rem;
}

.side-options {
  display: flex;
  gap: 2rem;
  margin: 3rem 0;
}

.side-btn {
  flex: 1;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2rem;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 12px;
}

.side-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  transition: transform 0.3s ease;
}

.side-name {
  font-size: 1.5rem;
  color: white;
  margin-bottom: 0.5rem;
}

.side-desc {
  font-size: 0.8rem;
  color: #888;
}

.side-btn.white:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: #f1f1f1;
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.1);
}

.side-btn.black:hover {
  background: rgba(255, 0, 0, 0.05);
  border-color: #ff4d4d;
  box-shadow: 0 0 30px rgba(255, 77, 77, 0.1);
}

.side-btn:hover .side-icon {
  transform: scale(1.2) rotate(5deg);
}

.btn-cancel {
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  transition: color 0.3s;
}

.btn-cancel:hover {
  color: #d4af37;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
