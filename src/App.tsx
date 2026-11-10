import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { JobDiscoveryView } from './components/JobDiscoveryView';
import { StartupJobsView } from './components/StartupJobsView';
import { ResumeProfileView } from './components/ResumeProfileView';
import { ApplicationTrackerView } from './components/ApplicationTrackerView';
import { ApplicationAssistantModal } from './components/ApplicationAssistantModal';
import { JobDetailsModal } from './components/JobDetailsModal';
import { ResponseInboxView } from './components/ResponseInboxView';
import { SourcesIngestionView } from './components/SourcesIngestionView';
import { SettingsView } from './components/SettingsView';
import { NotificationsModal } from './components/NotificationsModal';
import { api } from './api/client';
import { Job } from './types/job';
import { CandidateProfile, emptyCandidateProfile } from './types/candidate';
import { ApplicationRecord, EmailMessageRecord, NotificationItem, ApplicationStatus } from './types/application';
import { SourceConnector } from './types/connector';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Core application state - Real, clean empty state
  const [profile, setProfile] = useState<CandidateProfile>(emptyCandidateProfile);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [emails, setEmails] = useState<EmailMessageRecord[]>([]);
  const [connectors, setConnectors] = useState<SourceConnector[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Modals & Drawers
  const [selectedJobDetails, setSelectedJobDetails] = useState<Job | null>(null);
  const [selectedJobToApply, setSelectedJobToApply] = useState<Job | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch initial data from server API without fake fallbacks
  const refreshAllData = async () => {
    setIsLoading(true);
    setConnectionError(null);
    try {
      const [profData, jobsData, appsData, emailsData, connData, notifsData] = await Promise.all([
        api.getProfile(),
        api.getJobs({ showDismissed: 'true' }),
        api.getApplications(),
        api.getEmails(),
        api.getConnectors(),
        api.getNotifications(),
      ]);

      setProfile(profData);
      setJobs(jobsData.jobs || []);
      setApplications(appsData || []);
      setEmails(emailsData || []);
      setConnectors(connData || []);
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

  // Job Actions - Strict server communication without silent local deception
  const handleToggleSave = async (jobId: string) => {
    setActionError(null);
    try {
      const updated = await api.toggleSaveJob(jobId);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
    } catch (err: any) {
      console.error('Failed to toggle save status:', err);
      setActionError(`Could not update saved status: ${err?.message || 'Server error'}`);
    }
  };

  const handleToggleDismiss = async (jobId: string) => {
    setActionError(null);
    try {
      const updated = await api.toggleDismissJob(jobId);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
    } catch (err: any) {
      console.error('Failed to toggle dismiss status:', err);
      setActionError(`Could not update dismiss status: ${err?.message || 'Server error'}`);
    }
  };

  // Profile update
  const handleUpdateProfile = async (updated: Partial<CandidateProfile>) => {
    setActionError(null);
    try {
      const res = await api.updateProfile(updated);
      setProfile(res);
      // Reload jobs because matches recalculated
      const jobsRes = await api.getJobs({ showDismissed: 'true' });
      setJobs(jobsRes.jobs || []);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setActionError(`Could not save profile: ${err?.message || 'Server error'}`);
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

  // Mark notification read
  const handleMarkNotifRead = async (id: string) => {
    await api.markNotificationRead(id).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#0c0f17] text-slate-100 flex flex-col selection:bg-sky-500/30 selection:text-white">
      {/* 3-Zone Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadCount={unreadNotifsCount}
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenImport={() => setActiveTab('sources')}
        onExport={() => {
          window.location.href = '/api/export?type=json';
        }}
      />

      {/* Action Error Banner */}
      {actionError && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-red-300">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="ml-auto text-slate-400 hover:text-white font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main App Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Backend Connection Error Banner with Honest Retry */}
        {connectionError && (
          <div className="mb-6 bg-red-950/40 border border-red-800/80 rounded-2xl p-6 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <h2 className="text-base font-bold text-white">Server Connection Error</h2>
            <p className="text-xs text-red-300 max-w-lg mx-auto">
              {connectionError}
            </p>
            <p className="text-[11px] text-slate-400">
              The application operates in real-data mode and does not substitute fake records when the server is unavailable.
            </p>
            <button
              onClick={refreshAllData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            candidate={profile}
            jobs={jobs}
            applications={applications}
            onNavigateTab={(tab) => setActiveTab(tab as NavTab)}
            onSelectJob={(job) => setSelectedJobDetails(job)}
            onPrepareApplication={(job) => setSelectedJobToApply(job)}
          />
        )}

        {activeTab === 'discovery' && (
          <JobDiscoveryView
            jobs={jobs}
            applications={applications}
            onSelectJob={(job) => setSelectedJobDetails(job)}
            onPrepareApplication={(job) => setSelectedJobToApply(job)}
            onToggleSave={handleToggleSave}
            onToggleDismiss={handleToggleDismiss}
          />
        )}

        {activeTab === 'startups' && (
          <StartupJobsView
            jobs={jobs}
            onSelectJob={(job) => setSelectedJobDetails(job)}
            onPrepareApplication={(job) => setSelectedJobToApply(job)}
            onToggleSave={handleToggleSave}
          />
        )}

        {activeTab === 'applications' && (
          <ApplicationTrackerView
            applications={applications}
            onUpdateStatus={handleUpdateAppStatus}
            onSelectApplication={(app) => {
              const matchedJob = jobs.find((j) => j.id === app.jobId);
              if (matchedJob) setSelectedJobDetails(matchedJob);
            }}
            onNavigateTab={(tab) => setActiveTab(tab as NavTab)}
          />
        )}

        {activeTab === 'resume' && (
          <ResumeProfileView
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onUploadResume={handleUploadResume}
          />
        )}

        {activeTab === 'inbox' && (
          <ResponseInboxView
            emails={emails}
            applications={applications}
            onRefresh={refreshAllData}
          />
        )}

        {activeTab === 'sources' && (
          <SourcesIngestionView
            connectors={connectors}
            onJobsImported={refreshAllData}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onRefreshData={refreshAllData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0e131f] py-6 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">JobPilot AI</span>
            <span>·</span>
            <span>Authentic Job Discovery & Verified Application Agent</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
            <span>Server: {connectionError ? 'Offline / Error' : 'Operational'}</span>
            <span>·</span>
            <span>Active Profile: {profile.name || 'Not Configured'}</span>
          </div>
        </div>
      </footer>

      {/* Job Details Modal */}
      {selectedJobDetails && (
        <JobDetailsModal
          job={selectedJobDetails}
          onClose={() => setSelectedJobDetails(null)}
          onPrepareApplication={(job) => {
            setSelectedJobDetails(null);
            setSelectedJobToApply(job);
          }}
          onToggleSave={handleToggleSave}
          onToggleDismiss={handleToggleDismiss}
        />
      )}

      {/* AI Application Assistant Modal */}
      {selectedJobToApply && (
        <ApplicationAssistantModal
          job={selectedJobToApply}
          candidate={profile}
          onClose={() => setSelectedJobToApply(null)}
          onApplicationCreated={refreshAllData}
        />
      )}

      {/* In-app Notifications Drawer */}
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
