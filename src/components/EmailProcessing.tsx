
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { EmailEvent } from '@/types/jobApplication';
import { Mail, RefreshCw } from 'lucide-react';

export const EmailProcessing: React.FC = () => {
  const [emailEvents, setEmailEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchEmailEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('email_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;
      setEmailEvents((data || []) as EmailEvent[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch email events",
        variant: "destructive",
      });
    }
  };

  const processEmails = async () => {
    setLoading(true);
    try {
      // This would connect to your email processing service
      // For now, we'll just show a placeholder message
      toast({
        title: "Info",
        description: "Email processing service not yet configured. Please set up Gmail integration.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process emails",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailEvents();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Processing
          </h3>
          
          <div className="flex gap-2">
            <Button onClick={fetchEmailEvents} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Button onClick={processEmails} disabled={loading}>
              {loading ? 'Processing...' : 'Process Emails'}
            </Button>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Email events will be processed to extract job application information automatically.
        </p>
        
        {emailEvents.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No email events found. Email processing integration needs to be set up.
          </div>
        ) : (
          <div className="space-y-3">
            {emailEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="border p-3 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{event.email_subject}</p>
                    <p className="text-xs text-gray-500">Type: {event.type}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                  
                  <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    Processed
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
