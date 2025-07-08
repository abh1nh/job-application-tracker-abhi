
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { JobEntry } from '@/types/jobApplication';
import { JobApplicationForm } from './JobApplicationForm';
import { JobApplicationsList } from './JobApplicationsList';
import { GmailIntegration } from './GmailIntegration';
import { Button } from '@/components/ui/button';
import { LogOut, Plus } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [applications, setApplications] = useState<JobEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingApplication, setEditingApplication] = useState<JobEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'applications' | 'gmail'>('applications');
  const { toast } = useToast();

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('job_entries')
        .select('*')
        .order('applied_at', { ascending: false });

      if (error) throw error;
      setApplications((data || []) as JobEntry[]);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to fetch job applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationAdded = (application: JobEntry) => {
    if (editingApplication) {
      setApplications(prev => 
        prev.map(app => app.id === application.id ? application : app)
      );
      setEditingApplication(null);
    } else {
      setApplications(prev => [application, ...prev]);
    }
    setShowForm(false);
  };

  const handleEdit = (application: JobEntry) => {
    setEditingApplication(application);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('job_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setApplications(prev => prev.filter(app => app.id !== id));
      toast({
        title: "Success",
        description: "Job application deleted successfully!",
      });
    } catch (error: any) {
      console.error('Error deleting application:', error);
      toast({
        title: "Error",
        description: "Failed to delete job application",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingApplication(null);
  };

  useEffect(() => {
    fetchApplications();
    
    // Check for Gmail connection callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('gmail_connected') === 'true') {
      toast({
        title: "Success",
        description: "Gmail account connected successfully!",
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('gmail_error')) {
      toast({
        title: "Error",
        description: decodeURIComponent(urlParams.get('gmail_error') || 'Gmail connection failed'),
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">Job Application Tracker</h1>
            
            <div className="flex items-center gap-4">
              <nav className="flex gap-4">
                <button
                  onClick={() => setActiveTab('applications')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'applications'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Applications
                </button>
                <button
                  onClick={() => setActiveTab('gmail')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'gmail'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Gmail Integration
                </button>
              </nav>
              
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'applications' && (
          <div className="space-y-8">
            {!showForm && (
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Job Applications</h2>
                  <p className="text-gray-600">Track your job applications and their status</p>
                </div>
                
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Application
                </Button>
              </div>
            )}

            {showForm && (
              <JobApplicationForm
                onApplicationAdded={handleApplicationAdded}
                editingApplication={editingApplication}
                onCancel={handleCancel}
              />
            )}

            {!showForm && (
              <JobApplicationsList
                applications={applications}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </div>
        )}

        {activeTab === 'gmail' && <GmailIntegration />}
      </main>
    </div>
  );
};
