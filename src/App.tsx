import React, { useState, useEffect } from 'react';
import { AppSidebar, MainNavTab } from './components/AppSidebar';
import { DiscoverView } from './components/DiscoverView';
import { SavedJobsView } from './components/SavedJobsView';
import { ApplicationsView } from './components/ApplicationsView';
import { ResumeWorkspaceView } from './components/ResumeWorkspaceView';
import { SettingsWorkspaceView } from './components/SettingsWorkspaceView';
import { JobDetailDrawer } from './components/JobDetailDrawer';
import { ResumeTailorView } from './components/ResumeTailorView';
import { NotificationsModal } from './components/NotificationsModal';
import { api } from './api/client';
import { Job } from './types/job';
import { CandidateProfile, emptyCandidateProfile } from './types/candidate';
import { ApplicationRecord, NotificationItem, ApplicationStatus } from './types/application';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<MainNavTab>('discover');

  // Core application state
  const [profile, setProfile] = useState<CandidateProfile>(emptyCandidateProfile);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Overlays & Workspaces
  const [selectedJobDetails, setSelectedJobDetails] = useState<Job | null>(null);
  const [tailoringJob, setTailoringJob] = useState<Job | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // Status & error indicators
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Theme management (default: dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('jobpilot_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem('jobpilot_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Sync state with server API
  const refreshAllData = async () => {
    setIsLoading(true);
    setConnectionError(null);
    try {
      const [profData, jobsData, appsData, notifsData] = await Promise.all([
        api.getProfile(),
        api.getJobs({ showDismissed: 'true' }),
        api.getApplications(),
        api.getNotifications(),
      ]);

      setProfile(profData);
      setJobs(jobsData.jobs || []);
      setApplications(appsData || []);
      setNotifications(notifsData || []);
    } catch (err: any) {
      console.error('Failed to sync state with server:', err);
      setConnectionError(
        err?.message || 'Unable to connect to the JobPilot AI server. Please ensure the backend is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Job Actions
  const handleToggleSave = async (jobId: string) => {
    setActionError(null);
    try {
      const updated = await api.toggleSaveJob(jobId);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
      if (selectedJobDetails?.id === jobId) {
        setSelectedJobDetails(updated);
      }
    } catch (err: any) {
      console.error('Failed to toggle save status:', err);
      setActionError(`Could not update saved status: ${err?.message || 'Server error'}`);
    }
  };

  // Profile update
  const handleUpdateProfile = async (updated: Partial<CandidateProfile>) => {
    setActionError(null);
    try {
      const res = await api.updateProfile(updated);
      setProfile(res);
      // Reload jobs to reflect recalculated match scores
      const jobsRes = await api.getJobs({ showDismissed: 'true' });
      setJobs(jobsRes.jobs || []);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setActionError(`Could not save profile: ${err?.message || 'Server error'}`);
      throw err;
    }
  };

  // Resume upload
  const handleUploadResume = async (payload: {
    rawText?: string;
    fileBase64?: string;
    mimeType?: string;
    fileName?: string;
  }) => {
    setActionError(null);
    const res = await api.uploadResume(payload);
    setProfile(res.profile);
    const jobsRes = await api.getJobs({ showDismissed: 'true' });
    setJobs(jobsRes.jobs || []);
  };

  // Application status update
  const handleUpdateAppStatus = async (id: string, newStatus: ApplicationStatus, note?: string) => {
    setActionError(null);
    try {
      const updated = await api.updateApplication(id, {
        status: newStatus,
        statusReason: note,
      });
      setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err: any) {
      console.error('Failed to update application status:', err);
      setActionError(`Could not update application status: ${err?.message || 'Server error'}`);
    }
  };

  // Track application creation from job detail
  const handleTrackApplication = async (job: Job) => {
    try {
      const newApp = await api.createApplication({
        jobId: job.id,
        status: 'Preparing',
        notes: `Application recorded for ${job.title} at ${job.company}`,
      });
      setApplications((prev) => [newApp, ...prev]);
      alert(`Application recorded for ${job.company}!`);
    } catch (err: any) {
      console.error('Failed to track application:', err);
      setActionError(`Failed to track application: ${err?.message || 'Server error'}`);
    }
  };

  // Mark notification read
  const handleMarkNotifRead = async (id: string) => {
    await api.markNotificationRead(id).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const savedCount = jobs.filter((j) => j.isSaved).length;
  const activeAppsCount = applications.filter((a) => a.status !== 'Rejected' && a.status !== 'Withdrawn').length;
  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row selection:bg-sky-500/30 selection:text-white">
      {/* 1. Left Sidebar Navigation */}
      <AppSidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setTailoringJob(null);
          setActiveTab(tab);
        }}
        savedCount={savedCount}
        applicationsCount={activeAppsCount}
        unreadNotificationsCount={unreadNotifsCount}
        onOpenNotifications={() => setShowNotifications(true)}
        candidate={profile}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        totalJobsCount={jobs.length}
      />

      {/* 2. Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Action Error Banner */}
        {actionError && (
          <div className="bg-red-50 dark:bg-red-950/60 border-b border-red-200 dark:border-red-900/60 px-4 py-2.5 flex items-center justify-between text-xs text-red-800 dark:text-red-300 shrink-0">
            <div className="flex items-center gap-2 max-w-6xl mx-auto w-full">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{actionError}</span>
              <button
                onClick={() => setActionError(null)}
                className="ml-auto text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
          {/* Backend Connection Error Banner */}
          {connectionError && (
            <div className="mb-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 rounded-2xl p-6 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Server Connection Error
              </h2>
              <p className="text-xs text-red-700 dark:text-red-300 max-w-lg mx-auto">
                {connectionError}
              </p>
              <button
                onClick={refreshAllData}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* Primary View Routing */}
          {tailoringJob ? (
            <ResumeTailorView
              job={tailoringJob}
              candidate={profile}
              onBack={() => setTailoringJob(null)}
              onApplicationCreated={refreshAllData}
              onSaveTailoredVersion={() => {
                refreshAllData();
              }}
            />
          ) : activeTab === 'discover' ? (
            <DiscoverView
              jobs={jobs}
              candidate={profile}
              isLoading={isLoading}
              onRefresh={refreshAllData}
              onSelectJob={(job) => setSelectedJobDetails(job)}
              onToggleSave={handleToggleSave}
              onTailorResume={(job) => setTailoringJob(job)}
            />
          ) : activeTab === 'saved' ? (
            <SavedJobsView
              jobs={jobs}
              applications={applications}
              onSelectJob={(job) => setSelectedJobDetails(job)}
              onToggleSave={handleToggleSave}
              onTailorResume={(job) => setTailoringJob(job)}
              onNavigateDiscover={() => setActiveTab('discover')}
            />
          ) : activeTab === 'applications' ? (
            <ApplicationsView
              applications={applications}
              jobs={jobs}
              onUpdateStatus={handleUpdateAppStatus}
              onSelectJob={(job) => setSelectedJobDetails(job)}
              onNavigateDiscover={() => setActiveTab('discover')}
            />
          ) : activeTab === 'resume' ? (
            <ResumeWorkspaceView
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              onUploadResume={handleUploadResume}
            />
          ) : activeTab === 'settings' ? (
            <SettingsWorkspaceView
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              onRefreshData={refreshAllData}
              theme={theme}
              onToggleTheme={handleToggleTheme}
            />
          ) : null}
        </main>
      </div>

      {/* 3. Job Detail Slide-Over Drawer */}
      {selectedJobDetails && (
        <JobDetailDrawer
          job={selectedJobDetails}
          candidate={profile}
          onClose={() => setSelectedJobDetails(null)}
          onToggleSave={handleToggleSave}
          onTailorResume={(job) => {
            setSelectedJobDetails(null);
            setTailoringJob(job);
          }}
          onTrackApplication={handleTrackApplication}
          isApplied={applications.some((a) => a.jobId === selectedJobDetails.id)}
        />
      )}

      {/* 4. In-App Notifications Modal */}
      {showNotifications && (
        <NotificationsModal
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkRead={handleMarkNotifRead}
        />
      )}
    </div>
  );
}
