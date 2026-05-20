/**
 * Extracts and parses a JSON object from a Claude/Bedrock text response.
 */
export function parseModelJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(trimmed);
  const inner = fenced?.[1];
  const candidate = inner !== undefined ? inner.trim() : trimmed;
  const parsed: unknown = JSON.parse(candidate);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Model output is not a JSON object');
  }
  return parsed as Record<string, unknown>;
}
