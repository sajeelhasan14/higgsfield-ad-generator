// One pill per platform post ("facebook · published ↗"). Used on the Schedule page and the Meta Ads page,
// so both show a post's state the same way.

export interface PostPill {
  platform: string;
  status: string;
  lastError: string | null;
  permalink: string | null;
}

const STATUS_PILL: Record<string, string> = {
  scheduled: 'border-brand/20 bg-brand-soft text-brand',
  publishing: 'border-amber-200 bg-amber-50 text-amber-800',
  published: 'border-teal-200 bg-teal-50 text-teal-800',
  failed: 'border-red-200 bg-red-50 text-red-700',
};

export function PostStatusPills({ posts }: { posts: PostPill[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {posts.map((p) => {
        const pill = `rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_PILL[p.status] ?? ''}`;
        // A published post with a saved address opens on Instagram/Facebook in a new tab.
        return p.permalink ? (
          <a key={p.platform} href={p.permalink} target="_blank" rel="noopener noreferrer" title={`Open on ${p.platform}`} className={`${pill} hover:underline`}>
            {p.platform} · {p.status} ↗
          </a>
        ) : (
          <span key={p.platform} title={p.lastError ?? undefined} className={pill}>
            {p.platform} · {p.status}
          </span>
        );
      })}
    </div>
  );
}
