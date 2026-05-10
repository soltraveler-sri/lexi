import { create } from "zustand";

interface UiStore {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  researchOpen: boolean;
  setResearchOpen: (open: boolean) => void;
  docTransformOpen: boolean;
  setDocTransformOpen: (open: boolean) => void;
  agentPanelOpen: boolean;
  setAgentPanelOpen: (open: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  researchOpen: false,
  setResearchOpen: (researchOpen) => set({ researchOpen }),
  docTransformOpen: false,
  setDocTransformOpen: (docTransformOpen) => set({ docTransformOpen }),
  agentPanelOpen: false,
  setAgentPanelOpen: (agentPanelOpen) => set({ agentPanelOpen }),
}));
