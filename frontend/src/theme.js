// ============================================================
// SaiFit Design System — Single Source of Truth
// All colors, typography, spacing, radii, and shadows live here.
// Never use a raw hex color, pixel value, or fontSize outside
// of this file — always reference a token.
// ============================================================

export const theme = {

  // ── COLOR TOKENS ──────────────────────────────────────────
  colors: {
    // Brand
    primary: '#FF2D55',          // Velvet Crimson — CTAs, active states, AI accents
    primaryLight: 'rgba(255, 45, 85, 0.08)',   // Tinted bg for primary surfaces
    primaryBorder: 'rgba(255, 45, 85, 0.15)',  // Border on primary-tinted cards

    // Semantic — Semantic states drive trust and clarity
    success: '#10B981',          // Emerald Green — macros met, goals hit
    successLight: 'rgba(16, 185, 129, 0.08)',
    warning: '#F59E0B',          // Amber — streaks, warnings, pins
    warningLight: 'rgba(245, 158, 11, 0.08)',
    danger: '#FF3B30',           // Red — delete, error, logout
    dangerLight: 'rgba(255, 59, 48, 0.08)',
    info: '#007AFF',             // Sapphire Blue — hydration, links
    infoLight: 'rgba(0, 122, 255, 0.08)',

    // Surfaces
    background: '#FAFBFC',       // Ultra-premium off-white canvas
    surface: '#FFFFFF',          // Card surfaces (white)
    surfaceElevated: '#FFFFFF',  // Modals, sheets — same shade, different shadow

    // Borders
    border: '#F2F3F5',           // Hairline borders between elements
    borderStrong: '#E5E6E8',     // Slightly stronger for inputs

    // Text
    textPrimary: '#1C1C1E',      // Dark Charcoal — primary body/heading
    textSecondary: '#8E8E93',    // Slate Grey — subtitles, labels, timestamps
    textTertiary: '#C7C7CC',     // Light grey — placeholders, disabled

    // AI Accent (matches primary but named for semantic clarity)
    aiAccent: '#FF2D55',
    aiAccentLight: 'rgba(255, 45, 85, 0.08)',

    // Misc helpers (kept for backward compat with existing code)
    secondary: '#007AFF',
    secondaryLight: 'rgba(0, 122, 255, 0.08)',
    orange: '#FF9500',
    green: '#10B981',
    yellow: '#F59E0B',
    card: '#FFFFFF',
    darkBase: '#1C1C1E',
    darkPillBg: 'rgba(0, 0, 0, 0.04)',
    darkSheetOverlay: 'rgba(0, 0, 0, 0.4)',
    accentPinkLight: 'rgba(255, 45, 85, 0.08)',
    accentBlueLight: 'rgba(0, 122, 255, 0.08)',
    accentGreenLight: 'rgba(16, 185, 129, 0.08)',
    accentYellowLight: 'rgba(245, 158, 11, 0.08)',
  },

  // ── TYPOGRAPHY SCALE ──────────────────────────────────────
  // All font sizes are sp values (same unit in RN).
  typography: {
    h1: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5, lineHeight: 40, color: '#1C1C1E' },
    h2: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, lineHeight: 36, color: '#1C1C1E' },
    h3: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, lineHeight: 28, color: '#1C1C1E' },
    h4: { fontSize: 18, fontWeight: '600', letterSpacing: -0.2, lineHeight: 24, color: '#1C1C1E' },
    h5: { fontSize: 16, fontWeight: '600', letterSpacing: -0.1, lineHeight: 22, color: '#1C1C1E' },

    body: { fontSize: 15, fontWeight: '500', lineHeight: 22, color: '#1C1C1E' },
    bodySmall: { fontSize: 13, fontWeight: '500', lineHeight: 18, color: '#1C1C1E' },

    label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, lineHeight: 16, color: '#8E8E93' },
    labelSmall: { fontSize: 9, fontWeight: '800', letterSpacing: 1, lineHeight: 12, color: '#8E8E93' },

    caption: { fontSize: 12, fontWeight: '600', lineHeight: 16, color: '#8E8E93' },
    captionStrong: { fontSize: 12, fontWeight: '700', lineHeight: 16, color: '#8E8E93' },

    // Number / metric displays
    metric: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5, lineHeight: 36, color: '#1C1C1E' },
    metricSmall: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2, lineHeight: 22, color: '#1C1C1E' },
  },

  // ── SPACING ───────────────────────────────────────────────
  // Use these everywhere — never raw numbers for margin/padding.
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    huge: 32,
  },

  // ── BORDER RADII ─────────────────────────────────────────
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },

  // ── SHADOWS / ELEVATION ───────────────────────────────────
  shadows: {
    // Barely perceptible — cards on white backgrounds
    soft: {
      shadowColor: '#000',
      shadowOpacity: 0.03,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 1,
    },
    // Standard card elevation
    card: {
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    // Modal / floating panel
    premium: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    // Glowing colored shadow (e.g. primary CTA buttons)
    primaryGlow: {
      shadowColor: '#FF2D55',
      shadowOpacity: 0.22,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
  },

  // ── ANIMATION TOKENS ──────────────────────────────────────
  animations: {
    durationShort: 150,
    durationDefault: 250,
    durationLong: 400,
    springShort: { tension: 40, friction: 7 },
    springBouncy: { tension: 50, friction: 4 },
  }
};
