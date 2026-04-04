'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AnimatedTitle from '@/components/animated-title';
import PollCard from '@/components/poll-card';
import { Poll } from '@/lib/types';

export default function HomePage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  const stats = useMemo(() => {
    const totalPolls = polls.length;
    const totalVotes = polls.reduce((sum, poll) => sum + Number(poll.totalVotes || 0), 0);
    const activePolls = polls.filter((poll) => !poll.deadline || new Date(poll.deadline) >= new Date()).length;

    return [
      { label: '当前展示投票', value: String(totalPolls) },
      { label: '累计参与票数', value: String(totalVotes) },
      { label: '进行中投票', value: String(activePolls) },
    ];
  }, [polls]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
      setLoading(false);
    }, 4000);

    fetch('/api/polls', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setPolls(data.polls || []);
        setLoading(false);
      })
      .catch(() => setLoading(false))
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="loader-ring" />
      </div>
    );
  }

  return (
    <div className="space-y-12 lg:space-y-16">
      <section className="hero-stage relative overflow-hidden rounded-[32px] px-5 py-8 sm:rounded-[40px] sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        <div className="hero-stage-glow hero-stage-glow-a absolute left-10 top-12 h-32 w-32 rounded-full blur-2xl" />
        <div className="hero-stage-glow hero-stage-glow-b absolute right-0 top-0 h-64 w-64 rounded-full blur-3xl" />
        <div className="relative">
          <div className="space-y-10 animate-fade-in-up">
            <AnimatedTitle
              eyebrow="Future-ready polling"
              title="让决策页面"
              highlight="像发布会一样闪耀"
              variant="hero"
              description="VoteFlow 将在线投票做成更具表现力的交互体验：现代、先锋、带有光感与动势，同时保持创建、分享、参与与回看结果的完整流程。"
            />

            <div className="flex flex-wrap gap-3">
              <Link href="/create" className="btn-primary rounded-full px-6 py-3 text-sm font-semibold">
                立即创建投票
              </Link>
              <Link href="/polls" className="btn-secondary rounded-full px-6 py-3 text-sm font-semibold">
                浏览投票列表
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map((item) => (
                <div key={item.label} className="modern-card px-5 py-6">
                  <div className="micro-label">{item.label}</div>
                  <div className="mt-3 text-3xl font-semibold hero-title-accent sm:text-4xl">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <span className="neo-badge">Curated polls</span>
            <div>
              <h2 className="type-page font-semibold tracking-tight text-heading">
                当前最值得参与的投票
              </h2>
              <p className="mt-3 max-w-2xl type-body text-secondary">
                首页会展示当前从系统获取到的投票数据。你可以直接进入投票，也可以前往列表页做更细致的搜索、筛选和查看。
              </p>
            </div>
          </div>
          <Link href="/polls" className="btn-secondary rounded-full px-5 py-2.5 text-sm font-semibold">
            查看全部 →
          </Link>
        </div>

        {polls.length === 0 ? (
          <div className="card px-8 py-16 text-center animate-fade-in-up">
            <div className="hero-cta-icon mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] gradient-bg text-2xl text-white">
              ✦
            </div>
            <p className="mt-6 text-2xl font-semibold text-heading">还没有投票</p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-secondary">
              第一个投票将定义这个空间的风格。现在就创建一个主题，把团队、活动或社区的讨论带入更具表现力的界面。
            </p>
            <Link
              href="/create"
              className="mt-8 inline-block btn-primary rounded-full px-8 py-3 text-white font-semibold"
            >
              创建第一个投票
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {polls.map((poll, i) => (
              <PollCard key={poll.id} poll={poll} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
