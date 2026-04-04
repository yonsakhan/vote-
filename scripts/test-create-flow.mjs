import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function findUserByEmail(supabase, email) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) throw error;

    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 200) return null;

    page += 1;
  }
}

async function ensureTestUser(supabase, email, password) {
  const existing = await findUserByEmail(supabase, email);

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
}

async function main() {
  loadEnvFile('.env.local');

  const baseUrl = process.env.LOCAL_TEST_BASE_URL || 'http://localhost:3000';
  const email = process.env.LOCAL_TEST_USER_EMAIL || 'local-create-flow@example.com';
  const password = `LocalCreateFlow-${randomUUID()}`;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('缺少 SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_URL');
  if (!anonKey) throw new Error('缺少 NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!serviceRoleKey) throw new Error('缺少 SUPABASE_SERVICE_ROLE_KEY');

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const browser = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const health = await fetch(baseUrl, { redirect: 'manual' });
  if (!health.ok) {
    throw new Error(`本地服务不可用：${baseUrl} -> ${health.status}`);
  }

  const testUser = await ensureTestUser(admin, email, password);
  if (!testUser?.id) {
    throw new Error('无法创建或更新本地测试用户');
  }

  const signInResult = await browser.auth.signInWithPassword({ email, password });
  if (signInResult.error || !signInResult.data.session?.access_token) {
    throw signInResult.error || new Error('测试用户登录失败');
  }

  const token = signInResult.data.session.access_token;
  const title = `本地创建流程测试 ${new Date().toISOString()}`;
  const description = '自动化验证创建投票接口是否能完整创建投票与选项';

  const createRes = await fetch(`${baseUrl}/api/polls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      description,
      options: ['选项一', '选项二'],
      multiSelect: false,
      deadline: null,
    }),
  });

  const createData = await createRes.json().catch(() => null);
  if (!createRes.ok || !createData?.poll?.id) {
    throw new Error(`创建失败：${createRes.status} ${JSON.stringify(createData)}`);
  }

  const pollId = createData.poll.id;
  const detailRes = await fetch(`${baseUrl}/api/polls/${pollId}`);
  const detailData = await detailRes.json().catch(() => null);

  if (!detailRes.ok || !detailData?.poll) {
    throw new Error(`创建后读取详情失败：${detailRes.status} ${JSON.stringify(detailData)}`);
  }

  if (!Array.isArray(detailData.poll.options) || detailData.poll.options.length < 2) {
    throw new Error(`创建结果异常：投票缺少选项 ${JSON.stringify(detailData.poll)}`);
  }

  if (process.env.LOCAL_TEST_KEEP_DATA !== '1') {
    const { error } = await admin.from('polls').delete().eq('id', pollId);
    if (error) {
      throw new Error(`清理测试投票失败：${error.message}`);
    }
  }

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    pollId,
    kept: process.env.LOCAL_TEST_KEEP_DATA === '1',
    userId: testUser.id,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
