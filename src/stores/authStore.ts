import { create } from 'zustand';
import { pb } from '../lib/pb';

interface AuthState {
  isValid:  boolean;
  userId:   string | null;
  login:    (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout:   () => void;
  refresh:  () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const syncFromPb = () =>
    set({
      isValid: pb.authStore.isValid,
      userId:  pb.authStore.record?.id ?? null,
    });

  pb.authStore.onChange(() => syncFromPb());

  return {
    isValid:  pb.authStore.isValid,
    userId:   pb.authStore.record?.id ?? null,

    async login(email, password) {
      await pb.collection('users').authWithPassword(email, password);
      syncFromPb();
    },

    async register(email, password) {
      await pb.collection('users').create({ email, password, passwordConfirm: password });
      await pb.collection('users').authWithPassword(email, password);
      syncFromPb();
    },

    logout() {
      pb.authStore.clear();
      syncFromPb();
    },

    refresh() {
      syncFromPb();
    },
  };
});
