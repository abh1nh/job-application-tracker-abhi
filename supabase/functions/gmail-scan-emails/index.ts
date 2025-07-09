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

interface EmailData {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ body?: { data?: string }; mimeType?: string }>;
  };
  internalDate: string;
}

async function refreshGmailToken(refreshToken: string, userId: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Gmail token');
  }

  const data = await response.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await supabase
    .from('gmail_tokens')
    .update({
      access_token: data.access_token,
      expires_at: expiresAt,
    })
    .eq('user_id', userId);

  return data.access_token;
}

async function getValidAccessToken(userId: string) {
  const { data: tokenData, error } = await supabase
    .from('gmail_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !tokenData) {
    throw new Error('No Gmail token found');
  }

  // Check if token is expired
  if (tokenData.expires_at && new Date(tokenData.expires_at) <= new Date()) {
    return await refreshGmailToken(tokenData.refresh_token, userId);
  }

  return tokenData.access_token;
}

async function extractJobInfo(emailContent: string, subject: string) {
  if (!openAIApiKey) {
    return { isJobRelated: false, extractedData: null }
  }

  const messages = [
    {
      role: 'system',
      content: `
You are an email parsing assistant.  
Decide if the following email is a direct job application/update (not a promotional or newsletter blast).  
If it is, extract these fields into JSON:  
- isJobRelated (boolean)  
- company (string)  
- position (string)  
- status (enum: applied, interview, offer, rejected, withdrawn)  
- portal (string; e.g. "LinkedIn", "Indeed", "Company Career Site")  
- confidence (0–1 number)  
Always respond via the function "extract_job_info" and do not wrap in any markdown.`
    },
    {
      role: 'user',
      content: `Subject: ${subject}\n\n${emailContent}`
    }
  ]

  const functions = [
    {
      name: 'extract_job_info',
      description: 'Extracts job application details from a single email.',
      parameters: {
        type: 'object',
        properties: {
          isJobRelated: { type: 'boolean' },
          company:       { type: 'string'  },
          position:      { type: 'string'  },
          status: {
            type: 'string',
            enum: ['applied','interview','offer','rejected','withdrawn']
          },
          portal:     { type: 'string'  },
          confidence: { type: 'number'  }
        },
        required: ['isJobRelated','confidence']
      }
    }
  ]

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        messages,
        functions,
        function_call: { name: 'extract_job_info' },
        temperature: 0.1
      })
    })

    if (!res.ok) {
      console.error('OpenAI API error:', await res.text())
      return { isJobRelated: false, extractedData: null }
    }

    const { choices } = await res.json()
    const call = choices[0].message.function_call
    if (!call || !call.arguments) {
      return { isJobRelated: false, extractedData: null }
    }

    const parsed = JSON.parse(call.arguments)
    console.log('confidence :'+parsed.confidence);
    console.log('isJobRelated :'+parsed.isJobRelated);
    const isJobRelated = parsed.isJobRelated && parsed.confidence > 0.7

    return {
      isJobRelated,
      extractedData: isJobRelated ? parsed : null
    }
  } catch (e) {
    console.error('Error calling OpenAI function:', e)
    return { isJobRelated: false, extractedData: null }
  }
}


function decodeBase64(data: string): string {
  try {
    return atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    return '';
  }
}

function extractEmailContent(email: EmailData): { subject: string; body: string } {
  const headers = email.payload.headers;
  const subject = headers.find(h => h.name === 'Subject')?.value || '';
  
  let body = email.snippet || '';
  
  // Try to get full body content
  if (email.payload.body?.data) {
    body = decodeBase64(email.payload.body.data);
  } else if (email.payload.parts) {
    for (const part of email.payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body = decodeBase64(part.body.data);
        break;
      }
    }
  }
  
  return { subject, body };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    console.log(`Scanning emails for user: ${user.id}`);

    // Get valid access token
    const accessToken = await getValidAccessToken(user.id);

    // Get last scan timestamp
    const { data: userData } = await supabase
      .from('users')
      .select('last_email_scan_at')
      .eq('id', user.id)
      .single();

    const lastScanAt = userData?.last_email_scan_at;
    const sinceTimestamp = lastScanAt ? new Date(lastScanAt).getTime() / 1000 : undefined;

    // Build Gmail API query
    let query = 'in:inbox';
    if (sinceTimestamp) {
      query += ` after:${Math.floor(sinceTimestamp)}`;
    }

    // Fetch emails from Gmail API
    const gmailResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=10`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!gmailResponse.ok) {
      throw new Error(`Gmail API error: ${gmailResponse.status}`);
    }

    const gmailData = await gmailResponse.json();
    const messages = gmailData.messages || [];

    console.log(`Found ${messages.length} messages to process`);

    let processedCount = 0;
    let jobRelatedCount = 0;

    for (const message of messages) {
      try {
        // Get full message details
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!messageResponse.ok) continue;

        const emailData: EmailData = await messageResponse.json();
        const { subject, body } = extractEmailContent(emailData);

        // Check if we already processed this email
        const { data: existingEvent } = await supabase
          .from('email_events')
          .select('id')
          .eq('message_id', emailData.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingEvent) continue;

        // Extract job information using AI
        const { isJobRelated, extractedData } = await extractJobInfo(body, subject);

        // Store email event
        await supabase
          .from('email_events')
          .insert({
            user_id: user.id,
            email_subject: subject,
            message_id: emailData.id,
            timestamp: new Date(parseInt(emailData.internalDate)).toISOString(),
            type: 'gmail',
            raw_text: body,
            is_job_related: isJobRelated,
          });

        // If job-related and we have extracted data, create/update job entry
        if (isJobRelated && extractedData && extractedData.company && extractedData.position) {
          const { error: jobError } = await supabase
            .from('job_entries')
            .insert({
              user_id: user.id,
              company: extractedData.company,
              position: extractedData.position,
              status: extractedData.status || 'applied',
              applied_at: new Date(parseInt(emailData.internalDate)).toISOString(),
              source: 'Gmail Auto-Import',
              portal: extractedData.portal,
            });

          if (!jobError) {
            jobRelatedCount++;
          }
        }

        processedCount++;
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
      }
    }

    // Update last scan timestamp
    await supabase
      .from('users')
      .update({ last_email_scan_at: new Date().toISOString() })
      .eq('id', user.id);

    console.log(`Processed ${processedCount} emails, found ${jobRelatedCount} job-related`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedCount,
        jobRelatedCount 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in gmail-scan-emails:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
