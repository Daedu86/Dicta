-- Allow admins to pin a member account to one free OpenRouter model.
-- The server routes enforce this assignment before calling OpenRouter.

alter table public.dicta_app_profiles
add column if not exists assigned_openrouter_model text;

update public.dicta_app_profiles
set assigned_openrouter_model = null
where assigned_openrouter_model is not null
  and btrim(assigned_openrouter_model) = '';

alter table public.dicta_app_profiles
drop constraint if exists dicta_app_profiles_assigned_openrouter_model_check;

alter table public.dicta_app_profiles
add constraint dicta_app_profiles_assigned_openrouter_model_check
check (
  assigned_openrouter_model is null
  or (
    length(assigned_openrouter_model) <= 160
    and assigned_openrouter_model ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$'
    and (
      assigned_openrouter_model = 'openrouter/free'
      or assigned_openrouter_model like '%:free'
    )
  )
);

comment on column public.dicta_app_profiles.assigned_openrouter_model is
'Optional free OpenRouter model id pinned by an admin for a member Dicta profile.';
