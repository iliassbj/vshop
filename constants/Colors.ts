const palette = {
  primaryYellow: '#FACC15',
  primarySoft: '#FEF9C3',
  cta: '#92400E',
  background: '#FFFBEB',
  surface: '#FFFFFF',
  border: '#FDE68A',
  textPrimary: '#1C1917',
  textSecondary: '#57534E',
  priceGreen: '#15803D',
  discountRed: '#DC2626',
  ratingAmber: '#F59E0B',
  favoriteRose: '#E11D48',
};

export default {
  palette,
  light: {
    text: palette.textPrimary,
    background: palette.background,
    tint: palette.cta,
    tabIconDefault: palette.textSecondary,
    tabIconSelected: palette.cta,
  },
  dark: {
    text: palette.textPrimary,
    background: palette.background,
    tint: palette.cta,
    tabIconDefault: palette.textSecondary,
    tabIconSelected: palette.cta,
  },
};
