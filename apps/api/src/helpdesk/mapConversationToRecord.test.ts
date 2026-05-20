import { describe, expect, it } from 'vitest';
import {
  extractHdConversationBody,
  mapConversationToRecord,
  mapHdConversationSource,
} from './mapConversationToRecord.js';

describe('mapConversationToRecord', () => {
  it('maps NOTES to hd_note', () => {
    expect(mapHdConversationSource({ type: 'NOTES' })).toBe('hd_note');
  });

  it('maps EMAIL to hd_email', () => {
    expect(mapHdConversationSource({ type: 'EMAIL' })).toBe('hd_email');
  });

  it('maps conversation row with id', () => {
    const rec = mapConversationToRecord({
      orgId: 'o',
      ticketId: 'hd_12',
      conversation: {
        id: '999',
        type: 'NOTES',
        description: 'Internal note text',
        created_time: '2026-02-01T12:00:00Z',
        sender: { name: 'Tech', email_id: 'tech@co.com' },
      },
    });
    expect(rec?.commentId).toBe('hd_999');
    expect(rec?.commentSource).toBe('hd_note');
    expect(rec?.body).toBe('Internal note text');
  });

  it('extractHdConversationBody reads description string', () => {
    expect(extractHdConversationBody({ description: '  hello  ' })).toBe('hello');
  });
});
