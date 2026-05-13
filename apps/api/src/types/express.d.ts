import type { SupportRole } from '@usd/shared-types';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        orgId: string;
        email: string;
        roles: SupportRole[];
      };
      accessTokenRaw?: string;
    }
  }
}

export {};
