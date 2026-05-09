import { create } from 'zustand';
import { LOCAL_MODE } from '../lib/mode';
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
  if (LOCAL_MODE) {
    return {
      isValid:  true,
      userId:   'local',
      async login()    {},
      async register() {},
      logout()         {},
      refresh()        {},
    };
  }

  const syncFromPb = () =>
    set({ isValid: pb.authStore.isValid, userId: pb.authStore.record?.id ?? null });

  pb.authStore.onChange(() => syncFromPb());

  return {
    isValid: pb.authStore.isValid,
    userId:  pb.authStore.record?.id ?? null,

    async login(email, password) {
      await pb.collection('users').authWithPassword(email, password);
      syncFromPb();
    },

    async register(email, password) {
      await pb.collection('users').create({ email, password, passwordConfirm: password });
      await pb.collection('users').authWithPassword(email, password);
      syncFromPb();
    },

    logout() { pb.authStore.clear(); syncFromPb(); },
    refresh() { syncFromPb(); },
  };
});
