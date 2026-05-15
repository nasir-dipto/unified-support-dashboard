import { describe, expect, it } from 'vitest';
import { httpOriginToWsOrigin } from './useWebSocket';

describe('httpOriginToWsOrigin', () => {
  it('maps http to ws and https to wss', () => {
    expect(httpOriginToWsOrigin('http://localhost:3001')).toBe('ws://localhost:3001');
    expect(httpOriginToWsOrigin('https://api.example.com')).toBe('wss://api.example.com');
  });
});
