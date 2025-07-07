
import React from 'react';
import { Button } from '@/components/ui/button';
import { JobApplication } from '@/types/jobApplication';
import { Edit, Trash2, ExternalLink } from 'lucide-react';

interface JobApplicationsListProps {
  applications: JobApplication[];
  onEdit: (application: JobApplication) => void;
  onDelete: (id: string) => void;
}

export const JobApplicationsList: React.FC<JobApplicationsListProps> = ({
  applications,
  onEdit,
  onDelete
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'interview': return 'bg-yellow-100 text-yellow-800';
      case 'offer': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'withdrawn': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (applications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No job applications yet. Add your first application above!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Your Job Applications</h3>
      
      <div className="grid gap-4">
        {applications.map((application) => (
          <div key={application.id} className="bg-white p-6 rounded-lg shadow-md border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-semibold">{application.position_title}</h4>
                <p className="text-gray-600">{application.company_name}</p>
                <p className="text-sm text-gray-500">
                  Applied: {new Date(application.application_date).toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                  {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                </span>
                
                <div className="flex gap-1">
                  {application.application_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(application.application_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(application)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDelete(application.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {application.job_description && (
              <div className="mb-3">
                <h5 className="font-medium text-sm text-gray-700 mb-1">Job Description:</h5>
                <p className="text-sm text-gray-600 line-clamp-3">{application.job_description}</p>
              </div>
            )}
            
            {application.notes && (
              <div>
                <h5 className="font-medium text-sm text-gray-700 mb-1">Notes:</h5>
                <p className="text-sm text-gray-600">{application.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
