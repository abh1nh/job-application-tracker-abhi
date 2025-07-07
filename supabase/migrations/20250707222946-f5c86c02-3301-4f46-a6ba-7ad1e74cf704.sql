
-- Drop existing tables and their dependencies
DROP TABLE IF EXISTS public.email_processing_results CASCADE;
DROP TABLE IF EXISTS public.emails CASCADE;
DROP TABLE IF EXISTS public.job_applications CASCADE;

-- Create users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create job_entries table
CREATE TABLE public.job_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    position TEXT NOT NULL,
    source TEXT,
    status TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create email_events table
CREATE TABLE public.email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    email_subject TEXT NOT NULL,
    message_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    job_entry_id UUID REFERENCES public.job_entries(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    raw_text TEXT NOT NULL
);

-- Create user_notes table
CREATE TABLE public.user_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_entry_id UUID NOT NULL REFERENCES public.job_entries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own record" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own record" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for job_entries
CREATE POLICY "Users can view their own job entries" ON public.job_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own job entries" ON public.job_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job entries" ON public.job_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job entries" ON public.job_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for email_events
CREATE POLICY "Users can view their own email events" ON public.email_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email events" ON public.email_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email events" ON public.email_events
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email events" ON public.email_events
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_notes
CREATE POLICY "Users can view their own notes" ON public.user_notes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes" ON public.user_notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON public.user_notes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON public.user_notes
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_job_entries_user_id ON public.job_entries(user_id);
CREATE INDEX idx_job_entries_applied_at ON public.job_entries(applied_at DESC);
CREATE INDEX idx_email_events_user_id ON public.email_events(user_id);
CREATE INDEX idx_email_events_timestamp ON public.email_events(timestamp DESC);
CREATE INDEX idx_email_events_job_entry_id ON public.email_events(job_entry_id);
CREATE INDEX idx_user_notes_job_entry_id ON public.user_notes(job_entry_id);
CREATE INDEX idx_user_notes_user_id ON public.user_notes(user_id);

-- Create trigger to automatically create user record when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger to update updated_at timestamp on job_entries
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_entries_updated_at
    BEFORE UPDATE ON public.job_entries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
