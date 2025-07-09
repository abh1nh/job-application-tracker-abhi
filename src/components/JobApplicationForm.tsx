
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { JobEntry } from '@/types/jobApplication';

interface JobApplicationFormProps {
  onApplicationAdded: (application: JobEntry) => void;
  editingApplication?: JobEntry | null;
  onCancel: () => void;
}

export const JobApplicationForm: React.FC<JobApplicationFormProps> = ({
  onApplicationAdded,
  editingApplication,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    company: editingApplication?.company || '',
    position: editingApplication?.position || '',
    applied_at: editingApplication?.applied_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    status: editingApplication?.status || 'applied',
    source: editingApplication?.source || '',
    portal: editingApplication?.portal || '',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingApplication) {
        const { data, error } = await supabase
          .from('job_entries')
          .update({
            ...formData,
            applied_at: formData.applied_at + 'T00:00:00Z',
          })
          .eq('id', editingApplication.id)
          .select()
          .single();

        if (error) throw error;
        onApplicationAdded(data as JobEntry);
        toast({
          title: "Success",
          description: "Job application updated successfully!",
        });
      } else {
        const { data, error } = await supabase
          .from('job_entries')
          .insert({
            ...formData,
            user_id: user.id,
            applied_at: formData.applied_at + 'T00:00:00Z',
          })
          .select()
          .single();

        if (error) throw error;
        onApplicationAdded(data as JobEntry);
        toast({
          title: "Success",
          description: "Job application added successfully!",
        });
      }

      setFormData({
        company: '',
        position: '',
        applied_at: new Date().toISOString().split('T')[0],
        status: 'applied',
        source: '',
        portal: '',
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">
        {editingApplication ? 'Edit Job Application' : 'Add New Job Application'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company">Company Name *</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="position">Position Title *</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="applied_at">Application Date *</Label>
            <Input
              id="applied_at"
              type="date"
              value={formData.applied_at}
              onChange={(e) => setFormData({ ...formData, applied_at: e.target.value })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full p-2 border rounded-md"
            >
              <option value="applied">Applied</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="e.g., LinkedIn, Company Website, Referral"
            />
          </div>
          
          <div>
            <Label htmlFor="portal">Portal</Label>
            <Input
              id="portal"
              value={formData.portal}
              onChange={(e) => setFormData({ ...formData, portal: e.target.value })}
              placeholder="e.g., LinkedIn, Indeed, Company Career Site"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : (editingApplication ? 'Update' : 'Add Application')}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};
