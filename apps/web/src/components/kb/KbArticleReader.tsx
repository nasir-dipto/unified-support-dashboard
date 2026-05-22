import type { KbArticle } from '@usd/shared-types';
import type { ReactElement } from 'react';

export type KbArticleReaderProps = {
  article: KbArticle;
};

/**
 * Full published KB article reader.
 */
export function KbArticleReader(props: KbArticleReaderProps): ReactElement {
  const { article } = props;
  return (
    <article className="prose prose-sm max-w-none">
      <h1 className="text-2xl font-extrabold text-gray-900">{article.title}</h1>
      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase text-gray-500">Problem</h2>
        <p className="mt-1 whitespace-pre-wrap text-gray-800">{article.problem}</p>
      </section>
      <section className="mt-4">
        <h2 className="text-sm font-bold uppercase text-gray-500">Root cause</h2>
        <p className="mt-1 whitespace-pre-wrap text-gray-800">{article.rootCause}</p>
      </section>
      <section className="mt-4">
        <h2 className="text-sm font-bold uppercase text-gray-500">Resolution</h2>
        <p className="mt-1 whitespace-pre-wrap text-gray-800">{article.resolutionSteps}</p>
      </section>
      {article.tags.length > 0 ? (
        <p className="mt-6 text-xs text-gray-400">Tags: {article.tags.join(', ')}</p>
      ) : null}
    </article>
  );
}
