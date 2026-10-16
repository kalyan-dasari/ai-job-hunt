export type ApplicationStatus =
  | 'Interested'
  | 'Saved'
  | 'Preparing'
  | 'Ready to Apply'
  | 'Applied'
  | 'Assessment'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Withdrawn'
  | 'Expired';

export interface ApplicationTimelineEvent {
  id: string;
  timestamp: string;
  status: ApplicationStatus;
  note: string;
  source: 'candidate' | 'email_detector' | 'system';
}

export interface PreparedMaterials {
  tailoredResumeBullets: string[];
  coverLetter: string;
  recruiterPitch: string;
  screeningAnswers: Array<{
    question: string;
    suggestedAnswer: string;
  }>;
  checklist: Array<{
    id: string;
    item: string;
    completed: boolean;
  }>;
}

export interface ApplicationRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  companyLogo?: string;
  location: string;
  workArrangement: string;
  originalUrl: string;
  source: string;
  status: ApplicationStatus;
  statusReason?: string;
  createdAt: string;
  updatedAt: string;
  appliedAt?: string;
  submissionConfirmed: boolean;
  submissionEvidence?: {
    type: 'official_portal' | 'confirmation_email' | 'reference_id';
    evidenceValue: string;
    verifiedAt: string;
  };
  recruiterContact?: {
    name?: string;
    email?: string;
    title?: string;
  };
  nextFollowUpDate?: string;
  notes: string;
  matchScoreAtApplication?: number;
  preparedMaterials?: PreparedMaterials;
  timeline: ApplicationTimelineEvent[];
  isDemo?: boolean;
}

export interface EmailMessageRecord {
  id: string;
  from: string;
  subject: string;
  receivedAt: string;
  snippet: string;
  fullBody: string;
  detectedType: 'confirmation' | 'assessment' | 'interview_invite' | 'rejection' | 'offer' | 'inquiry';
  associatedApplicationId?: string;
  confidence: number;
  suggestedStatusChange?: ApplicationStatus;
  statusChangeApplied: boolean;
  requiresReview: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'job_alert' | 'startup_opportunity' | 'application_update' | 'interview_reminder' | 'verification_warning' | 'system';
  isRead: boolean;
  relatedJobId?: string;
  relatedApplicationId?: string;
  actionUrl?: string;
}
