-- ─── Invitations ─────────────────────────────────────────────────────────────

create table invitations (
  id            uuid primary key default uuid_generate_v4(),
  household_id  uuid not null references households(id) on delete cascade,
  email         text not null,
  token         text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by    uuid references auth.users(id) on delete set null,
  accepted_at   timestamptz,
  expires_at    timestamptz not null default now() + interval '7 days',
  created_at    timestamptz not null default now()
);

create index invitations_token_idx       on invitations (token);
create index invitations_email_idx       on invitations (lower(email));
create index invitations_household_idx   on invitations (household_id);

alter table invitations enable row level security;

-- Household members can view, create and revoke their own household's invites
create policy "view household invitations" on invitations
  for select using (household_id = my_household_id());

create policy "create household invitations" on invitations
  for insert with check (household_id = my_household_id());

create policy "revoke household invitations" on invitations
  for delete using (household_id = my_household_id());

-- ─── Public RPC: look up an invite by token (pre-auth, for landing page) ──────

create or replace function get_invitation_details(invite_token text)
returns table(
  household_name  text,
  email           text,
  expires_at      timestamptz,
  is_valid        bool
)
language plpgsql security definer as $$
begin
  return query
  select
    h.name,
    i.email,
    i.expires_at,
    (i.accepted_at is null and i.expires_at > now())
  from invitations i
  join households h on h.id = i.household_id
  where i.token = invite_token;
end;
$$;

-- Allow anon (pre-signup) callers to use this function
grant execute on function get_invitation_details(text) to anon, authenticated;

-- ─── Updated handle_new_user: join existing household if invited ──────────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_household_id  uuid;
  pending_invite    record;
begin
  -- Check for an active invitation matching this email address
  select * into pending_invite
  from invitations
  where lower(email) = lower(new.email)
    and accepted_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if found then
    -- Join the invited household instead of creating a new one
    new_household_id := pending_invite.household_id;

    update invitations
    set accepted_at = now()
    where id = pending_invite.id;
  else
    -- First-time owner: create a fresh household
    insert into households (name)
    values ('My Household')
    returning id into new_household_id;
  end if;

  insert into profiles (id, household_id, display_name)
  values (
    new.id,
    new_household_id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );

  return new;
end;
$$;
