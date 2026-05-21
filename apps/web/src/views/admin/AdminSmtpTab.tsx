import type { SmtpSettings } from '@usd/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import {
  useSaveSmtpSettings,
  useSmtpSettings,
  useTestSmtp,
} from '../../hooks/useSettings';

const defaultForm: SmtpSettings = {
  host: 'localhost',
  port: 1025,
  secure: false,
  fromEmail: 'noreply@usd.dev',
  fromName: 'Unified Support',
};

/**
 * SMTP configuration form (Mailhog defaults for local dev).
 */
export function AdminSmtpTab(): ReactElement {
  const query = useSmtpSettings();
  const save = useSaveSmtpSettings();
  const test = useTestSmtp();
  const userEmail = useAuthStore((s) => s.user?.email);
  const [form, setForm] = useState<SmtpSettings>(defaultForm);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (query.data !== undefined && query.data !== null) {
      setForm(query.data);
    }
  }, [query.data]);

  const onSave = (): void => {
    setMessage(null);
    void save.mutateAsync(form).then(() => {
      setMessage('SMTP settings saved.');
    });
  };

  const onTest = (): void => {
    setMessage(null);
    void test.mutateAsync(userEmail).then(() => {
      setMessage('Test email sent (check Mailhog at :8025).');
    });
  };

  const field = (
    label: string,
    key: keyof SmtpSettings,
    type: 'text' | 'number' | 'checkbox' = 'text',
  ): ReactElement => {
    if (type === 'checkbox') {
      return (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(form[key])}
            onChange={(e) => {
              setForm((f) => ({ ...f, [key]: e.target.checked }));
            }}
          />
          {label}
        </label>
      );
    }
    return (
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-gray-700">{label}</span>
        <input
          type={type}
          className="w-full rounded-md border border-gray-200 px-3 py-2"
          value={String(form[key] ?? '')}
          onChange={(e) => {
            const v = type === 'number' ? Number(e.target.value) : e.target.value;
            setForm((f) => ({ ...f, [key]: v }));
          }}
        />
      </label>
    );
  };

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-gray-500">
        Local dev: use Mailhog on port 1025 (no TLS). Production SMTP is stored per org in DynamoDB.
      </p>
      {field('Host', 'host')}
      {field('Port', 'port', 'number')}
      {field('TLS (secure)', 'secure', 'checkbox')}
      {field('Username', 'user')}
      {field('Password', 'password')}
      {field('From email', 'fromEmail')}
      {field('From name', 'fromName')}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={save.isPending}
          className="rounded-md bg-usd-indigo px-4 py-2 text-sm font-bold text-white"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onTest}
          disabled={test.isPending}
          className="rounded-md border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700"
        >
          Send test
        </button>
      </div>
      {message !== null ? <p className="text-sm text-gray-600">{message}</p> : null}
      {save.isError || test.isError ? (
        <p className="text-sm text-usd-red">Request failed. Check API logs.</p>
      ) : null}
    </div>
  );
}
