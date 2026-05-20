import { describe, expect, it } from 'vitest';
import {
  extractHdConversationBody,
  mapConversationToRecord,
  mapHdConversationSource,
  mergeHdConversationWithNote,
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

  it('extractHdConversationBody reads SDP display_value object', () => {
    expect(
      extractHdConversationBody({
        description: { display_value: 'Note body from SDP', value: '1778860892126' },
      }),
    ).toBe('Note body from SDP');
  });

  it('mergeHdConversationWithNote copies description from notes row', () => {
    const merged = mergeHdConversationWithNote(
      { id: '4445000000193845', type: 'NOTES' },
      { id: '4445000000193845', description: 'Test comment iteration' },
    );
    const rec = mapConversationToRecord({
      orgId: 'o',
      ticketId: 'hd_1',
      conversation: merged,
    });
    expect(rec?.body).toBe('Test comment iteration');
  });

  it('uses created_by when sender is absent', () => {
    const rec = mapConversationToRecord({
      orgId: 'o',
      ticketId: 'hd_1',
      conversation: {
        id: '1',
        type: 'NOTES',
        description: 'body',
        created_by: { name: 'Agent', email_id: 'a@co.com' },
      },
    });
    expect(rec?.authorDisplayName).toBe('Agent');
    expect(rec?.authorEmail).toBe('a@co.com');
  });
});
