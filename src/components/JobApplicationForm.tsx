import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { JobApplication } from '@/types/jobApplication';

interface JobApplicationFormProps {
  onApplicationAdded: (application: JobApplication) => void;
  editingApplication?: JobApplication | null;
  onCancel: () => void;
}

export const JobApplicationForm: React.FC<JobApplicationFormProps> = ({
  onApplicationAdded,
  editingApplication,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    company_name: editingApplication?.company_name || '',
    position_title: editingApplication?.position_title || '',
    application_date: editingApplication?.application_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    status: editingApplication?.status || 'applied' as const,
    job_description: editingApplication?.job_description || '',
    application_url: editingApplication?.application_url || '',
    notes: editingApplication?.notes || '',
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
          .from('job_applications')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingApplication.id)
          .select()
          .single();

        if (error) throw error;
        onApplicationAdded(data as JobApplication);
        toast({
          title: "Success",
          description: "Job application updated successfully!",
        });
      } else {
        const { data, error } = await supabase
          .from('job_applications')
          .insert({
            ...formData,
            user_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        onApplicationAdded(data as JobApplication);
        toast({
          title: "Success",
          description: "Job application added successfully!",
        });
      }

      setFormData({
        company_name: '',
        position_title: '',
        application_date: new Date().toISOString().split('T')[0],
        status: 'applied',
        job_description: '',
        application_url: '',
        notes: '',
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
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="position_title">Position Title *</Label>
            <Input
              id="position_title"
              value={formData.position_title}
              onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="application_date">Application Date *</Label>
            <Input
              id="application_date"
              type="date"
              value={formData.application_date}
              onChange={(e) => setFormData({ ...formData, application_date: e.target.value })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
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
        
        <div>
          <Label htmlFor="application_url">Application URL</Label>
          <Input
            id="application_url"
            type="url"
            value={formData.application_url}
            onChange={(e) => setFormData({ ...formData, application_url: e.target.value })}
          />
        </div>
        
        <div>
          <Label htmlFor="job_description">Job Description</Label>
          <textarea
            id="job_description"
            value={formData.job_description}
            onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
            className="w-full p-2 border rounded-md h-32"
          />
        </div>
        
        <div>
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full p-2 border rounded-md h-24"
          />
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
