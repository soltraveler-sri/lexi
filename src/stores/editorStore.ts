import { create } from "zustand";

interface EditorStore {
  selectedText: string;
  setSelectedText: (text: string) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  selectedText: "",
  setSelectedText: (selectedText) => set({ selectedText }),
}));
