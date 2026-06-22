import type React from 'react';

// ─── Brand palette ──────────────────────────────────────────────────────────
export const BRAND = {
  red:             '#D72626',
  redDark:         '#B31F1F',
  redBadge:        '#B31F1F',
  redSubtle:       '#ffeaea',
  black:           '#111111',
  white:           '#FFFFFF',
  gray50:          '#F6F6F6',
  gray100:         '#F0F0F0',
  gray200:         '#E5E5E5',
  gray300:         '#CCCCCC',
  gray400:         '#AAAAAA',
  gray600:         '#666666',
  gray700:         '#444444',
  sidebar:         '#141414',
  sidebarLine:     '#2A2A2A',
  sidebarMuted:    '#888888',
  sidebarSubtext:  '#888888',
  green:           '#1a7a40',
  greenSubtle:     '#e6f9ee',
  blue:            '#185fa5',
  blueSubtle:      '#e8f0fb',
  amber:           '#854f0b',
  amberSubtle:     '#fef3e2',
} as const;

// ─── Typography scale ────────────────────────────────────────────────────────
export const TYPE = {
  xs:   11,
  sm:   12,
  base: 13,
  md:   14,
  lg:   15,
  xl:   18,
  '2xl': 22,
  '3xl': 28,
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const SPACE = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
} as const;

// ─── Radius ──────────────────────────────────────────────────────────────────
export const RADIUS = {
  sm:  4,
  md:  6,
  lg:  10,
  xl:  14,
  full: 9999,
} as const;

