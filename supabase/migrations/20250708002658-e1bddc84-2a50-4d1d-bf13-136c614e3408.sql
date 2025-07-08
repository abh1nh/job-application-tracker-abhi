
-- Create gmail_tokens table to store OAuth tokens
CREATE TABLE public.gmail_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add unique constraint to ensure one token per user
ALTER TABLE public.gmail_tokens ADD CONSTRAINT unique_user_gmail_token UNIQUE (user_id);

-- Update email_events table structure
ALTER TABLE public.email_events 
ADD COLUMN is_job_related BOOLEAN DEFAULT false;

-- Add last_email_scan_at to users table
ALTER TABLE public.users 
ADD COLUMN last_email_scan_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS for gmail_tokens
ALTER TABLE public.gmail_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for gmail_tokens
CREATE POLICY "Users can view their own gmail tokens" ON public.gmail_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own gmail tokens" ON public.gmail_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gmail tokens" ON public.gmail_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gmail tokens" ON public.gmail_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_gmail_tokens_user_id ON public.gmail_tokens(user_id);
CREATE INDEX idx_email_events_message_id ON public.email_events(message_id);
CREATE INDEX idx_email_events_is_job_related ON public.email_events(is_job_related);

-- Create trigger to update updated_at timestamp on gmail_tokens
CREATE TRIGGER update_gmail_tokens_updated_at
    BEFORE UPDATE ON public.gmail_tokens
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
