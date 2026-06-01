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
    <label className="flex items-center gap-1.5 text-[12px] text-gray-600">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Project</span>
      <select
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[12px] outline-none focus:border-usd-indigo"
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
