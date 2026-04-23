import { create } from "zustand";

interface StylePrefsStore {
  content: string;
  setContent: (content: string) => void;
}

export const useStylePrefsStore = create<StylePrefsStore>((set) => ({
  content: "",
  setContent: (content) => set({ content }),
}));
