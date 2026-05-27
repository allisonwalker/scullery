'use client'

import { create } from 'zustand'
import type { PlanSlot, PlanConfig, Recipe, AiRecipeSuggestion, PreviewSlot } from '@/types'

interface PlannerState {
  slots: PlanSlot[]
  config: PlanConfig
  previewSlots: PreviewSlot[] | null  // non-null during regeneration preview
  swapTargetSlot: PlanSlot | null
  slideOverRecipe: Recipe | null
  isRegenerating: boolean

  setSlots: (slots: PlanSlot[]) => void
  setConfig: (config: PlanConfig) => void
  updateSlot: (id: string, patch: Partial<PlanSlot>) => void
  removeSlot: (id: string) => void
  addSlot: (slot: PlanSlot) => void

  // Preview / regenerate
  startPreview: (previews: PreviewSlot[]) => void
  acceptPreviewSlot: (id: string) => void
  rejectPreviewSlot: (id: string) => void
  clearPreview: () => void

  // UI state
  openSwapSheet: (slot: PlanSlot) => void
  closeSwapSheet: () => void
  openSlideOver: (recipe: Recipe) => void
  closeSlideOver: () => void

  setRegenerating: (v: boolean) => void
}

const DEFAULT_CONFIG: PlanConfig = {
  breakfast: 2,
  lunch: 4,
  dinner: 5,
  snack: 0,
  library_ratio: 0.6,
}

export const usePlannerStore = create<PlannerState>((set) => ({
  slots: [],
  config: DEFAULT_CONFIG,
  previewSlots: null,
  swapTargetSlot: null,
  slideOverRecipe: null,
  isRegenerating: false,

  setSlots: (slots) => set({ slots }),
  setConfig: (config) => set({ config }),

  updateSlot: (id, patch) =>
    set((s) => ({
      slots: s.slots.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)),
    })),

  removeSlot: (id) =>
    set((s) => ({ slots: s.slots.filter((slot) => slot.id !== id) })),

  addSlot: (slot) => set((s) => ({ slots: [...s.slots, slot] })),

  startPreview: (previews) => set({ previewSlots: previews }),

  acceptPreviewSlot: (id) =>
    set((s) => ({
      previewSlots: s.previewSlots?.map((p) =>
        p.id === id ? { ...p, preview_status: 'accepted' } : p,
      ) ?? null,
    })),

  rejectPreviewSlot: (id) =>
    set((s) => ({
      previewSlots: s.previewSlots?.map((p) =>
        p.id === id ? { ...p, preview_status: 'rejected' } : p,
      ) ?? null,
    })),

  clearPreview: () => set({ previewSlots: null }),

  openSwapSheet: (slot) => set({ swapTargetSlot: slot }),
  closeSwapSheet: () => set({ swapTargetSlot: null }),

  openSlideOver: (recipe) => set({ slideOverRecipe: recipe }),
  closeSlideOver: () => set({ slideOverRecipe: null }),

  setRegenerating: (v) => set({ isRegenerating: v }),
}))
