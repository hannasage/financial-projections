/** True when built without a PocketBase backend (default). Set VITE_STORAGE_MODE=pocketbase to enable backend mode. */
export const LOCAL_MODE = import.meta.env.VITE_STORAGE_MODE !== 'pocketbase';
