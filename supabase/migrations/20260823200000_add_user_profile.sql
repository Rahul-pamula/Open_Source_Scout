ALTER TABLE public.users
ADD COLUMN bio TEXT,
ADD COLUMN skills TEXT[],
ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;
