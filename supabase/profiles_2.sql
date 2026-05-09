alter table public.profiles
  add column if not exists profile_picture_base64 text,
  add column if not exists profile_picture_mime_type text;

comment on column public.profiles.profile_picture_base64 is
  'Base64-encoded profile picture payload. Temporary storage until profile images move to object storage.';

comment on column public.profiles.profile_picture_mime_type is
  'MIME type for profile_picture_base64, for example image/jpeg or image/png.';
