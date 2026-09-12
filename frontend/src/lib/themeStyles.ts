/**
 * Shared Tailwind utility style constants for consistent tokens across Teach&Learn components.
 */

export const STYLES = {
  // Modal containers & overlays
  modalBackdrop: 'fixed inset-0 bg-primary-text/40 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in',
  modalBackdropHeavy: 'fixed inset-0 bg-primary-text/50 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fade-in',
  modalCard: 'bg-surface border border-border-color rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4',
  modalCardLarge: 'bg-surface border border-border-color rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative',
  modalHeader: 'flex items-center justify-between pb-3 border-b border-border-color shrink-0',
  modalFooter: 'flex items-center justify-end gap-2 pt-3 border-t border-border-color shrink-0',
  modalCloseButton: 'p-1.5 hover:bg-elevated text-muted-text hover:text-primary-text rounded-xl transition-colors cursor-pointer',

  // Forms & Inputs
  inputBase: 'w-full bg-elevated border border-border-color rounded-xl p-2.5 text-xs text-primary-text outline-none focus:border-primary shadow-sm transition-all',
  inputSurface: 'w-full bg-surface border border-border-color rounded-xl p-2.5 text-xs text-primary-text outline-none focus:border-primary shadow-sm transition-all',
  formLabel: 'text-[10px] font-mono uppercase font-bold text-muted-text tracking-wider block mb-1',
  formLabelSubtle: 'text-[10px] font-semibold text-muted-text mb-1 uppercase tracking-wider block',

  // Cards & Surfaces
  cardSurface: 'bg-surface border border-border-color rounded-2xl p-4 shadow-sm transition-colors',
  cardElevated: 'bg-elevated/50 border border-border-color rounded-2xl p-4 shadow-sm transition-colors',
  cardHover: 'hover:border-primary/30 transition-colors',

  // Badges & Pills
  badgePill: 'text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1',
  badgeSuccess: 'bg-success/15 border-success/30 text-success',
  badgeWarning: 'bg-warning/15 border-warning/30 text-warning',
  badgeError: 'bg-error/15 border-error/30 text-error',
  badgePrimary: 'bg-primary/15 border-primary/30 text-primary',
  badgeSecondary: 'bg-secondary/15 border-secondary/30 text-secondary',

  // Typography
  subtleHeader: 'text-[10px] font-mono uppercase font-bold text-muted-text tracking-wider',
  cardTitle: 'text-xs font-bold text-primary-text font-display',
  sectionTitle: 'text-sm font-bold text-primary-text font-display',
} as const;
