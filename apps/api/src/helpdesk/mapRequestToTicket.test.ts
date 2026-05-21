import { describe, expect, it } from 'vitest';
import {
  mapHdPriorityName,
  mapHdRequestToTicket,
  mapHdStatusName,
  normalizeHdDescription,
} from './mapRequestToTicket.js';

describe('mapHdPriorityName', () => {
  it('maps urgent to critical', () => {
    expect(mapHdPriorityName('Urgent')).toBe('critical');
  });
  it('defaults unknown to medium', () => {
    expect(mapHdPriorityName(undefined)).toBe('medium');
  });
});

describe('mapHdStatusName', () => {
  it('maps On Hold to pending', () => {
    expect(mapHdStatusName('On Hold')).toBe('pending');
  });
  it('maps resolved', () => {
    expect(mapHdStatusName('Resolved')).toBe('resolved');
  });
});

describe('normalizeHdDescription', () => {
  it('returns string as-is', () => {
    expect(normalizeHdDescription('note')).toBe('note');
  });
});

describe('mapHdRequestToTicket', () => {
  it('builds helpdesk ticket id and customerEmail', () => {
    const createdMs = 1_736_000_000_000;
    const updatedMs = 1_736_086_400_000;
    const rec = mapHdRequestToTicket({
      orgId: 'org-1',
      request: {
        id: 9001,
        display_id: { value: '12', display_value: '#12' },
        subject: 'Printer issue',
        status: { name: 'Open' },
        priority: { name: 'Medium' },
        technician: { name: 'Jane Agent' },
        requester: { email_id: 'user@acme.test' },
        created_time: { value: createdMs },
        updated_time: { value: updatedMs },
      },
      nowIso: '2020-01-01T00:00:00.000Z',
    });
    expect(rec.ticketId).toBe('hd_12');
    expect(rec.externalId).toBe('12');
    expect(rec.internalId).toBe('9001');
    expect(rec.source).toBe('helpdesk');
    expect(rec.assigneeId).toBe('Jane Agent');
    expect(rec.customerEmail).toBe('user@acme.test');
    expect(rec.reporterId).toBe('user@acme.test');
    expect(rec.createdAt).toBe(new Date(createdMs).toISOString());
    expect(rec.updatedAt).toBe(new Date(updatedMs).toISOString());
  });

  it('omits customerEmail and assigneeId when API returns nulls', () => {
    const rec = mapHdRequestToTicket({
      orgId: 'org-1',
      request: {
        id: 42,
        display_id: { value: '42', display_value: '42' },
        subject: 'No contact',
        status: { name: 'Open' },
        priority: { name: 'Low' },
        technician: null,
        requester: { email_id: null, name: null, phone: null, mobile: null },
      },
      nowIso: '2020-01-01T00:00:00.000Z',
    });
    expect(rec.ticketId).toBe('hd_42');
    expect(rec.internalId).toBe('42');
    expect(rec.customerEmail).toBeUndefined();
    expect(rec.reporterId).toBeUndefined();
    expect(rec.assigneeId).toBeUndefined();
  });

  it('uses requester name when email_id is null', () => {
    const rec = mapHdRequestToTicket({
      orgId: 'org-1',
      request: {
        id: 43,
        display_id: { value: '43', display_value: '43' },
        subject: 'Walk-in',
        status: { name: 'Open' },
        priority: { name: 'Medium' },
        technician: { name: null },
        requester: { email_id: null, name: 'Desk User' },
      },
      nowIso: '2020-01-01T00:00:00.000Z',
    });
    expect(rec.customerEmail).toBeUndefined();
    expect(rec.reporterId).toBe('Desk User');
    expect(rec.assigneeId).toBeUndefined();
    expect(rec.internalId).toBe('43');
  });

  it('accepts display_id as a string (REST list shape)', () => {
    const rec = mapHdRequestToTicket({
      orgId: 'org-1',
      request: {
        id: '999',
        display_id: '88',
        subject: 'Scalar display',
        status: { name: 'Open' },
        priority: { name: 'Low' },
      },
      nowIso: '2020-01-01T00:00:00.000Z',
    });
    expect(rec.ticketId).toBe('hd_88');
    expect(rec.externalId).toBe('88');
    expect(rec.internalId).toBe('999');
  });
});
