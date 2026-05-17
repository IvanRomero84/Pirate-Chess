import { defineStore } from 'pinia';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../firebase/config';
import { authService } from '../services/authService';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    loading: true,
  }),

  actions: {
    init() {
      onAuthStateChanged(auth, (user) => {
        this.user = user;
        this.loading = false;
      });
    },

    async loginWithGoogle() {
      try {
        await authService.loginWithGoogle();
      } catch (error) {
        console.error('Login failed', error);
      }
    },

    async logout() {
      await authService.logout();
    }
  }
});
