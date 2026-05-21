import type { KbDraftResponse } from '@usd/shared-types';
import { usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { useCreateKbArticle } from '../../hooks/useKb';

export type KbDraftFormProps = {
  draft: KbDraftResponse;
  onSaved?: () => void;
};

/**
 * Editable KB draft form — save creates a draft (no embedding until publish).
 */
export function KbDraftForm(props: KbDraftFormProps): ReactElement {
  const { draft, onSaved } = props;
  const createKb = useCreateKbArticle();
  const [title, setTitle] = useState(draft.title);
  const [problem, setProblem] = useState(draft.problem);
  const [rootCause, setRootCause] = useState(draft.rootCause);
  const [resolutionSteps, setResolutionSteps] = useState(draft.resolutionSteps);
  const [tags, setTags] = useState(draft.tags.join(', '));

  const saveDraft = (): void => {
    void createKb
      .mutateAsync({
        title: title.trim(),
        problem: problem.trim(),
        rootCause: rootCause.trim(),
        resolutionSteps: resolutionSteps.trim(),
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
        sourceTicketIds: draft.sourceTicketIds,
      })
      .then(() => {
        onSaved?.();
      });
  };

  return (
    <div className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
      {draft.degraded === true ? (
        <p className="text-xs text-amber-700">AI degraded — review fields before saving.</p>
      ) : null}
      <label className="block text-xs font-bold uppercase text-gray-500">
        Title
        <input
          className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          value={title}
          onChange={(e) => { setTitle(e.target.value); }}
        />
      </label>
      <label className="block text-xs font-bold uppercase text-gray-500">
        Problem
        <textarea
          className="mt-1 min-h-[60px] w-full rounded-lg border border-gray-200 p-2 text-sm"
          value={problem}
          onChange={(e) => { setProblem(e.target.value); }}
        />
      </label>
      <label className="block text-xs font-bold uppercase text-gray-500">
        Root cause
        <textarea
          className="mt-1 min-h-[50px] w-full rounded-lg border border-gray-200 p-2 text-sm"
          value={rootCause}
          onChange={(e) => { setRootCause(e.target.value); }}
        />
      </label>
      <label className="block text-xs font-bold uppercase text-gray-500">
        Resolution steps
        <textarea
          className="mt-1 min-h-[80px] w-full rounded-lg border border-gray-200 p-2 text-sm"
          value={resolutionSteps}
          onChange={(e) => { setResolutionSteps(e.target.value); }}
        />
      </label>
      <label className="block text-xs font-bold uppercase text-gray-500">
        Tags (comma-separated)
        <input
          className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          value={tags}
          onChange={(e) => { setTags(e.target.value); }}
        />
      </label>
      <button
        type="button"
        disabled={createKb.isPending}
        onClick={saveDraft}
        className="w-full rounded-lg py-2 text-sm font-bold text-white disabled:opacity-60"
        style={{ backgroundColor: usdColors.indigo }}
      >
        {createKb.isPending ? 'Saving…' : 'Save as KB draft'}
      </button>
    </div>
  );
}
