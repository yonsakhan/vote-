import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type VoteRow = {
  poll_id: string;
};

type PollOptionIdRow = {
  id: string;
};

type PollListRow = {
  id: string;
  owner_id: string | null;
  title: string;
  description: string | null;
  multi_select: boolean;
  deadline: string | null;
  total_votes: number | null;
  created_at: string;
  tags: string[] | null;
  poll_options?: PollOptionIdRow[] | null;
};

type PollOptionRow = {
  id: string;
  text: string;
  votes: number;
  created_at: string;
};

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    const status = url.searchParams.get('status') || 'all';
    const sort = url.searchParams.get('sort') || 'new';
    const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || '20') || 20));
    const idsRaw = (url.searchParams.get('ids') || '').trim();
    const ownerId = (url.searchParams.get('ownerId') || '').trim();
    const voterId = (url.searchParams.get('voterId') || '').trim();
    const tagsRaw = (url.searchParams.get('tags') || '').trim();

    const ids = idsRaw
      ? idsRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const tags = tagsRaw
      ? tagsRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    const nowIso = new Date().toISOString();

    if (voterId) {
      const { data: voteRows, error: voteErr, count } = await supabase
        .from('poll_votes')
        .select('poll_id', { count: 'exact' })
        .eq('user_id', voterId)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (voteErr) return NextResponse.json({ error: '加载失败' }, { status: 500 });
      const votedPollIds = ((voteRows as unknown as VoteRow[]) || []).map((r) => r.poll_id).filter(Boolean);
      if (votedPollIds.length === 0) {
        return NextResponse.json({ polls: [], meta: { total: count ?? 0, page, pageSize } });
      }

      const { data: pollsData, error: pollsErr } = await supabase
        .from('polls')
        .select('id,owner_id,title,description,multi_select,deadline,total_votes,created_at,tags,poll_options(id)', { count: 'exact' })
        .in('id', votedPollIds)
        .order('created_at', { ascending: false });

      if (pollsErr) return NextResponse.json({ error: '加载失败' }, { status: 500 });

      const polls = ((pollsData as unknown as PollListRow[]) || []).map((p) => ({
        id: p.id,
        ownerId: p.owner_id,
        title: p.title,
        description: p.description ?? '',
        options: Array.isArray(p.poll_options)
          ? p.poll_options.map((o) => ({ id: o.id, text: '', votes: 0 }))
          : [],
        multiSelect: Boolean(p.multi_select),
        deadline: p.deadline,
        createdAt: p.created_at,
        totalVotes: Number(p.total_votes || 0),
        tags: Array.isArray(p.tags) ? p.tags : [],
      }));

      return NextResponse.json({
        polls,
        meta: { total: count ?? polls.length, page, pageSize },
      });
    }

    let query = supabase
      .from('polls')
      .select('id,owner_id,title,description,multi_select,deadline,total_votes,created_at,tags,poll_options(id)', { count: 'exact' });

    if (ids.length > 0) {
      query = query.in('id', ids);
    }

    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }

    if (q) {
      const esc = q.replace(/[%_]/g, '\\$&');
      query = query.or(`title.ilike.%${esc}%,description.ilike.%${esc}%`);
    }

    if (tags.length > 0) {
      query = query.overlaps('tags', tags);
    }

    if (status === 'ongoing') {
      query = query.or(`deadline.is.null,deadline.gte.${nowIso}`);
    } else if (status === 'ended') {
      query = query.lt('deadline', nowIso);
    }

    if (sort === 'hot') {
      query = query.order('total_votes', { ascending: false }).order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error, count } = await query.range(start, end);
    if (error) return NextResponse.json({ error: '加载失败' }, { status: 500 });

    const polls = ((data as unknown as PollListRow[]) || []).map((p) => ({
      id: p.id,
      ownerId: p.owner_id,
      title: p.title,
      description: p.description ?? '',
      options: Array.isArray(p.poll_options)
        ? p.poll_options.map((o) => ({ id: o.id, text: '', votes: 0 }))
        : [],
      multiSelect: Boolean(p.multi_select),
      deadline: p.deadline,
      createdAt: p.created_at,
      totalVotes: Number(p.total_votes || 0),
      tags: Array.isArray(p.tags) ? p.tags : [],
    }));

    return NextResponse.json({
      polls,
      meta: { total: count ?? polls.length, page, pageSize },
    });
  } catch {
    return NextResponse.json({ error: '加载失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const auth = request.headers.get('authorization') || '';
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });
    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userRes?.user) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const body = await request.json();
    const { title, description, options, multiSelect, deadline } = body;

    const titleText = typeof title === 'string' ? title.trim() : '';
    const descText = typeof description === 'string' ? description.trim() : '';
    const optionList = Array.isArray(options)
      ? options.map((o) => (typeof o === 'string' ? o.trim() : '')).filter(Boolean)
      : [];
    const ms = Boolean(multiSelect);

    let deadlineIso: string | null = null;
    if (deadline) {
      const d = new Date(deadline);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: '截止时间格式不正确' }, { status: 400 });
      }
      deadlineIso = d.toISOString();
    }

    if (!titleText || optionList.length < 2) {
      return NextResponse.json(
        { error: '标题和至少两个选项是必需的' },
        { status: 400 }
      );
    }

    if (titleText.length > 120) {
      return NextResponse.json({ error: '标题过长' }, { status: 400 });
    }
    if (descText.length > 800) {
      return NextResponse.json({ error: '描述过长' }, { status: 400 });
    }
    if (optionList.length > 50) {
      return NextResponse.json({ error: '选项过多' }, { status: 400 });
    }

    const { data: created, error: createError } = await supabase
      .from('polls')
      .insert({
        owner_id: userRes.user.id,
        title: titleText,
        description: descText,
        multi_select: ms,
        deadline: deadlineIso,
      })
      .select('id,title,description,multi_select,deadline,total_votes,created_at')
      .single();

    if (createError || !created) {
      console.error('create poll failed', createError);
      return NextResponse.json({ error: '创建投票失败' }, { status: 500 });
    }

    const { data: createdOptions, error: optError } = await supabase
      .from('poll_options')
      .insert(optionList.map((text) => ({ poll_id: created.id, text })))
      .select('id,text,votes,created_at');

    if (optError || !createdOptions || createdOptions.length !== optionList.length) {
      console.error('create poll options failed', optError);
      await supabase.from('polls').delete().eq('id', created.id);
      return NextResponse.json({ error: '创建投票失败' }, { status: 500 });
    }

    const poll = {
      id: created.id,
      title: created.title,
      description: created.description ?? '',
      options: ((createdOptions as unknown as PollOptionRow[]) || [])
        .slice()
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((o) => ({ id: o.id, text: o.text, votes: Number(o.votes || 0) })),
      multiSelect: Boolean(created.multi_select),
      deadline: created.deadline,
      createdAt: created.created_at,
      totalVotes: Number(created.total_votes || 0),
    };

    return NextResponse.json({ poll }, { status: 201 });
  } catch (error) {
    console.error('create poll request failed', error);
    return NextResponse.json(
      { error: '创建投票失败' },
      { status: 500 }
    );
  }
}
