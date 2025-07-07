
-- Create job_applications table
CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  position_title TEXT NOT NULL,
  application_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('applied', 'interview', 'offer', 'rejected', 'withdrawn')),
  job_description TEXT,
  application_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create emails table
CREATE TABLE public.emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gmail_message_id TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  body TEXT NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  job_application_id UUID REFERENCES public.job_applications(id)
);

-- Create email_processing_results table
CREATE TABLE public.email_processing_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  job_application_id UUID REFERENCES public.job_applications(id),
  extracted_data JSONB,
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  processing_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_processing_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for job_applications
CREATE POLICY "Users can view their own job applications" ON public.job_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own job applications" ON public.job_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job applications" ON public.job_applications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job applications" ON public.job_applications
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for emails (emails can be viewed by all authenticated users for now)
CREATE POLICY "Authenticated users can view emails" ON public.emails
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert emails" ON public.emails
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update emails" ON public.emails
  FOR UPDATE TO authenticated USING (true);

-- Create RLS policies for email_processing_results
CREATE POLICY "Authenticated users can view processing results" ON public.email_processing_results
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert processing results" ON public.email_processing_results
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update processing results" ON public.email_processing_results
  FOR UPDATE TO authenticated USING (true);

-- Create indexes for better performance
CREATE INDEX idx_job_applications_user_id ON public.job_applications(user_id);
CREATE INDEX idx_job_applications_application_date ON public.job_applications(application_date DESC);
CREATE INDEX idx_emails_processed ON public.emails(processed);
CREATE INDEX idx_emails_received_at ON public.emails(received_at DESC);
CREATE INDEX idx_email_processing_results_email_id ON public.email_processing_results(email_id);
