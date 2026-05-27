-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────────────────────

create type meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table households (
  id                   uuid primary key default uuid_generate_v4(),
  name                 text not null default 'My Household',
  pantry_staples       text[] not null default '{}',
  dietary_preferences  text[] not null default '{}',
  created_at           timestamptz not null default now()
);

-- Extends auth.users
create table profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  household_id   uuid references households(id) on delete set null,
  display_name   text,
  created_at     timestamptz not null default now()
);

create table recipes (
  id                 uuid primary key default uuid_generate_v4(),
  household_id       uuid not null references households(id) on delete cascade,
  title              text not null,
  description        text,
  meal_type          meal_type not null default 'dinner',
  ingredients        jsonb not null default '[]',
  instructions       text,
  source_url         text,
  photo_url          text,
  cook_time_minutes  int,
  times_planned      int not null default 0,
  rating             int check (rating >= 1 and rating <= 5),
  notes              text,
  tags               text[] not null default '{}',
  is_from_library    bool not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table weekly_plans (
  id            uuid primary key default uuid_generate_v4(),
  household_id  uuid not null references households(id) on delete cascade,
  week_start    date not null,
  config        jsonb not null default '{"breakfast":2,"lunch":4,"dinner":5,"snack":0,"library_ratio":0.6}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (household_id, week_start)
);

create table plan_slots (
  id            uuid primary key default uuid_generate_v4(),
  plan_id       uuid not null references weekly_plans(id) on delete cascade,
  day_of_week   int not null check (day_of_week >= 0 and day_of_week <= 6),
  meal_type     meal_type not null,
  recipe_id     uuid references recipes(id) on delete set null,
  is_locked     bool not null default false,
  sort_order    int not null default 0
);

create table grocery_lists (
  id            uuid primary key default uuid_generate_v4(),
  household_id  uuid not null references households(id) on delete cascade,
  plan_id       uuid references weekly_plans(id) on delete set null,
  items         jsonb not null default '[]',
  extra_items   jsonb not null default '[]',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index recipes_household_id_idx on recipes (household_id);
create index plan_slots_plan_id_idx on plan_slots (plan_id);
create index grocery_lists_plan_id_idx on grocery_lists (plan_id);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_updated_at
  before update on recipes
  for each row execute procedure update_updated_at();

create trigger weekly_plans_updated_at
  before update on weekly_plans
  for each row execute procedure update_updated_at();

create trigger grocery_lists_updated_at
  before update on grocery_lists
  for each row execute procedure update_updated_at();

-- ─── Auto-create household on first signup ────────────────────────────────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_household_id uuid;
begin
  insert into households (name)
  values ('My Household')
  returning id into new_household_id;

  insert into profiles (id, household_id, display_name)
  values (new.id, new_household_id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table households    enable row level security;
alter table profiles      enable row level security;
alter table recipes       enable row level security;
alter table weekly_plans  enable row level security;
alter table plan_slots    enable row level security;
alter table grocery_lists enable row level security;

-- Helper function: get caller's household_id (avoids repeated subquery)
create or replace function my_household_id()
returns uuid language sql stable security definer as $$
  select household_id from profiles where id = auth.uid()
$$;

-- households
create policy "view own household" on households
  for select using (id = my_household_id());

create policy "update own household" on households
  for update using (id = my_household_id());

-- profiles
create policy "view household profiles" on profiles
  for select using (household_id = my_household_id());

create policy "insert own profile" on profiles
  for insert with check (id = auth.uid());

create policy "update own profile" on profiles
  for update using (id = auth.uid());

-- recipes
create policy "view household recipes" on recipes
  for select using (household_id = my_household_id());

create policy "insert household recipes" on recipes
  for insert with check (household_id = my_household_id());

create policy "update household recipes" on recipes
  for update using (household_id = my_household_id());

create policy "delete household recipes" on recipes
  for delete using (household_id = my_household_id());

-- weekly_plans
create policy "view household plans" on weekly_plans
  for select using (household_id = my_household_id());

create policy "insert household plans" on weekly_plans
  for insert with check (household_id = my_household_id());

create policy "update household plans" on weekly_plans
  for update using (household_id = my_household_id());

create policy "delete household plans" on weekly_plans
  for delete using (household_id = my_household_id());

-- plan_slots (access via parent plan's household_id)
create policy "view household plan slots" on plan_slots
  for select using (
    exists (
      select 1 from weekly_plans
      where id = plan_slots.plan_id and household_id = my_household_id()
    )
  );

create policy "insert household plan slots" on plan_slots
  for insert with check (
    exists (
      select 1 from weekly_plans
      where id = plan_id and household_id = my_household_id()
    )
  );

create policy "update household plan slots" on plan_slots
  for update using (
    exists (
      select 1 from weekly_plans
      where id = plan_slots.plan_id and household_id = my_household_id()
    )
  );

create policy "delete household plan slots" on plan_slots
  for delete using (
    exists (
      select 1 from weekly_plans
      where id = plan_slots.plan_id and household_id = my_household_id()
    )
  );

-- grocery_lists
create policy "view household grocery lists" on grocery_lists
  for select using (household_id = my_household_id());

create policy "insert household grocery lists" on grocery_lists
  for insert with check (household_id = my_household_id());

create policy "update household grocery lists" on grocery_lists
  for update using (household_id = my_household_id());

create policy "delete household grocery lists" on grocery_lists
  for delete using (household_id = my_household_id());
