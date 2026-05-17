import { createRouter, createWebHistory } from 'vue-router';
import GameView from '../views/GameView.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/MainMenuView.vue')
  },
  {
    path: '/lobby',
    name: 'Lobby',
    component: () => import('../views/LobbyView.vue')
  },
  {
    path: '/game',
    name: 'Game',
    component: GameView
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
