ALTER TABLE public.users
ADD COLUMN experience_level TEXT;

ALTER TABLE public.users
ADD CONSTRAINT users_experience_level_check
CHECK (experience_level IN ('Beginner', 'Intermediate', 'Senior'));
