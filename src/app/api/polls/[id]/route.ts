import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type PollOptionRow = {
  id: string;
  text: string;
  votes: number;
  created_at: string;
};

type PollRow = {
  id: string;
  owner_id: string | null;
  title: string;
  description: string | null;
  tags: string[] | null;
  multi_select: boolean;
  deadline: string | null;
  total_votes: number | null;
  created_at: string;
  poll_options?: PollOptionRow[] | null;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await params;

    const { data, error } = await supabase
      .from('polls')
      .select('id,owner_id,title,description,tags,multi_select,deadline,total_votes,created_at,poll_options(id,text,votes,created_at)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '投票不存在' }, { status: 404 });
    }

    const row = data as unknown as PollRow;

    const poll = {
      id: row.id,
      ownerId: row.owner_id,
      title: row.title,
      description: row.description ?? '',
      options: Array.isArray(row.poll_options)
        ? row.poll_options
            .slice()
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((o) => ({ id: o.id, text: o.text, votes: Number(o.votes || 0) }))
        : [],
      multiSelect: Boolean(row.multi_select),
      deadline: row.deadline,
      createdAt: row.created_at,
      totalVotes: Number(row.total_votes || 0),
      tags: Array.isArray(row.tags) ? row.tags : [],
    };

    return NextResponse.json({ poll });
  } catch {
    return NextResponse.json({ error: '加载失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await params;

    const { error } = await supabase.from('polls').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
