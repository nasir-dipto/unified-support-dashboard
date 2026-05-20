import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { getServerEnv } from '../config/loadEnv.js';
import { parseModelJson } from '../ai/parseModelJson.js';

const BEDROCK_TIMEOUT_MS = 10_000;

let client: BedrockRuntimeClient | undefined;

/**
 * Returns true when AI should use mock responses (no Bedrock calls).
 */
export function isMockAiEnabled(): boolean {
  const env = getServerEnv();
  return env.USE_MOCK_AI === 'true';
}

/**
 * Lazily constructs the Bedrock Runtime client.
 */
function getBedrockClient(): BedrockRuntimeClient {
  if (client === undefined) {
    const env = getServerEnv();
    client = new BedrockRuntimeClient({
      region: env.AWS_REGION,
    });
  }
  return client;
}

/**
 * Invokes Claude on Bedrock with a 10s timeout. Returns parsed JSON from the model text.
 */
export async function invokeBedrockJson(prompt: string): Promise<Record<string, unknown>> {
  const env = getServerEnv();
  const modelId = env.BEDROCK_MODEL_ID;
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, BEDROCK_TIMEOUT_MS);

  try {
    const out = await getBedrockClient().send(
      new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: new TextEncoder().encode(body),
      }),
      { abortSignal: controller.signal },
    );
    const raw = new TextDecoder().decode(out.body);
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Invalid Bedrock response envelope');
    }
    const envelope = parsed as Record<string, unknown>;
    const content = envelope.content;
    if (!Array.isArray(content) || content.length === 0) {
      throw new Error('Bedrock response missing content');
    }
    const first: unknown = content[0];
    if (typeof first !== 'object' || first === null) {
      throw new Error('Bedrock content block invalid');
    }
    const text = (first as { text?: unknown }).text;
    if (typeof text !== 'string') {
      throw new Error('Bedrock content text missing');
    }
    return parseModelJson(text);
  } finally {
    clearTimeout(timer);
  }
}