// ─── Shared style tokens (S) ─────────────────────────────────────────────────
export const S = {
  // Containers
  card: {
    background:   BRAND.white,
    borderRadius: RADIUS.lg,
    border:       `1px solid ${BRAND.gray200}`,
    padding:      SPACE[6],
    marginBottom: SPACE[5],
  } as React.CSSProperties,

  cardFlush: {
    background:   BRAND.white,
    borderRadius: RADIUS.lg,
    border:       `1px solid ${BRAND.gray200}`,
    overflow:     'hidden',
    marginBottom: SPACE[5],
  } as React.CSSProperties,

  // Page-level
  pageTitle: {
    fontSize:      TYPE['2xl'],
    fontWeight:    800,
    color:         BRAND.black,
    letterSpacing: -0.5,
    lineHeight:    1.2,
    marginBottom:  0,
  } as React.CSSProperties,

  pageSubtitle: {
    fontSize:  TYPE.sm,
    color:     BRAND.gray600,
    marginTop: SPACE[1],
  } as React.CSSProperties,

  pageHeader: {
    display:       'flex',
    alignItems:    'center',
    justifyContent:'space-between',
    marginBottom:  SPACE[6],
    gap:           SPACE[4],
  } as React.CSSProperties,

  // Section titles inside cards
  cardTitle: {
    fontSize:     TYPE.md,
    fontWeight:   700,
    color:        BRAND.black,
    marginBottom: SPACE[4],
  } as React.CSSProperties,

  sectionLabel: {
    fontSize:      TYPE.xs,
    fontWeight:    700,
    color:         BRAND.gray600,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    marginBottom:  SPACE[2],
  } as React.CSSProperties,

  // KPI card
  kpiCard: {
    background:    BRAND.white,
    border:        `1px solid ${BRAND.gray200}`,
    borderRadius:  RADIUS.lg,
    padding:       `${SPACE[5]}px ${SPACE[6]}px`,
    display:       'flex',
    flexDirection: 'column' as const,
    gap:           6,
    flex:          1,
    minWidth:      200,
  } as React.CSSProperties,

  kpiValue: {
    fontSize:   TYPE['3xl'],
    fontWeight: 800,
    color:      BRAND.black,
    lineHeight: 1.1,
  } as React.CSSProperties,

  kpiLabel: {
    fontSize:      TYPE.xs,
    fontWeight:    700,
    color:         BRAND.gray600,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,

  // Error / alert banner
  errorBanner: {
    display:      'flex',
    alignItems:   'center',
    gap:          SPACE[2],
    padding:      `${SPACE[3]}px ${SPACE[4]}px`,
    borderRadius: RADIUS.md,
    background:   BRAND.redSubtle,
    border:       `1px solid #fbc9c9`,
    color:        BRAND.redBadge,
    fontSize:     TYPE.sm,
    fontWeight:   600,
    marginBottom: SPACE[4],
  } as React.CSSProperties,

  successBanner: {
    display:      'flex',
    alignItems:   'center',
    gap:          SPACE[2],
    padding:      `${SPACE[3]}px ${SPACE[4]}px`,
    borderRadius: RADIUS.md,
    background:   BRAND.greenSubtle,
    border:       `1px solid #a3dab8`,
    color:        BRAND.green,
    fontSize:     TYPE.sm,
    fontWeight:   600,
    marginBottom: SPACE[4],
  } as React.CSSProperties,

  // Form
  formGroup: {
    marginBottom: SPACE[4],
  } as React.CSSProperties,

  label: {
    fontSize:      TYPE.sm,
    fontWeight:    600,
    color:         BRAND.gray700,
    marginBottom:  SPACE[1],
    display:       'block',
    letterSpacing: 0.2,
  } as React.CSSProperties,

  input: {
    width:       '100%',
    padding:     `9px ${SPACE[3]}px`,
    border:      `1px solid ${BRAND.gray200}`,
    borderRadius: RADIUS.md,
    fontSize:    TYPE.base,
    outline:     'none',
    boxSizing:   'border-box' as const,
    fontFamily:  'inherit',
    color:       BRAND.black,
    background:  BRAND.white,
    transition:  'border-color 0.15s',
  } as React.CSSProperties,

  select: {
    width:       '100%',
    padding:     `9px ${SPACE[3]}px`,
    border:      `1px solid ${BRAND.gray200}`,
    borderRadius: RADIUS.md,
    fontSize:    TYPE.base,
    outline:     'none',
    background:  BRAND.white,
    boxSizing:   'border-box' as const,
    fontFamily:  'inherit',
    color:       BRAND.black,
  } as React.CSSProperties,

  // Table
  table: {
    width:           '100%',
    borderCollapse:  'collapse' as const,
    fontSize:        TYPE.base,
  } as React.CSSProperties,

  th: {
    textAlign:    'left' as const,
    padding:      `10px ${SPACE[3]}px`,
    background:   BRAND.gray50,
    color:        BRAND.gray600,
    fontWeight:   700,
    fontSize:     TYPE.xs,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    borderBottom: `1px solid ${BRAND.gray200}`,
    whiteSpace:   'nowrap' as const,
  } as React.CSSProperties,

  td: {
    padding:      `11px ${SPACE[3]}px`,
    borderBottom: `1px solid ${BRAND.gray100}`,
    color:        BRAND.black,
    fontSize:     TYPE.base,
  } as React.CSSProperties,

  // Misc
  divider: {
    height:     1,
    background: BRAND.gray200,
    margin:     `${SPACE[4]}px 0`,
  } as React.CSSProperties,

  emptyState: {
    textAlign:  'center' as const,
    padding:    `${SPACE[8]}px ${SPACE[6]}px`,
    color:      BRAND.gray400,
    fontSize:   TYPE.md,
  } as React.CSSProperties,
} as const;

// ─── Button helper ───────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type BtnSize    = 'sm' | 'md' | 'lg';

export function btnStyle(
  variant: BtnVariant = 'secondary',
  size: BtnSize = 'md',
): React.CSSProperties {
  const padding = size === 'sm' ? '6px 12px' : size === 'lg' ? '12px 22px' : '9px 18px';
  const fontSize = size === 'sm' ? TYPE.xs : size === 'lg' ? TYPE.md : TYPE.base;

  const base: React.CSSProperties = {
    display:       'inline-flex',
    alignItems:    'center',
    gap:           6,
    padding,
    borderRadius:  RADIUS.md,
    border:        'none',
    cursor:        'pointer',
    fontSize,
    fontWeight:    600,
    letterSpacing: 0.2,
    transition:    'opacity 0.15s, background 0.15s',
    fontFamily:    'inherit',
    whiteSpace:    'nowrap',
  };

  switch (variant) {
    case 'primary':   return { ...base, background: BRAND.red,       color: BRAND.white };
    case 'danger':    return { ...base, background: BRAND.redSubtle,  color: BRAND.redBadge, border: `1px solid #fbc9c9` };
    case 'ghost':     return { ...base, background: 'transparent',    color: BRAND.gray600, border: `1px solid ${BRAND.gray200}` };
    default:          return { ...base, background: BRAND.gray100,    color: BRAND.black };
  }
}

// ─── Badge helper ────────────────────────────────────────────────────────────
type BadgeColor = 'green' | 'red' | 'gray' | 'blue' | 'amber';

export function badgeStyle(color: BadgeColor = 'gray'): React.CSSProperties {
  const map: Record<BadgeColor, { bg: string; text: string; border: string }> = {
    green: { bg: BRAND.greenSubtle, text: BRAND.green,    border: '#a3dab8' },
    red:   { bg: BRAND.redSubtle,   text: BRAND.redBadge, border: '#fbc9c9' },
    blue:  { bg: BRAND.blueSubtle,  text: BRAND.blue,     border: '#bdd4f3' },
    amber: { bg: BRAND.amberSubtle, text: BRAND.amber,    border: '#f5d9a8' },
    gray:  { bg: BRAND.gray100,     text: BRAND.gray600,  border: BRAND.gray200 },
  };
  const { bg, text, border } = map[color];
  return {
    display:      'inline-flex',
    alignItems:   'center',
    gap:          4,
    padding:      '3px 10px',
    borderRadius: RADIUS.full,
    fontSize:     TYPE.xs,
    fontWeight:   700,
    background:   bg,
    color:        text,
    border:       `1px solid ${border}`,
    whiteSpace:   'nowrap',
  };
}
