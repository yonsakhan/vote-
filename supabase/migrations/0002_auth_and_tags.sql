alter table public.polls
  add column if not exists owner_id uuid null;

alter table public.polls
  add column if not exists tags text[] not null default '{}';

create index if not exists polls_owner_id_idx on public.polls(owner_id);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null,
  option_ids uuid[] not null,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create index if not exists poll_votes_user_id_idx on public.poll_votes(user_id, created_at desc);
create index if not exists poll_votes_poll_id_idx on public.poll_votes(poll_id, created_at desc);

create or replace function public.vote_poll(p_poll_id uuid, p_option_ids uuid[], p_user_id uuid default null)
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

  if p_user_id is not null then
    insert into public.poll_votes(poll_id, user_id, option_ids)
    values (p_poll_id, p_user_id, p_option_ids);
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
exception
  when unique_violation then
    raise exception 'ALREADY_VOTED';
end;
$$;
