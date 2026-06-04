/** UnifyDesk brand palette */
export const usdColors = {
  indigo: '#4F46E5',
  blue: '#2563EB',
  purple: '#7C3AED',
  teal: '#059669',
  amber: '#D97706',
  red: '#DC2626',
  green: '#16A34A',
  gray: '#6B7280',
  coral: '#EA580C',
} as const;

export type UsdColorKey = keyof typeof usdColors;

export const priorityColors: Record<string, string> = {
  critical: usdColors.red,
  high: usdColors.coral,
  medium: usdColors.amber,
  low: usdColors.teal,
};

export const statusColors: Record<string, string> = {
  open: usdColors.blue,
  in_progress: usdColors.purple,
  pending: usdColors.amber,
  resolved: usdColors.teal,
  closed: usdColors.gray,
  blocked: usdColors.gray,
  escalated: usdColors.red,
};

export const sentimentColors: Record<string, string> = {
  positive: usdColors.teal,
  neutral: usdColors.amber,
  negative: usdColors.red,
};
