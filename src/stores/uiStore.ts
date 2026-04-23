import { create } from "zustand";

interface UiStore {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
}));
