import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await params;
    const body = await request.json();
    const { optionIds } = body;
    const auth = request.headers.get('authorization') || '';
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    let userId: string | null = null;
    if (token) {
      const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
      if (!userErr && userRes?.user?.id) userId = userRes.user.id;
    }

    if (!optionIds || optionIds.length === 0) {
      return NextResponse.json(
        { error: '请至少选择一个选项' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc('vote_poll', {
      p_poll_id: id,
      p_option_ids: optionIds,
      p_user_id: userId,
    });

    if (error) {
      const msg = isRecord(error) && typeof error.message === 'string' ? error.message : '';
      if (msg.includes('POLL_NOT_FOUND')) return NextResponse.json({ error: '投票不存在' }, { status: 404 });
      if (msg.includes('POLL_EXPIRED')) return NextResponse.json({ error: '投票已截止' }, { status: 400 });
      if (msg.includes('SINGLE_SELECT_ONLY')) return NextResponse.json({ error: '此投票为单选，只能选择一个选项' }, { status: 400 });
      if (msg.includes('NO_OPTIONS_SELECTED')) return NextResponse.json({ error: '请至少选择一个选项' }, { status: 400 });
      if (msg.includes('INVALID_OPTION')) return NextResponse.json({ error: '选项不合法' }, { status: 400 });
      if (msg.includes('ALREADY_VOTED')) return NextResponse.json({ error: '你已投过票' }, { status: 400 });
      return NextResponse.json({ error: '投票失败' }, { status: 500 });
    }

    if (!isRecord(data) || !('poll' in data)) return NextResponse.json({ error: '投票失败' }, { status: 500 });
    return NextResponse.json({ poll: data.poll });
  } catch {
    return NextResponse.json(
      { error: '投票失败' },
      { status: 500 }
    );
  }
}
