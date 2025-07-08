import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface GmailToken {
  id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
  created_at: string;
}

export const GmailIntegration: React.FC = () => {
  const [gmailToken, setGmailToken] = useState<GmailToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const { toast } = useToast();

  const checkGmailConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('gmail_tokens')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      setGmailToken(data);
    } catch (error: any) {
      console.error('Error checking Gmail connection:', error);
    }
  };

  const initiateGmailOAuth = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-oauth-init');
      
      if (error) throw error;
      
      // Redirect to Google OAuth
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('No auth URL received from server');
      }
    } catch (error: any) {
      console.error('Error initiating Gmail OAuth:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to initiate Gmail OAuth",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnectGmail = async () => {
    try {
      const { error } = await supabase
        .from('gmail_tokens')
        .delete()
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;
      
      setGmailToken(null);
      toast({
        title: "Success",
        description: "Gmail account disconnected successfully",
      });
    } catch (error: any) {
      console.error('Error disconnecting Gmail:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Gmail account",
        variant: "destructive",
      });
    }
  };

  const scanEmails = async () => {
    setScanLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-scan-emails');
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Email scan completed. Found ${data?.processedCount || 0} new emails. Refreshing...`,
      });

      // Refresh the page after successful scan
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error('Error scanning emails:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to scan emails",
        variant: "destructive",
      });
    } finally {
      setScanLoading(false);
    }
  };

  useEffect(() => {
    checkGmailConnection();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Gmail Integration</h3>
      </div>

      {gmailToken ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Gmail account connected</span>
          </div>
          
          <p className="text-sm text-gray-600">
            Your Gmail account is connected and ready to scan for job-related emails.
          </p>

          <div className="flex gap-2">
            <Button onClick={scanEmails} disabled={scanLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${scanLoading ? 'animate-spin' : ''}`} />
              {scanLoading ? 'Scanning...' : 'Scan Emails'}
            </Button>
            
            <Button variant="outline" onClick={disconnectGmail}>
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-orange-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Gmail not connected</span>
          </div>
          
          <p className="text-sm text-gray-600">
            Connect your Gmail account to automatically scan for job application emails and extract relevant information.
          </p>

          <Button onClick={initiateGmailOAuth} disabled={loading}>
            {loading ? 'Connecting...' : 'Connect Gmail'}
          </Button>
        </div>
      )}
    </div>
  );
};
