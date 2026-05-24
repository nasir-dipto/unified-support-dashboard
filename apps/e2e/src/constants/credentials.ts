export type DemoRole = 'admin' | 'manager' | 'technician';

export const DEMO_ORG_ID = 'demo-org';

export const DEMO_CREDENTIALS: Record<
  DemoRole,
  { email: string; password: string; orgId: string }
> = {
  admin: {
    email: 'admin@usd.dev',
    password: 'Admin123!',
    orgId: DEMO_ORG_ID,
  },
  manager: {
    email: 'manager@usd.dev',
    password: 'Mgr123!',
    orgId: DEMO_ORG_ID,
  },
  technician: {
    email: 'technician@usd.dev',
    password: 'Tech123!',
    orgId: DEMO_ORG_ID,
  },
};

/** Display name used for technician-assigned tickets in local seed/sync data. */
export const TECHNICIAN_ASSIGNEE_LABEL = 'Nasir Dipto Personal';
