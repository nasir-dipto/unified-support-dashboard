import type { ReactElement } from 'react';

export type ProjectFilterProps = {
  value: string;
  projects: Record<string, number>;
  onChange: (project: string) => void;
};

/**
 * Project dropdown with per-project counts from API facets.
 */
export function ProjectFilter(props: ProjectFilterProps): ReactElement {
  const { value, projects, onChange } = props;
  const keys = Object.keys(projects).sort((a, b) => a.localeCompare(b));

  return (
    <label className="flex min-w-[10rem] flex-col gap-1.5 text-[12px] text-gray-600">
      <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Project</span>
      <select
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[13px] outline-none focus:border-usd-indigo"
        aria-label="Filter by project"
      >
        <option value="">All Projects</option>
        {keys.map((key) => (
          <option key={key} value={key}>
            {key} ({projects[key] ?? 0})
          </option>
        ))}
      </select>
    </label>
  );
}
