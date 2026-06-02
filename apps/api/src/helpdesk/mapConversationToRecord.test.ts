import { describe, expect, it } from 'vitest';
import {
  buildHdConversationCommentBody,
  extractHdConversationBody,
  htmlToPlainText,
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

  it('maps created_time SDP object to ISO createdAt', () => {
    const rec = mapConversationToRecord({
      orgId: 'o',
      ticketId: 'hd_12',
      conversation: {
        id: '100',
        type: 'NOTES',
        description: 'Note',
        created_time: {
          display_value: 'Jun 2, 2023 04:59 PM',
          value: '1685721558093',
        },
      },
    });
    expect(rec?.createdAt).toBe(new Date(1685721558093).toISOString());
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

  it('buildHdConversationCommentBody strips HTML and prefixes email subject', () => {
    const body = buildHdConversationCommentBody({
      type: 'EMAIL',
      subject: 'Printer offline',
      description: '<p>Please reset the device.</p>',
    });
    expect(body).toContain('Subject: Printer offline');
    expect(body).toContain('Please reset the device.');
    expect(body).not.toContain('<p>');
  });

  it('htmlToPlainText converts basic tags to newlines', () => {
    expect(htmlToPlainText('<p>Line one</p><br/><p>Line two</p>')).toContain('Line one');
    expect(htmlToPlainText('<p>Line one</p><br/><p>Line two</p>')).toContain('Line two');
  });

  it('htmlToPlainText decodes nbsp entities', () => {
    expect(htmlToPlainText('<p>Hello&nbsp;team</p>')).toBe('Hello team');
  });

  it('maps hydrated EMAIL conversation with sender and subject', () => {
    const rec = mapConversationToRecord({
      orgId: 'o',
      ticketId: 'hd_3',
      conversation: {
        id: '88',
        type: 'EMAIL',
        subject: 'Need help',
        description: '<p>Account locked</p>',
        created_time: '2026-03-01T09:00:00Z',
        sender: { name: 'Pat', email_id: 'pat@co.com' },
      },
    });
    expect(rec?.commentSource).toBe('hd_email');
    expect(rec?.body).toContain('Subject: Need help');
    expect(rec?.body).toContain('Account locked');
    expect(rec?.authorDisplayName).toBe('Pat');
    expect(rec?.authorEmail).toBe('pat@co.com');
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
