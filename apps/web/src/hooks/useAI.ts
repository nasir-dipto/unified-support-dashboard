import { useMutation } from '@tanstack/react-query';
import { invokeAi, type InvokeAiParams } from '../api/ai';

/**
 * TanStack mutation for POST /api/ai/invoke.
 */
export function useAiInvoke() {
  return useMutation({
    mutationFn: async (params: InvokeAiParams) => invokeAi(params),
  });
}
