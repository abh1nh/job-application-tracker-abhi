
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Email, EmailProcessingResult } from '@/types/jobApplication';
import { Mail, RefreshCw } from 'lucide-react';

export const EmailProcessing: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingResults, setProcessingResults] = useState<EmailProcessingResult[]>([]);
  const { toast } = useToast();

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('emails' as any)
        .select('*')
        .order('received_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setEmails(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch emails",
        variant: "destructive",
      });
    }
  };

  const fetchProcessingResults = async () => {
    try {
      const { data, error } = await supabase
        .from('email_processing_results' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setProcessingResults(data || []);
    } catch (error: any) {
      console.error('Error fetching processing results:', error);
    }
  };

  const processEmailsWithAI = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-emails');
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Emails processed with AI successfully!",
      });
      
      await fetchEmails();
      await fetchProcessingResults();
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
    fetchEmails();
    fetchProcessingResults();
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
            <Button onClick={fetchEmails} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Button onClick={processEmailsWithAI} disabled={loading}>
              {loading ? 'Processing...' : 'Process with AI'}
            </Button>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Recent emails will be processed to extract job application information automatically.
        </p>
        
        {emails.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No emails found. Make sure your Gmail integration is set up.
          </div>
        ) : (
          <div className="space-y-3">
            {emails.slice(0, 5).map((email) => (
              <div key={email.id} className="border p-3 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{email.subject}</p>
                    <p className="text-xs text-gray-500">From: {email.sender}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(email.received_at).toLocaleString()}
                    </p>
                  </div>
                  
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    email.processed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {email.processed ? 'Processed' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {processingResults.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h4 className="text-lg font-semibold mb-4">Processing Results</h4>
          
          <div className="space-y-3">
            {processingResults.slice(0, 5).map((result) => (
              <div key={result.id} className="border p-3 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm">
                      Confidence: {(result.confidence_score * 100).toFixed(1)}%
                    </p>
                    {result.extracted_data && (
                      <div className="text-xs text-gray-600 mt-1">
                        <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
                          {JSON.stringify(result.extracted_data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
