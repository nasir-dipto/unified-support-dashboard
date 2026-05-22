import type { InviteUserRequest, SupportRole } from '@usd/shared-types';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { useInviteUser } from '../../hooks/useUsers.js';

const ROLES: SupportRole[] = ['technician', 'manager', 'super_admin'];

export type InviteUserFormProps = {
  onSuccess?: () => void;
};

/**
 * Form to invite a user by email (super_admin only).
 */
export function InviteUserForm(props: InviteUserFormProps): ReactElement {
  const { onSuccess } = props;
  const invite = useInviteUser();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<SupportRole>('technician');
  const [message, setMessage] = useState<string | undefined>();

  return (
    <form
      className="max-w-md space-y-4 rounded-lg border border-gray-100 bg-gray-50 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void (async () => {
          setMessage(undefined);
          const body: InviteUserRequest = { email, role };
          try {
            await invite.mutateAsync(body);
            setEmail('');
            setMessage(`Invitation sent to ${email}`);
            onSuccess?.();
          } catch {
            setMessage('Failed to send invitation. Check SMTP configuration.');
          }
        })();
      }}
    >
      <h3 className="text-sm font-bold text-gray-900">Invite user</h3>
      <label className="block text-sm font-semibold text-gray-700">
        Email
        <input
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          value={email}
          onChange={(ev) => {
            setEmail(ev.target.value);
          }}
        />
      </label>
      <label className="block text-sm font-semibold text-gray-700">
        Role
        <select
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          value={role}
          onChange={(ev) => {
            setRole(ev.target.value as SupportRole);
          }}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      {message !== undefined ? (
        <p className={`text-sm ${message.includes('Failed') ? 'text-red-600' : 'text-green-700'}`}>
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={invite.isPending}
        className="rounded-lg bg-usd-indigo px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        Send invitation
      </button>
    </form>
  );
}
