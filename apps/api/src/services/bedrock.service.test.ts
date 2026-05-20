import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetServerEnvForTests, loadServerEnv } from '../config/loadEnv.js';

const sendMock = vi.fn();

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: vi.fn(() => ({ send: sendMock })),
  InvokeModelCommand: vi.fn((input: unknown) => input),
}));

describe('bedrock.service', () => {
  beforeEach(() => {
    resetServerEnvForTests();
    process.env.USE_MOCK_AI = 'false';
    process.env.BEDROCK_MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    process.env.JWT_PRIVATE_KEY = 'k';
    process.env.JWT_PUBLIC_KEY = 'p';
    loadServerEnv();
    sendMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.USE_MOCK_AI;
    delete process.env.BEDROCK_MODEL_ID;
    resetServerEnvForTests();
  });

  it('isMockAiEnabled is true when USE_MOCK_AI=true', async () => {
    resetServerEnvForTests();
    process.env.USE_MOCK_AI = 'true';
    process.env.JWT_PRIVATE_KEY = 'k';
    process.env.JWT_PUBLIC_KEY = 'p';
    loadServerEnv();
    const { isMockAiEnabled } = await import('./bedrock.service.js');
    expect(isMockAiEnabled()).toBe(true);
  });

  it('invokeBedrockJson parses model JSON from content block', async () => {
    const payload = {
      content: [{ type: 'text', text: '{"engineerAction":"Check logs","riskLevel":"LOW"}' }],
    };
    sendMock.mockResolvedValue({
      body: new TextEncoder().encode(JSON.stringify(payload)),
    });
    const { invokeBedrockJson } = await import('./bedrock.service.js');
    const out = await invokeBedrockJson('prompt');
    expect(out.engineerAction).toBe('Check logs');
  });

  it('invokeBedrockJson throws on timeout', async () => {
    sendMock.mockRejectedValue(new Error('AbortError'));
    const { invokeBedrockJson } = await import('./bedrock.service.js');
    await expect(invokeBedrockJson('prompt')).rejects.toThrow();
  });
});
