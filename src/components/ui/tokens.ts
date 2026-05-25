export const BRAND = {
  red:          '#D72626',
  redDark:      '#B31F1F',
  black:        '#111111',
  white:        '#FFFFFF',
  gray50:       '#F6F6F6',
  gray100:      '#F0F0F0',
  gray200:      '#E5E5E5',
  gray400:      '#AAAAAA',
  gray600:      '#666666',
  sidebar:      '#141414',
  sidebarLine:  '#2A2A2A',
} as const;

export const S = {
  card: {
    background: BRAND.white,
    borderRadius: 10,
    border: `1px solid ${BRAND.gray200}`,
    padding: 24,
    marginBottom: 20,
  } as React.CSSProperties,

  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: BRAND.black,
    marginBottom: 16,
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '9px 12px',
    border: `1px solid ${BRAND.gray200}`,
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    color: BRAND.black,
    background: BRAND.white,
  } as React.CSSProperties,

  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#555',
    marginBottom: 4,
    display: 'block',
    letterSpacing: 0.3,
  } as React.CSSProperties,

  select: {
    width: '100%',
    padding: '9px 12px',
    border: `1px solid ${BRAND.gray200}`,
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    background: BRAND.white,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    color: BRAND.black,
  } as React.CSSProperties,

  th: {
    textAlign: 'left' as const,
    padding: '10px 12px',
    background: BRAND.gray100,
    color: '#555',
    fontWeight: 600,
    fontSize: 12,
    borderBottom: `1px solid ${BRAND.gray200}`,
  } as React.CSSProperties,

  td: {
    padding: '10px 12px',
    borderBottom: `1px solid ${BRAND.gray200}`,
    color: BRAND.black,
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 13,
  } as React.CSSProperties,

  formGroup: { marginBottom: 14 } as React.CSSProperties,
  divider: { height: 1, background: BRAND.gray200, margin: '16px 0' } as React.CSSProperties,
} as const;

import type React from 'react';

type BtnVariant = 'primary' | 'secondary' | 'danger';

export function btnStyle(variant: BtnVariant = 'secondary'): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 18px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.3,
    transition: 'opacity 0.15s',
    fontFamily: 'inherit',
  };
  if (variant === 'primary')   return { ...base, background: BRAND.red,    color: BRAND.white };
  if (variant === 'danger')    return { ...base, background: '#ffeaea',     color: BRAND.red   };
  return                              { ...base, background: BRAND.gray100, color: BRAND.black };
}

export function badgeStyle(color: 'green' | 'red' | 'gray' = 'gray'): React.CSSProperties {
  const map = {
    green: { bg: '#e6f9ee', text: '#1a7a40' },
    red:   { bg: '#ffeaea', text: BRAND.red  },
    gray:  { bg: '#f0f0f0', text: '#555'     },
  };
  const { bg, text } = map[color];
  return { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color: text };
}
