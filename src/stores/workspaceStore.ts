import { create } from "zustand";

interface WorkspaceStore {
  sidebarOpen: boolean;
  activeDocumentId: string | null;
  setActiveDocumentId: (id: string | null) => void;
  toggleSidebar: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  sidebarOpen: true,
  activeDocumentId: null,
  setActiveDocumentId: (id) => set({ activeDocumentId: id }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
