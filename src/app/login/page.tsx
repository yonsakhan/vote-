'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type LoginMethod = 'email' | 'phone';

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return '发送失败';
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div className="loader-ring" />
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/polls';

  const [supabaseEnabled] = useState(() => {
    try {
      getSupabaseBrowser();
      return true;
    } catch {
      return false;
    }
  });

  // 登录方式切换
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');

  // 邮箱登录状态
  const [email, setEmail] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // 手机号登录状态
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSending, setCodeSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verifying, setVerifying] = useState(false);

  // 错误信息
  const [error, setError] = useState('');

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (!supabaseEnabled) return;
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(next);
    });
  }, [next, router, supabaseEnabled]);

  // 格式化手机号（添加+86前缀）
  const formatPhone = useCallback((phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      return `+86${cleaned}`;
    }
    return cleaned;
  }, []);

  // 验证手机号格式
  const isValidPhone = useCallback((phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return /^1[3-9]\d{9}$/.test(cleaned);
  }, []);

  // 发送邮箱验证码
  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailSent(false);
    const value = email.trim().toLowerCase();
    if (!value) return;
    setEmailSending(true);
    try {
      const supabase = getSupabaseBrowser();
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error: err } = await supabase.auth.signInWithOtp({
        email: value,
        options: { emailRedirectTo },
      });
      if (err) {
        setError(err.message || '发送失败');
        return;
      }
      setEmailSent(true);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setEmailSending(false);
    }
  };

  // 发送手机验证码
  const sendPhoneCode = async () => {
    setError('');
    setCodeSent(false);

    if (!isValidPhone(phone)) {
      setError('请输入正确的手机号码');
      return;
    }

    setCodeSending(true);
    try {
      const supabase = getSupabaseBrowser();
      const formattedPhone = formatPhone(phone);
      const { error: err } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });
      if (err) {
        setError(err.message || '验证码发送失败');
        return;
      }
      setCodeSent(true);
      setCountdown(60); // 60秒倒计时
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setCodeSending(false);
    }
  };

  // 验证手机验证码
  const verifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidPhone(phone)) {
      setError('请输入正确的手机号码');
      return;
    }

    if (code.length !== 6) {
      setError('请输入6位验证码');
      return;
    }

    setVerifying(true);
    try {
      const supabase = getSupabaseBrowser();
      const formattedPhone = formatPhone(phone);
      const { error: err } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: code,
        type: 'sms',
      });
      if (err) {
        setError(err.message || '验证码错误');
        return;
      }
      // 登录成功，跳转
      router.replace(next);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setVerifying(false);
    }
  };

  if (!supabaseEnabled) {
    return (
      <div className="page-reading-shell max-w-lg">
        <div className="card p-8 text-center">
          <div className="text-heading font-semibold mb-2">登录未配置</div>
          <div className="type-body text-secondary">请先配置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY（或 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY）</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-reading-shell max-w-lg">
      <Link href="/" className="back-link inline-flex items-center gap-2 mb-6">
        <span>←</span>
        <span>返回首页</span>
      </Link>

      <div className="card p-8">
        <h1 className="type-page font-bold text-heading mb-2">登录</h1>
        <p className="type-body text-secondary mb-6">选择登录方式，快速进入投票系统。</p>

        {/* 登录方式切换 */}
        <div className="segmented-control mb-6">
          <button
            type="button"
            onClick={() => {
              setLoginMethod('phone');
              setError('');
            }}
            className={`segmented-trigger ${
              loginMethod === 'phone'
                ? 'segmented-trigger-active'
                : ''
            }`}
          >
            手机号登录
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod('email');
              setError('');
            }}
            className={`segmented-trigger ${
              loginMethod === 'email'
                ? 'segmented-trigger-active'
                : ''
            }`}
          >
            邮箱登录
          </button>
        </div>

        {error && <div className="mb-4 alert-panel alert-panel-error">{error}</div>}

        {/* 手机号登录表单 */}
        {loginMethod === 'phone' && (
          <form onSubmit={verifyPhoneCode} className="space-y-4">
            <div>
              <label className="field-label block mb-1">手机号码</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <span className="inline-prefix rounded-xl">
                  +86
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="13800138000"
                  maxLength={11}
                  className="flex-1 px-4 py-3 rounded-xl input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="field-label block mb-1">验证码</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6位验证码"
                  maxLength={6}
                  className="flex-1 px-4 py-3 rounded-xl input-field"
                  required
                />
                <button
                  type="button"
                  onClick={sendPhoneCode}
                  disabled={codeSending || countdown > 0 || !isValidPhone(phone)}
                  className="px-4 py-3 rounded-xl btn-secondary text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {codeSending
                    ? '发送中...'
                    : countdown > 0
                    ? `${countdown}秒后重试`
                    : codeSent
                    ? '重新发送'
                    : '获取验证码'}
                </button>
              </div>
            </div>

            {codeSent && (
              <div className="alert-panel alert-panel-info">
                验证码已发送，请注意查收短信
              </div>
            )}

            <button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="w-full py-3 rounded-xl btn-primary text-white font-semibold disabled:opacity-50"
            >
              {verifying ? '登录中...' : '登录'}
            </button>
          </form>
        )}

        {/* 邮箱登录表单 */}
        {loginMethod === 'email' && (
          <form onSubmit={sendMagicLink} className="space-y-4">
            <div>
              <label className="field-label block mb-1">邮箱地址</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl input-field"
                required
              />
            </div>

            {emailSent && (
              <div className="alert-panel alert-panel-info">
                已发送登录链接，请检查邮箱（也可能在垃圾箱）。
              </div>
            )}

            <button
              type="submit"
              disabled={emailSending || !email.trim()}
              className="w-full py-3 rounded-xl btn-primary text-white font-semibold disabled:opacity-50"
            >
              {emailSending ? '发送中...' : '发送登录链接'}
            </button>
          </form>
        )}

        <div className="mt-6 type-caption text-muted leading-relaxed">
          登录后可创建投票；未登录也可以浏览投票列表与参与投票（投票记录仅对已登录用户展示）。
        </div>
      </div>
    </div>
  );
}
