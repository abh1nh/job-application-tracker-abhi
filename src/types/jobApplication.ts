
export interface JobApplication {
  id: string;
  company_name: string;
  position_title: string;
  application_date: string;
  status: 'applied' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
  job_description?: string;
  application_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface Email {
  id: string;
  gmail_message_id: string;
  subject: string;
  sender: string;
  recipient: string;
  body: string;
  received_at: string;
  processed: boolean;
  created_at: string;
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
