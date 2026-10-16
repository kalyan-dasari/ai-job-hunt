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
import { NotificationsModal } from './components/NotificationsModal';
import { api } from './api/client';
import { Job } from './types/job';
import { CandidateProfile } from './types/candidate';
import { ApplicationRecord, EmailMessageRecord, NotificationItem, ApplicationStatus } from './types/application';
import { SourceConnector } from './types/connector';
import { initialCandidateProfile, initialJobs, initialApplications, initialEmails, initialNotifications, initialConnectors } from './data/mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  // Core application state
  const [profile, setProfile] = useState<CandidateProfile>(initialCandidateProfile);
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [applications, setApplications] = useState<ApplicationRecord[]>(initialApplications);
  const [emails, setEmails] = useState<EmailMessageRecord[]>(initialEmails);
  const [connectors, setConnectors] = useState<SourceConnector[]>(initialConnectors);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);

  // Modals & Drawers
  const [selectedJobDetails, setSelectedJobDetails] = useState<Job | null>(null);
  const [selectedJobToApply, setSelectedJobToApply] = useState<Job | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial data from server API
  const refreshAllData = async () => {
    try {
      const [profData, jobsData, appsData, emailsData, connData, notifsData] = await Promise.all([
        api.getProfile().catch(() => initialCandidateProfile),
        api.getJobs({ showDismissed: 'true' }).catch(() => ({ total: initialJobs.length, jobs: initialJobs })),
        api.getApplications().catch(() => initialApplications),
        api.getEmails().catch(() => initialEmails),
        api.getConnectors().catch(() => initialConnectors),
        api.getNotifications().catch(() => initialNotifications),
      ]);

      setProfile(profData);
      setJobs(jobsData.jobs);
      setApplications(appsData);
      setEmails(emailsData);
      setConnectors(connData);
      setNotifications(notifsData);
    } catch (err) {
      console.error('Failed to sync state with server:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Job Actions
  const handleToggleSave = async (jobId: string) => {
    try {
      const updated = await api.toggleSaveJob(jobId);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
    } catch {
      // Local fallback
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, isSaved: !j.isSaved } : j))
      );
    }
  };

  const handleToggleDismiss = async (jobId: string) => {
    try {
      const updated = await api.toggleDismissJob(jobId);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
    } catch {
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, isDismissed: !j.isDismissed } : j))
      );
    }
  };

  // Profile update
  const handleUpdateProfile = async (updated: Partial<CandidateProfile>) => {
    const res = await api.updateProfile(updated);
    setProfile(res);
    // Reload jobs because matches recalculated
    const jobsRes = await api.getJobs({ showDismissed: 'true' });
    setJobs(jobsRes.jobs);
  };

  // Resume upload
  const handleUploadResume = async (payload: {
    rawText?: string;
    fileBase64?: string;
    mimeType?: string;
    fileName?: string;
  }) => {
    const res = await api.uploadResume(payload);
    setProfile(res.profile);
    const jobsRes = await api.getJobs({ showDismissed: 'true' });
    setJobs(jobsRes.jobs);
  };

  // Application status update
  const handleUpdateAppStatus = async (id: string, newStatus: ApplicationStatus, note?: string) => {
    const updated = await api.updateApplication(id, {
      status: newStatus,
      statusReason: note,
    });
    setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
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
        isDemoMode={isDemoMode}
        setIsDemoMode={setIsDemoMode}
        unreadCount={unreadNotifsCount}
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenImport={() => setActiveTab('sources')}
        onExport={() => {
          window.location.href = '/api/export?type=json';
        }}
      />

      {/* Main App Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            candidate={profile}
            jobs={jobs}
            applications={applications}
            isDemoMode={isDemoMode}
            onNavigateTab={(tab) => setActiveTab(tab as NavTab)}
            onSelectJob={(job) => setSelectedJobDetails(job)}
            onPrepareApplication={(job) => setSelectedJobToApply(job)}
          />
        )}

        {activeTab === 'discovery' && (
          <JobDiscoveryView
            jobs={jobs}
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
      </main>

      {/* Footer (Anti-slop: quiet, no fake telemetry tickers) */}
      <footer className="border-t border-slate-800/80 bg-[#0e131f] py-6 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">JobPilot AI</span>
            <span>·</span>
            <span>Authentic Job Discovery & Verified Application Agent</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
            <span>Server: Operational</span>
            <span>·</span>
            <span>Active Profile: {profile.name}</span>
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
