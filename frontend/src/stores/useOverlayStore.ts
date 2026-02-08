import { create } from 'zustand';

interface OverlayStore {
  openOverlays: string[];
  setOverlay: (id: string, isOpen: boolean) => void;
  isOverlayOpen: boolean;
}

export const useOverlayStore = create<OverlayStore>((set) => ({
  openOverlays: [],
  isOverlayOpen: false,
  setOverlay: (id, isOpen) => set((state) => {
    const nextOverlays = isOpen 
      ? Array.from(new Set([...state.openOverlays, id]))
      : state.openOverlays.filter(o => o !== id);
    return {
      openOverlays: nextOverlays,
      isOverlayOpen: nextOverlays.length > 0
    };
  }),
}));