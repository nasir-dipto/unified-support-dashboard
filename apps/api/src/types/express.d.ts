import type { SupportRole, TicketApiDto } from '@usd/shared-types';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        orgId: string;
        email: string;
        roles: SupportRole[];
        displayName?: string;
      };
      accessTokenRaw?: string;
      ticket?: TicketApiDto;
    }
  }
}

export {};
