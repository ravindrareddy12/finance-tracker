export const colors = {
  primary:      '#2563EB',
  primaryDark:  '#1E3A8A',
  primarySoft:  '#EFF6FF',
  background:   '#F8FAFC',
  surface:      '#FFFFFF',
  border:       '#E2E8F0',
  text:         '#0F172A',
  textMuted:    '#64748B',
  textSubtle:   '#94A3B8',
  positive:     '#059669',
  positiveSoft: '#ECFDF5',
  negative:     '#DC2626',
  negativeSoft: '#FEF2F2',
  warning:      '#B45309',
  warningSoft:  '#FFFBEB',
  white:        '#FFFFFF',
} as const;

// Category colors match the web dashboard
export const categoryColors = {
  us:    '#3B82F6',
  india: '#10B981',
  mf:    '#F59E0B',
  re:    '#F97316',
  addl:  '#06B6D4',
  loans: '#8B5CF6',
  cash:  '#14B8A6',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius  = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const font = {
  caption: { fontSize: 12, color: colors.textMuted },
  label:   { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const, color: colors.textSubtle },
  body:    { fontSize: 15, color: colors.text },
  title:   { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  amount:  { fontSize: 22, fontWeight: '700' as const, color: colors.text },
};
