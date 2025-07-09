export interface JobEntry {
  id: string;
  user_id: string;
  company: string;
  position: string;
  source?: string;
  status: string;
  applied_at: string;
  updated_at?: string;
  portal?: string;
}

export interface EmailEvent {
  id: string;
  user_id: string;
  email_subject: string;
  message_id: string;
  timestamp: string;
  job_entry_id?: string;
  type: string;
  raw_text: string;
}

export interface UserNote {
  id: string;
  job_entry_id: string;
  user_id: string;
  content: string;
  created_at?: string;
}

// Legacy interfaces for backward compatibility during transition
export interface JobApplication extends JobEntry {
  company_name: string;
  position_title: string;
  application_date: string;
  job_description?: string;
  application_url?: string;
  notes?: string;
  created_at: string;
}

export interface Email extends EmailEvent {
  subject: string;
  sender: string;
  recipient: string;
  body: string;
  received_at: string;
  processed: boolean;
  gmail_message_id: string;
  job_application_id?: string;
}

export interface EmailProcessingResult {
  id: string;
  email_id: string;
  job_application_id?: string;
  extracted_data: Record<string, any>;
  confidence_score: number;
  processing_notes?: string;
  created_at: string;
}
