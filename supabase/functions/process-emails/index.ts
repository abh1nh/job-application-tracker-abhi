
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ProcessingResult {
  company_name?: string;
  position_title?: string;
  application_status?: string;
  application_date?: string;
  confidence_score: number;
  notes?: string;
}

async function processEmailWithAI(emailContent: string, subject: string): Promise<ProcessingResult> {
  const prompt = `
  Analyze this email and extract job application information. Return a JSON object with the following fields:
  - company_name: The company name (if mentioned)
  - position_title: The job position/title (if mentioned)
  - application_status: One of "applied", "interview", "offer", "rejected", "withdrawn" (if determinable)
  - application_date: Date in YYYY-MM-DD format (if mentioned or determinable)
  - confidence_score: A number between 0 and 1 indicating how confident you are this is job-related
  - notes: Any additional relevant information
  
  Email Subject: ${subject}
  Email Content: ${emailContent}
  
  Only return the JSON object, no other text.
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an AI assistant that analyzes emails for job application information. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return {
        confidence_score: 0,
        notes: 'Failed to parse AI response'
      };
    }
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return {
      confidence_score: 0,
      notes: `AI processing error: ${error.message}`
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the user from the request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    console.log(`Processing emails for user: ${user.id}`);

    // Fetch unprocessed emails
    const { data: emails, error: emailsError } = await supabase
      .from('emails')
      .select('*')
      .eq('processed', false)
      .limit(10);

    if (emailsError) {
      throw emailsError;
    }

    console.log(`Found ${emails?.length || 0} unprocessed emails`);

    const results = [];

    for (const email of emails || []) {
      console.log(`Processing email: ${email.id}`);
      
      // Process email with AI
      const aiResult = await processEmailWithAI(email.body, email.subject);
      
      // Store processing results
      const { data: processingResult, error: resultError } = await supabase
        .from('email_processing_results')
        .insert({
          email_id: email.id,
          extracted_data: aiResult,
          confidence_score: aiResult.confidence_score,
          processing_notes: aiResult.notes || null
        })
        .select()
        .single();

      if (resultError) {
        console.error('Error storing processing result:', resultError);
        continue;
      }

      // If confidence is high enough and we have company/position data, create job application
      if (aiResult.confidence_score > 0.7 && aiResult.company_name && aiResult.position_title) {
        console.log(`Creating job application for email: ${email.id}`);
        
        const { data: jobApp, error: jobAppError } = await supabase
          .from('job_applications')
          .insert({
            company_name: aiResult.company_name,
            position_title: aiResult.position_title,
            application_date: aiResult.application_date || new Date().toISOString().split('T')[0],
            status: aiResult.application_status || 'applied',
            notes: `Auto-created from email: ${email.subject}${aiResult.notes ? '\n\n' + aiResult.notes : ''}`,
            user_id: user.id
          })
          .select()
          .single();

        if (!jobAppError && jobApp) {
          // Update processing result with job application link
          await supabase
            .from('email_processing_results')
            .update({ job_application_id: jobApp.id })
            .eq('id', processingResult.id);
        }
      }

      // Mark email as processed
      await supabase
        .from('emails')
        .update({ processed: true })
        .eq('id', email.id);

      results.push({
        email_id: email.id,
        processing_result: aiResult
      });
    }

    console.log(`Processed ${results.length} emails`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed_count: results.length,
        results 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in process-emails function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
