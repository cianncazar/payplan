import { create } from 'zustand';

type TourStore = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export const useTourStore = create<TourStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
