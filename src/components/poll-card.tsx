import Link from 'next/link';
import { Poll } from '@/lib/types';

type PollCardProps = {
  poll: Poll;
  index?: number;
};

function getRelativeTime(date: string) {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return past.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export default function PollCard({ poll, index = 0 }: PollCardProps) {
  const isExpired = poll.deadline && new Date(poll.deadline) < new Date();
  const tags = ['投票', ...(poll.multiSelect ? ['多选'] : [])];

  return (
    <Link
      href={`/vote/${poll.id}`}
      className="group block modern-card p-6 animate-fade-in-up overflow-hidden"
      style={{ animationDelay: `${Math.min(index, 8) * 0.06}s` }}
    >
      <div className="card-top-line absolute inset-x-6 top-0 h-px opacity-70" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="icon-shell">
            🗳️
          </div>
          <div className="space-y-2">
            <span className={isExpired ? 'status-chip status-chip-muted' : 'status-chip'}>
              {isExpired ? '已结束' : '进行中'}
            </span>
            <div className="micro-label">
              {getRelativeTime(poll.createdAt || new Date().toISOString())}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-heading">{poll.totalVotes}</div>
          <div className="micro-label">TOTAL VOTES</div>
        </div>
      </div>

      <div className="relative mt-8 space-y-4">
        <h3 className="text-xl font-semibold tracking-tight text-heading transition duration-500 group-hover:opacity-80">
          {poll.title}
        </h3>
        {poll.description ? (
          <p className="line-clamp-2 text-sm leading-7 text-secondary">{poll.description}</p>
        ) : null}
      </div>

      <div className="relative mt-8 flex items-center justify-between gap-4 text-sm text-secondary">
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <span key={tag} className="soft-tag">
              {tag}
            </span>
          ))}
        </div>
        <div className="option-pill">
          {poll.options.length} 个选项
        </div>
      </div>

      <div className="relative mt-6 flex items-center justify-between border-t border-divider pt-5">
        <div className="micro-label">Explore Poll</div>
        <div className="card-link flex items-center gap-2 text-sm font-semibold transition duration-500 group-hover:gap-3">
          进入投票
          <span>→</span>
        </div>
      </div>
    </Link>
  );
}
