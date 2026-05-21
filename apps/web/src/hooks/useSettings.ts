import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationPreferences, SlaPolicy, SmtpSettings } from '@usd/shared-types';
import {
  fetchNotificationPreferences,
  fetchSlaPolicy,
  fetchSmtpSettings,
  saveNotificationPreferences,
  saveSlaPolicy,
  saveSmtpSettings,
  testSmtp,
} from '../api/settings';
import { useAuthStore } from '../store/auth.store';

/**
 * TanStack Query: org SLA policy (admin).
 */
export function useSlaPolicy() {
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useQuery({
    queryKey: ['settings', 'sla', orgId],
    queryFn: fetchSlaPolicy,
    enabled: orgId !== undefined && orgId.length > 0,
  });
}

/**
 * Mutation: save SLA policy.
 */
export function useSaveSlaPolicy() {
  const qc = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useMutation({
    mutationFn: (policy: SlaPolicy) => saveSlaPolicy(policy),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['settings', 'sla', orgId] });
      await qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

/**
 * TanStack Query: SMTP settings.
 */
export function useSmtpSettings() {
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useQuery({
    queryKey: ['settings', 'smtp', orgId],
    queryFn: fetchSmtpSettings,
    enabled: orgId !== undefined && orgId.length > 0,
  });
}

/**
 * Mutation: save SMTP settings.
 */
export function useSaveSmtpSettings() {
  const qc = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useMutation({
    mutationFn: (settings: SmtpSettings) => saveSmtpSettings(settings),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['settings', 'smtp', orgId] });
    },
  });
}

/**
 * Mutation: send SMTP test email.
 */
export function useTestSmtp() {
  return useMutation({
    mutationFn: (toEmail?: string) => testSmtp(toEmail),
  });
}

/**
 * TanStack Query: notification preferences.
 */
export function useNotificationPreferences() {
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useQuery({
    queryKey: ['settings', 'preferences', orgId],
    queryFn: fetchNotificationPreferences,
    enabled: orgId !== undefined && orgId.length > 0,
  });
}

/**
 * Mutation: save notification preferences.
 */
export function useSaveNotificationPreferences() {
  const qc = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useMutation({
    mutationFn: (prefs: NotificationPreferences) => saveNotificationPreferences(prefs),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['settings', 'preferences', orgId] });
    },
  });
}
