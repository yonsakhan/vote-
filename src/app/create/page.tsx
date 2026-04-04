'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function CreatePage() {
  const router = useRouter();
  const [supabaseEnabled] = useState(() => {
    try {
      getSupabaseBrowser();
      return true;
    } catch {
      return false;
    }
  });
  const [authChecked, setAuthChecked] = useState(!supabaseEnabled);
  const [authed, setAuthed] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multiSelect, setMultiSelect] = useState(false);
  const [anonymous, setAnonymous] = useState(true);
  const [deadline, setDeadline] = useState('');
  const [deadlineMode, setDeadlineMode] = useState<'none' | '1d' | '7d' | '30d' | 'custom'>('none');
  const [customDeadlineLocal, setCustomDeadlineLocal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const deadlineLabel = useMemo(() => {
    if (!deadline) return '未设置';
    const d = new Date(deadline);
    if (Number.isNaN(d.getTime())) return '未设置';
    return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, [deadline]);

  useEffect(() => {
    if (!supabaseEnabled) return;
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(Boolean(data.session));
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(Boolean(session));
      setAuthChecked(true);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabaseEnabled]);

  const addOption = () => setOptions([...options, '']);
  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };
  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const applyDeadlineMode = (mode: 'none' | '1d' | '7d' | '30d' | 'custom') => {
    setDeadlineMode(mode);
    setError('');

    if (mode === 'none') {
      setDeadline('');
      return;
    }

    if (mode === 'custom') {
      if (!customDeadlineLocal) {
        setDeadline('');
        return;
      }
      setDeadline(new Date(customDeadlineLocal).toISOString());
      return;
    }

    const msByMode = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    } as const;
    setDeadline(new Date(Date.now() + msByMode[mode]).toISOString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const supabase = getSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      router.push(`/login?next=${encodeURIComponent('/create')}`);
      return;
    }

    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) {
      setError('请至少提供两个选项');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          options: validOptions,
          multiSelect,
          deadline: deadline || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        try {
          const raw = localStorage.getItem('createdPollIds');
          const parsed = raw ? JSON.parse(raw) : [];
          const ids = Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
          ids.unshift(data.poll.id);
          localStorage.setItem('createdPollIds', JSON.stringify(Array.from(new Set(ids))));
        } catch {}
        router.push(`/vote/${data.poll.id}`);
      } else {
        setError(data.error || '创建失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-reading-shell">
      <Link href="/" className="back-link inline-flex items-center gap-2 mb-6">
        <span>←</span>
        <span>返回首页</span>
      </Link>

      {!supabaseEnabled ? (
        <div className="card p-10 text-center">
          <div className="text-heading font-semibold mb-2">创建未配置</div>
          <div className="type-body text-secondary">请先配置 Supabase 环境变量并完成数据库迁移</div>
        </div>
      ) : authChecked && !authed ? (
        <div className="card p-10 text-center">
          <div className="text-3xl mb-4">🔐</div>
          <h2 className="type-section text-heading font-semibold mb-2">创建投票需要登录</h2>
          <div className="type-body text-secondary mb-6">登录后即可创建并在“我的投票”中管理</div>
          <Link href="/login?next=%2Fcreate" className="inline-block btn-primary px-8 py-3 rounded-xl text-white font-semibold">
            去登录
          </Link>
        </div>
      ) : !authChecked ? (
        <div className="flex items-center justify-center py-24">
          <div className="loader-ring" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="min-w-0">
          <div className="card p-8">
            <h1 className="type-page font-bold text-heading mb-8">创建新投票</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="field-label block mb-2">投票标题</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="请输入投票标题"
                  className="w-full px-4 py-3 rounded-xl input-field"
                />
              </div>

              <div>
                <label className="field-label block mb-2">投票描述</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="请输入投票描述（可选）"
                  className="w-full px-4 py-3 rounded-xl input-field resize-none"
                />
              </div>

              <div>
                <label className="field-label block mb-3">投票选项</label>
                <div className="space-y-3">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="field-index">{i + 1}.</span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder={`选项 ${i + 1}`}
                        className="flex-1 px-4 py-3 rounded-xl input-field"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="action-outline action-outline-danger rounded-lg p-2 transition-all"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-4 w-full py-3 rounded-xl border-2 border-dashed action-outline action-outline-accent font-medium transition-colors"
                >
                  + 添加选项
                </button>
              </div>

              <div className="pt-4 border-t border-divider">
                <label className="field-label block mb-4">投票设置</label>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl surface-subtle">
                    <span className="text-body">允许多选</span>
                    <button
                      type="button"
                      onClick={() => setMultiSelect(!multiSelect)}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        multiSelect ? 'gradient-bg' : 'toggle-track-off'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-5 h-5 rounded-full toggle-thumb transition-all ${
                          multiSelect ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl surface-subtle">
                    <span className="text-body">匿名投票</span>
                    <button
                      type="button"
                      onClick={() => setAnonymous(!anonymous)}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        anonymous ? 'gradient-bg' : 'toggle-track-off'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-5 h-5 rounded-full toggle-thumb transition-all ${
                          anonymous ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 rounded-xl surface-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-body">截止时间</span>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <span className="type-body text-secondary">{deadlineLabel}</span>
                      <select
                        value={deadlineMode}
                        onChange={(e) => applyDeadlineMode(e.target.value as typeof deadlineMode)}
                        className="px-3 py-2 rounded-lg input-field text-sm"
                      >
                        <option value="none">不设置</option>
                        <option value="1d">1天后</option>
                        <option value="7d">7天后</option>
                        <option value="30d">30天后</option>
                        <option value="custom">自定义</option>
                      </select>
                    </div>
                  </div>

                  {deadlineMode === 'custom' && (
                    <div className="p-4 rounded-xl surface-subtle">
                      <label className="field-label block mb-2">自定义截止时间</label>
                      <input
                        type="datetime-local"
                        value={customDeadlineLocal}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCustomDeadlineLocal(v);
                          setDeadline(v ? new Date(v).toISOString() : '');
                        }}
                        className="w-full px-4 py-3 rounded-xl input-field"
                      />
                    </div>
                  )}
                </div>
              </div>

              {error && <div className="alert-panel alert-panel-error">{error}</div>}

              <div className="flex flex-col gap-4 pt-4 sm:flex-row">
                <Link
                  href="/"
                  className="px-8 py-3 rounded-xl btn-secondary text-center"
                >
                  取消
                </Link>
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="flex-1 py-3 rounded-xl btn-primary text-white font-semibold disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-loader" />
                      创建中...
                    </span>
                  ) : (
                    '创建投票'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="min-w-0 xl:w-80">
          <div className="card p-6 xl:sticky xl:top-24">
            <h3 className="type-section text-heading font-semibold mb-4">💡 创建建议</h3>
            <div className="space-y-4">
              <div>
                <div className="font-medium text-body mb-1">1. 标题要简洁明了</div>
                <p className="type-body text-secondary">让参与者一眼就能明白投票的主题</p>
              </div>
              <div>
                <div className="font-medium text-body mb-1">2. 选项要全面且互斥</div>
                <p className="type-body text-secondary">确保选项覆盖主要可能性且不重叠</p>
              </div>
              <div>
                <div className="font-medium text-body mb-1">3. 设置合理的截止时间</div>
                <p className="type-body text-secondary">给参与者充足的时间进行投票</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
