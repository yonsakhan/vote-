create extension if not exists pgcrypto;

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  multi_select boolean not null default false,
  deadline timestamptz null,
  total_votes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  text text not null,
  votes integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists poll_options_poll_id_idx on public.poll_options(poll_id);
create index if not exists polls_created_at_idx on public.polls(created_at desc);
create index if not exists polls_total_votes_idx on public.polls(total_votes desc);

create or replace function public.vote_poll(p_poll_id uuid, p_option_ids uuid[])
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poll public.polls%rowtype;
  v_now timestamptz := now();
  v_updated_count integer;
  v_expected_count integer;
begin
  if p_option_ids is null or array_length(p_option_ids, 1) is null or array_length(p_option_ids, 1) = 0 then
    raise exception 'NO_OPTIONS_SELECTED';
  end if;

  select * into v_poll
  from public.polls
  where id = p_poll_id
  for update;

  if not found then
    raise exception 'POLL_NOT_FOUND';
  end if;

  if v_poll.deadline is not null and v_poll.deadline < v_now then
    raise exception 'POLL_EXPIRED';
  end if;

  if not v_poll.multi_select and array_length(p_option_ids, 1) > 1 then
    raise exception 'SINGLE_SELECT_ONLY';
  end if;

  v_expected_count := (
    select count(*)
    from public.poll_options
    where poll_id = p_poll_id and id = any(p_option_ids)
  );

  if v_expected_count <> array_length(p_option_ids, 1) then
    raise exception 'INVALID_OPTION';
  end if;

  update public.poll_options
  set votes = votes + 1
  where poll_id = p_poll_id and id = any(p_option_ids);

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> v_expected_count then
    raise exception 'VOTE_UPDATE_FAILED';
  end if;

  update public.polls
  set total_votes = total_votes + 1
  where id = p_poll_id;

  return (
    select json_build_object(
      'poll',
      json_build_object(
        'id', p.id,
        'title', p.title,
        'description', p.description,
        'multiSelect', p.multi_select,
        'deadline', p.deadline,
        'createdAt', p.created_at,
        'totalVotes', p.total_votes,
        'options',
        coalesce(
          (
            select json_agg(
              json_build_object(
                'id', o.id,
                'text', o.text,
                'votes', o.votes
              )
              order by o.created_at asc
            )
            from public.poll_options o
            where o.poll_id = p.id
          ),
          '[]'::json
        )
      )
    )
    from public.polls p
    where p.id = p_poll_id
  );
end;
$$;
