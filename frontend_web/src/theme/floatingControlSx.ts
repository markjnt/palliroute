import type { SxProps, Theme } from '@mui/material/styles';

/** Gemeinsame Paper-Oberfläche für schwebende Controls (nicht im Theme: kontextspezifisch). */
export const mapFloatingSurfaceSx: SxProps<Theme> = {
  bgcolor: 'background.paper',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
};

/** Outlined-Buttons auf der Karte / Kreiswahl-kompakt — Theme allein wirkt dort oft zu durchscheinend. */
export const mapFloatingControlSx: SxProps<Theme> = {
  ...mapFloatingSurfaceSx,
  '&:hover': {
    bgcolor: 'grey.100',
  },
};

/** Gleiches Maß wie Vollbild / Chevron in MainLayout (Outlined primary 40×40). */
export const MAP_HEADER_TOOLBAR_PX = 40;

/** Wie `SIDEBAR_HEADER_HEIGHT` in MainLayout — Vollbild vertikal in dieser Zeile zentriert. */
export const SIDEBAR_HEADER_HEIGHT_PX = 64;

/** `top` für schwebende Karten-Controls: gleiche vertikale Mitte wie Sidebar-Vollbild (64px Zeile, 40px Button). */
export const MAP_OVERLAY_TOP_PX = (SIDEBAR_HEADER_HEIGHT_PX - MAP_HEADER_TOOLBAR_PX) / 2;

/** Identisch zu Sidebar-Vollbild & Ein-/Ausklapp — auch für Karten-Burger / Pflegeheim-Auge. */
export const floatingOutlineIconButtonSx: SxProps<Theme> = {
  minWidth: MAP_HEADER_TOOLBAR_PX,
  width: MAP_HEADER_TOOLBAR_PX,
  height: MAP_HEADER_TOOLBAR_PX,
  p: 0,
  boxSizing: 'border-box',
  ...mapFloatingControlSx,
};

/** Alias: Karten-Toolbar nutzt dieselbe Fläche wie Vollbild. */
export const mapToolbarIconButtonSx = floatingOutlineIconButtonSx;
