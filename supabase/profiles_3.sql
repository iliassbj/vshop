alter table public.profiles
  add column if not exists profile_completion_step int not null default 0;

alter table public.profiles
  drop constraint if exists profiles_profile_completion_step_check;

alter table public.profiles
  add constraint profiles_profile_completion_step_check
  check (profile_completion_step between 0 and 6);

comment on column public.profiles.profile_completion_step is
  'Highest completed onboarding step. 0 means not started; 6 means onboarding is complete.';
