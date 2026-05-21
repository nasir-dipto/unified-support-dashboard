import type { SlaPolicy } from '@usd/shared-types';
import { defaultSlaPolicy } from '@usd/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import {
  useNotificationPreferences,
  useSaveNotificationPreferences,
  useSaveSlaPolicy,
  useSlaPolicy,
} from '../../hooks/useSettings';

const PRIORITIES: (keyof SlaPolicy)[] = ['critical', 'high', 'medium', 'low'];

/**
 * Admin settings: SLA policy hours and notification preferences.
 */
export function AdminSettingsTab(): ReactElement {
  const slaQuery = useSlaPolicy();
  const saveSla = useSaveSlaPolicy();
  const prefsQuery = useNotificationPreferences();
  const savePrefs = useSaveNotificationPreferences();
  const [sla, setSla] = useState<SlaPolicy>(defaultSlaPolicy);
  const [slaBreachEmail, setSlaBreachEmail] = useState(true);
  const [criticalTicketEmail, setCriticalTicketEmail] = useState(true);
  const [churnRiskInApp, setChurnRiskInApp] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (slaQuery.data !== undefined) {
      setSla(slaQuery.data);
    }
  }, [slaQuery.data]);

  useEffect(() => {
    if (prefsQuery.data !== undefined) {
      setSlaBreachEmail(prefsQuery.data.slaBreachEmail);
      setCriticalTicketEmail(prefsQuery.data.criticalTicketEmail);
      setChurnRiskInApp(prefsQuery.data.churnRiskInApp);
    }
  }, [prefsQuery.data]);

  const onSave = (): void => {
    setMessage(null);
    void Promise.all([
      saveSla.mutateAsync(sla),
      savePrefs.mutateAsync({
        slaBreachEmail,
        criticalTicketEmail,
        churnRiskInApp,
      }),
    ]).then(() => {
      setMessage('Settings saved.');
    });
  };

  return (
    <div className="max-w-lg space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-bold text-gray-900">SLA policy (hours to resolve)</h3>
        <div className="grid grid-cols-2 gap-3">
          {PRIORITIES.map((p) => (
            <label key={p} className="text-sm">
              <span className="mb-1 block font-semibold capitalize text-gray-700">{p}</span>
              <input
                type="number"
                min={0.5}
                step={0.5}
                className="w-full rounded-md border border-gray-200 px-3 py-2"
                value={sla[p]}
                onChange={(e) => {
                  setSla((s) => ({ ...s, [p]: Number(e.target.value) }));
                }}
              />
            </label>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-3 text-sm font-bold text-gray-900">Notification preferences</h3>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={slaBreachEmail}
              onChange={(e) => { setSlaBreachEmail(e.target.checked); }}
            />
            Email on SLA breach risk (&lt;25% remaining)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={criticalTicketEmail}
              onChange={(e) => { setCriticalTicketEmail(e.target.checked); }}
            />
            Email on critical ticket created
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={churnRiskInApp}
              onChange={(e) => { setChurnRiskInApp(e.target.checked); }}
            />
            In-app alert on churn risk (sentiment batch)
          </label>
        </div>
      </section>
      <button
        type="button"
        onClick={onSave}
        disabled={saveSla.isPending || savePrefs.isPending}
        className="rounded-md bg-usd-indigo px-4 py-2 text-sm font-bold text-white"
      >
        Save settings
      </button>
      {message !== null ? <p className="text-sm text-gray-600">{message}</p> : null}
    </div>
  );
}
