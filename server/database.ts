import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { CandidateProfile, emptyCandidateProfile, ResumeVersion } from '../src/types/candidate';
import { Job, VerificationReport, MatchResult } from '../src/types/job';
import {
  ApplicationRecord,
  ApplicationStatus,
  ApplicationTimelineEvent,
  EmailMessageRecord,
  NotificationItem,
  PreparedMaterials,
} from '../src/types/application';
import { SourceConnector, ProviderUsageInfo, CompanySource, DiscoveryAttempt, SchedulerState } from '../src/types/connector';
import { IngestionRunRecord, JobSourceReference } from './job-sources/types.ts';
import { normalizeExperienceLevel, classifyLocation } from './job-sources/normalizer.ts';
import {
  computeNextRunAtIst,
  isTodayIst,
  isWithinHours,
  isWithinDays,
} from './temporal.ts';

// ---------------- DATABASE INSTANCE LIFECYCLE ----------------
let dbInstance: DatabaseSync | null = null;
let currentDbPath: string | null = null;

export function getDatabasePath(): string {
  if (process.env.DATABASE_PATH && process.env.DATABASE_PATH.trim() !== '') {
    return path.resolve(process.cwd(), process.env.DATABASE_PATH.trim());
  }
  return path.resolve(process.cwd(), 'data', 'jobpilot.db');
}

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (err) {
      console.error('Error closing SQLite database:', err);
    }
    dbInstance = null;
    currentDbPath = null;
  }
}

export function transaction<T>(fn: () => T): T {
  const db = getDatabase();
  db.exec('BEGIN TRANSACTION;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch (rollbackErr) {
      console.error('Failed to rollback transaction:', rollbackErr);
    }
    throw err;
  }
}

// Helper JSON serializers
function toJson(val: any, fallback: string | null = null): string | null {
  if (val === undefined || val === null) return fallback;
  try {
    return JSON.stringify(val);
  } catch {
    return fallback;
  }
}

function fromJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

function boolToInt(val: boolean | undefined | null): number {
  return val ? 1 : 0;
}

function intToBool(val: number | undefined | null): boolean {
  return val === 1;
}

// ---------------- MIGRATIONS ENGINE ----------------
const MIGRATIONS = [
  {
    version: 1,
    name: '001_core_persistence_schema',
    up: (db: DatabaseSync) => {
      // 1. Candidate Profile Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS candidate_profile (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL DEFAULT '',
          email TEXT NOT NULL DEFAULT '',
          phone TEXT NOT NULL DEFAULT '',
          location TEXT NOT NULL DEFAULT '',
          headline TEXT NOT NULL DEFAULT '',
          summary TEXT NOT NULL DEFAULT '',
          skills TEXT NOT NULL DEFAULT '[]',
          skill_categories TEXT NOT NULL DEFAULT '{}',
          experience TEXT NOT NULL DEFAULT '[]',
          education TEXT NOT NULL DEFAULT '[]',
          projects TEXT NOT NULL DEFAULT '[]',
          certifications TEXT NOT NULL DEFAULT '[]',
          preferred_roles TEXT NOT NULL DEFAULT '[]',
          preferred_locations TEXT NOT NULL DEFAULT '[]',
          preferred_arrangements TEXT NOT NULL DEFAULT '[]',
          preferred_types TEXT NOT NULL DEFAULT '[]',
          min_expected_salary REAL,
          work_authorization TEXT NOT NULL DEFAULT '',
          raw_resume_text TEXT NOT NULL DEFAULT '',
          active_resume_id TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL
        );
      `);

      // 2. Resume Versions Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS resume_versions (
          id TEXT PRIMARY KEY,
          candidate_id TEXT NOT NULL DEFAULT 'candidate-default',
          file_name TEXT NOT NULL,
          version_name TEXT NOT NULL,
          file_size_bytes INTEGER NOT NULL DEFAULT 0,
          extracted_text_length INTEGER NOT NULL DEFAULT 0,
          raw_text TEXT NOT NULL DEFAULT '',
          is_active INTEGER NOT NULL DEFAULT 0,
          uploaded_at TEXT NOT NULL,
          FOREIGN KEY (candidate_id) REFERENCES candidate_profile(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_resume_versions_cand ON resume_versions(candidate_id);
      `);

      // 3. Jobs Catalog Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS jobs (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          company TEXT NOT NULL,
          company_logo TEXT,
          location TEXT NOT NULL DEFAULT 'Not Specified',
          work_arrangement TEXT NOT NULL DEFAULT 'Hybrid',
          employment_type TEXT NOT NULL DEFAULT 'Full-time',
          experience_level TEXT NOT NULL DEFAULT 'Mid',
          min_exp_years REAL DEFAULT 0,
          max_exp_years REAL DEFAULT 0,
          salary TEXT,
          description TEXT NOT NULL DEFAULT '',
          responsibilities TEXT NOT NULL DEFAULT '[]',
          required_skills TEXT NOT NULL DEFAULT '[]',
          preferred_skills TEXT NOT NULL DEFAULT '[]',
          source TEXT NOT NULL DEFAULT 'Manual Import',
          source_job_id TEXT NOT NULL DEFAULT '',
          original_url TEXT NOT NULL DEFAULT '',
          canonical_url TEXT NOT NULL DEFAULT '',
          date_posted TEXT NOT NULL,
          last_checked TEXT NOT NULL,
          is_startup INTEGER NOT NULL DEFAULT 0,
          startup_info TEXT,
          verification_report TEXT NOT NULL,
          match_result TEXT,
          is_saved INTEGER NOT NULL DEFAULT 0,
          is_dismissed INTEGER NOT NULL DEFAULT 0,
          is_duplicate INTEGER NOT NULL DEFAULT 0,
          duplicate_of_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_jobs_company_title ON jobs(company, title);
        CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
        CREATE INDEX IF NOT EXISTS idx_jobs_saved ON jobs(is_saved);
        CREATE INDEX IF NOT EXISTS idx_jobs_dismissed ON jobs(is_dismissed);
        CREATE INDEX IF NOT EXISTS idx_jobs_date_posted ON jobs(date_posted);
      `);

      // 4. Applications Tracker Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS applications (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL,
          job_title TEXT NOT NULL,
          company TEXT NOT NULL,
          company_logo TEXT,
          location TEXT NOT NULL,
          work_arrangement TEXT NOT NULL,
          original_url TEXT NOT NULL DEFAULT '',
          source TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'Preparing',
          status_reason TEXT,
          submission_confirmed INTEGER NOT NULL DEFAULT 0,
          submission_evidence TEXT,
          recruiter_contact TEXT,
          next_follow_up_date TEXT,
          notes TEXT NOT NULL DEFAULT '',
          match_score_at_application REAL DEFAULT 0,
          prepared_materials TEXT,
          timeline TEXT NOT NULL DEFAULT '[]',
          applied_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT
        );
        CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
        CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
        CREATE INDEX IF NOT EXISTS idx_applications_updated_at ON applications(updated_at);
      `);

      // 5. Emails Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS emails (
          id TEXT PRIMARY KEY,
          sender TEXT NOT NULL,
          subject TEXT NOT NULL,
          received_at TEXT NOT NULL,
          snippet TEXT NOT NULL,
          full_body TEXT NOT NULL,
          detected_type TEXT NOT NULL,
          associated_application_id TEXT,
          confidence REAL NOT NULL DEFAULT 0,
          suggested_status_change TEXT,
          status_change_applied INTEGER NOT NULL DEFAULT 0,
          requires_review INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          FOREIGN KEY (associated_application_id) REFERENCES applications(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_emails_app_id ON emails(associated_application_id);
        CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at);
      `);

      // 6. Notifications Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          type TEXT NOT NULL,
          is_read INTEGER NOT NULL DEFAULT 0,
          related_job_id TEXT,
          related_application_id TEXT,
          action_url TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
        CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp);
      `);

      // 7. Source Connectors Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS connectors (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          display_name TEXT NOT NULL,
          description TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Configured',
          access_method TEXT NOT NULL,
          requires_auth INTEGER NOT NULL DEFAULT 0,
          terms_compliant INTEGER NOT NULL DEFAULT 1,
          rate_limit_info TEXT NOT NULL DEFAULT '',
          last_sync_timestamp TEXT,
          active_jobs_count INTEGER NOT NULL DEFAULT 0,
          setup_instructions TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // 8. User Activity Logs Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id TEXT PRIMARY KEY,
          action_type TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT,
          summary TEXT NOT NULL,
          details TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
      `);
    },
  },
  {
    version: 2,
    name: '002_job_discovery_and_sources',
    up: (db: DatabaseSync) => {
      // 1. Add freshness and verification columns to jobs table
      try {
        db.exec("ALTER TABLE jobs ADD COLUMN freshness_status TEXT NOT NULL DEFAULT 'Active';");
      } catch (err: any) {
        // column may already exist
      }
      try {
        db.exec("ALTER TABLE jobs ADD COLUMN expiry_date TEXT;");
      } catch (err: any) {}
      try {
        db.exec("ALTER TABLE jobs ADD COLUMN last_verified_at TEXT;");
      } catch (err: any) {}

      // 2. Ingestion runs table
      db.exec(`
        CREATE TABLE IF NOT EXISTS ingestion_runs (
          id TEXT PRIMARY KEY,
          trigger_type TEXT NOT NULL DEFAULT 'manual',
          status TEXT NOT NULL DEFAULT 'running',
          started_at TEXT NOT NULL,
          completed_at TEXT,
          sources_checked TEXT NOT NULL DEFAULT '[]',
          jobs_found INTEGER NOT NULL DEFAULT 0,
          jobs_added INTEGER NOT NULL DEFAULT 0,
          duplicates_filtered INTEGER NOT NULL DEFAULT 0,
          errors TEXT NOT NULL DEFAULT '[]',
          details TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_ingestion_runs_started_at ON ingestion_runs(started_at);
        CREATE INDEX IF NOT EXISTS idx_ingestion_runs_status ON ingestion_runs(status);
      `);

      // 3. Job Sources (provenance and cross-source references)
      db.exec(`
        CREATE TABLE IF NOT EXISTS job_sources (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL,
          source_name TEXT NOT NULL,
          source_job_id TEXT,
          source_url TEXT NOT NULL,
          discovered_at TEXT NOT NULL,
          metadata TEXT,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_job_sources_job_id ON job_sources(job_id);
        CREATE INDEX IF NOT EXISTS idx_job_sources_lookup ON job_sources(source_name, source_job_id);
      `);
    },
  },
  {
    version: 3,
    name: '003_api_usage_and_query_cache',
    up: (db: DatabaseSync) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS api_usage (
          provider TEXT PRIMARY KEY,
          monthly_quota INTEGER NOT NULL DEFAULT 200,
          current_month TEXT NOT NULL,
          requests_used INTEGER NOT NULL DEFAULT 0,
          last_request_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS query_cache (
          cache_key TEXT PRIMARY KEY,
          provider TEXT NOT NULL,
          query_params TEXT NOT NULL,
          response_json TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_query_cache_lookup ON query_cache(provider, expires_at);
      `);
    },
  },
  {
    version: 4,
    name: '004_company_sources_and_discovery_attempts',
    up: (db: DatabaseSync) => {
      // 1. Company Sources Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS company_sources (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          website_url TEXT NOT NULL,
          careers_url TEXT NOT NULL,
          ats_provider TEXT,
          ats_slug TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          last_crawl_at TEXT,
          last_successful_crawl_at TEXT,
          last_error TEXT,
          crawl_frequency_hours INTEGER NOT NULL DEFAULT 6,
          jobs_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_company_sources_status ON company_sources(status);
        CREATE INDEX IF NOT EXISTS idx_company_sources_ats ON company_sources(ats_provider);

        CREATE TABLE IF NOT EXISTS discovery_attempts (
          id TEXT PRIMARY KEY,
          company_id TEXT,
          url TEXT NOT NULL,
          status TEXT NOT NULL,
          http_status INTEGER,
          error_message TEXT,
          jobs_found INTEGER NOT NULL DEFAULT 0,
          attempted_at TEXT NOT NULL,
          FOREIGN KEY (company_id) REFERENCES company_sources(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_discovery_attempts_company ON discovery_attempts(company_id);
        CREATE INDEX IF NOT EXISTS idx_discovery_attempts_attempted_at ON discovery_attempts(attempted_at);
      `);

      // 2. Extend jobs table with extra metadata if missing
      try { db.exec("ALTER TABLE jobs ADD COLUMN company_website TEXT;"); } catch {}
      try { db.exec("ALTER TABLE jobs ADD COLUMN application_url TEXT;"); } catch {}
      try { db.exec("ALTER TABLE jobs ADD COLUMN source_type TEXT;"); } catch {}
      try { db.exec("ALTER TABLE jobs ADD COLUMN country TEXT DEFAULT 'India';"); } catch {}

      // 3. Seed Indian Startup & Tech Company Sources
      const INITIAL_COMPANIES = [
        { id: 'comp-razorpay', name: 'Razorpay', website_url: 'https://razorpay.com', careers_url: 'https://razorpay.com/jobs/', ats_provider: 'greenhouse', ats_slug: 'razorpay' },
        { id: 'comp-postman', name: 'Postman', website_url: 'https://postman.com', careers_url: 'https://www.postman.com/company/careers/', ats_provider: 'greenhouse', ats_slug: 'postman' },
        { id: 'comp-cred', name: 'CRED', website_url: 'https://cred.club', careers_url: 'https://cred.club/careers', ats_provider: 'lever', ats_slug: 'cred' },
        { id: 'comp-hasura', name: 'Hasura', website_url: 'https://hasura.io', careers_url: 'https://hasura.io/careers/', ats_provider: 'ashby', ats_slug: 'hasura' },
        { id: 'comp-urbancompany', name: 'Urban Company', website_url: 'https://urbancompany.com', careers_url: 'https://www.urbancompany.com/careers', ats_provider: 'ashby', ats_slug: 'urbancompany' },
        { id: 'comp-browserstack', name: 'BrowserStack', website_url: 'https://browserstack.com', careers_url: 'https://www.browserstack.com/careers', ats_provider: 'greenhouse', ats_slug: 'browserstack' },
        { id: 'comp-moengage', name: 'MoEngage', website_url: 'https://moengage.com', careers_url: 'https://www.moengage.com/company/careers/', ats_provider: 'greenhouse', ats_slug: 'moengage' },
        { id: 'comp-groww', name: 'Groww', website_url: 'https://groww.in', careers_url: 'https://groww.in/careers', ats_provider: 'lever', ats_slug: 'groww' },
        { id: 'comp-zepto', name: 'Zepto', website_url: 'https://zeptonow.com', careers_url: 'https://www.zeptonow.com/careers', ats_provider: 'greenhouse', ats_slug: 'zepto' },
        { id: 'comp-clevertap', name: 'CleverTap', website_url: 'https://clevertap.com', careers_url: 'https://clevertap.com/careers/', ats_provider: 'greenhouse', ats_slug: 'clevertap' },
        { id: 'comp-shiprocket', name: 'Shiprocket', website_url: 'https://shiprocket.in', careers_url: 'https://www.shiprocket.in/careers/', ats_provider: 'smartrecruiters', ats_slug: 'Shiprocket' },
        { id: 'comp-yellowai', name: 'Yellow.ai', website_url: 'https://yellow.ai', careers_url: 'https://yellow.ai/careers/', ats_provider: 'greenhouse', ats_slug: 'yellowai' },
        { id: 'comp-hackerearth', name: 'HackerEarth', website_url: 'https://hackerearth.com', careers_url: 'https://hackerearth.recruitee.com/', ats_provider: 'recruitee', ats_slug: 'hackerearth' },
        { id: 'comp-inmobi', name: 'InMobi', website_url: 'https://inmobi.com', careers_url: 'https://www.inmobi.com/company/careers/', ats_provider: 'greenhouse', ats_slug: 'inmobi' },
        { id: 'comp-urbanpiper', name: 'UrbanPiper', website_url: 'https://urbanpiper.com', careers_url: 'https://www.urbanpiper.com/careers', ats_provider: 'greenhouse', ats_slug: 'urbanpiper' },
        { id: 'comp-zerodha', name: 'Zerodha', website_url: 'https://zerodha.com', careers_url: 'https://zerodha.com/careers', ats_provider: 'generic', ats_slug: 'zerodha' },
      ];

      const now = new Date().toISOString();
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO company_sources (id, name, website_url, careers_url, ats_provider, ats_slug, status, crawl_frequency_hours, jobs_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', 6, 0, ?, ?)
      `);

      for (const comp of INITIAL_COMPANIES) {
        insertStmt.run(comp.id, comp.name, comp.website_url, comp.careers_url, comp.ats_provider, comp.ats_slug, now, now);
      }
    },
  },
  {
    version: 5,
    name: '005_expanded_company_coverage_and_fresher_relevance',
    up: (db: DatabaseSync) => {
      try { db.exec("ALTER TABLE jobs ADD COLUMN fresher_status TEXT DEFAULT 'Unclear';"); } catch {}
      try { db.exec("ALTER TABLE jobs ADD COLUMN location_category TEXT DEFAULT 'India city';"); } catch {}
      try { db.exec("ALTER TABLE jobs ADD COLUMN target_role_category TEXT;"); } catch {}

      const EXPANDED_COMPANIES = [
        // Hyderabad Hub
        { id: 'comp-observeai', name: 'Observe.ai', website_url: 'https://observe.ai', careers_url: 'https://boards.greenhouse.io/observeai', ats_provider: 'greenhouse', ats_slug: 'observeai' },
        { id: 'comp-zenoti', name: 'Zenoti', website_url: 'https://zenoti.com', careers_url: 'https://boards.greenhouse.io/zenoti', ats_provider: 'greenhouse', ats_slug: 'zenoti' },
        { id: 'comp-highradius', name: 'HighRadius', website_url: 'https://highradius.com', careers_url: 'https://boards.greenhouse.io/highradius', ats_provider: 'greenhouse', ats_slug: 'highradius' },
        { id: 'comp-decisions', name: 'Decisions', website_url: 'https://decisions.com', careers_url: 'https://ats.rippling.com/decisions/jobs', ats_provider: 'rippling', ats_slug: 'decisions' },
        // Bengaluru Startups & High-Growth Tech
        { id: 'comp-apna', name: 'Apna', website_url: 'https://apna.co', careers_url: 'https://apply.workable.com/apna/', ats_provider: 'workable', ats_slug: 'apna' },
        { id: 'comp-swiggy', name: 'Swiggy', website_url: 'https://swiggy.com', careers_url: 'https://careers.swiggy.com/', ats_provider: 'smartrecruiters', ats_slug: 'swiggy' },
        { id: 'comp-razorpay-live', name: 'Razorpay', website_url: 'https://razorpay.com', careers_url: 'https://boards.greenhouse.io/razorpaysoftwareprivatelimited', ats_provider: 'greenhouse', ats_slug: 'razorpaysoftwareprivatelimited' },
        { id: 'comp-fortanix', name: 'Fortanix', website_url: 'https://fortanix.com', careers_url: 'https://apply.workable.com/fortanix/', ats_provider: 'workable', ats_slug: 'fortanix' },
        { id: 'comp-signoz', name: 'SigNoz', website_url: 'https://signoz.io', careers_url: 'https://jobs.ashbyhq.com/signoz', ats_provider: 'ashby', ats_slug: 'signoz' },
        { id: 'comp-slice', name: 'Slice', website_url: 'https://sliceit.com', careers_url: 'https://boards.greenhouse.io/slice', ats_provider: 'greenhouse', ats_slug: 'slice' },
        { id: 'comp-mercari', name: 'Mercari India', website_url: 'https://mercari.com', careers_url: 'https://apply.workable.com/mercari-india/', ats_provider: 'workable', ats_slug: 'mercari-india' },
        // Chennai & Pune Tech
        { id: 'comp-freshworks', name: 'Freshworks', website_url: 'https://freshworks.com', careers_url: 'https://careers.freshworks.com/', ats_provider: 'smartrecruiters', ats_slug: 'Freshworks' },
        { id: 'comp-mindtickle', name: 'Mindtickle', website_url: 'https://mindtickle.com', careers_url: 'https://jobs.lever.co/mindtickle', ats_provider: 'lever', ats_slug: 'mindtickle' },
        { id: 'comp-druva', name: 'Druva', website_url: 'https://druva.com', careers_url: 'https://boards.greenhouse.io/druva', ats_provider: 'greenhouse', ats_slug: 'druva' },
        // India-Eligible & Remote
        { id: 'comp-tibber', name: 'Tibber', website_url: 'https://tibber.com', careers_url: 'https://jobs.tibber.com/', ats_provider: 'teamtailor', ats_slug: 'tibber' },
        { id: 'comp-sentry', name: 'Sentry', website_url: 'https://sentry.io', careers_url: 'https://jobs.ashbyhq.com/sentry', ats_provider: 'ashby', ats_slug: 'sentry' },
      ];

      const now = new Date().toISOString();
      const insertOrUpdateStmt = db.prepare(`
        INSERT INTO company_sources (id, name, website_url, careers_url, ats_provider, ats_slug, status, crawl_frequency_hours, jobs_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', 6, 0, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          website_url = excluded.website_url,
          careers_url = excluded.careers_url,
          ats_provider = excluded.ats_provider,
          ats_slug = excluded.ats_slug,
          status = 'active',
          updated_at = excluded.updated_at
      `);

      for (const comp of EXPANDED_COMPANIES) {
        insertOrUpdateStmt.run(comp.id, comp.name, comp.website_url, comp.careers_url, comp.ats_provider, comp.ats_slug, now, now);
      }
    },
  },
  {
    version: 6,
    name: '006_data_integrity_and_mutually_exclusive_experience',
    up: (db: DatabaseSync) => {
      const now = new Date().toISOString();
      const insertCompanyStmt = db.prepare(`
        INSERT INTO company_sources (id, name, website_url, careers_url, ats_provider, ats_slug, status, crawl_frequency_hours, jobs_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', 6, 0, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          website_url = excluded.website_url,
          careers_url = excluded.careers_url,
          ats_provider = excluded.ats_provider,
          ats_slug = excluded.ats_slug,
          status = 'active',
          updated_at = excluded.updated_at
      `);
      insertCompanyStmt.run('comp-razorpay-live', 'Razorpay', 'https://razorpay.com', 'https://boards.greenhouse.io/razorpaysoftwareprivatelimited', 'greenhouse', 'razorpaysoftwareprivatelimited', now, now);
      insertCompanyStmt.run('comp-razorpay', 'Razorpay', 'https://razorpay.com', 'https://razorpay.com/jobs/', 'greenhouse', 'razorpay', now, now);

      // Backfill and synchronize all existing job records to mutually exclusive experience & strict location
      const rows = db.prepare('SELECT id, title, company, location, work_arrangement, country, description, experience_level, min_exp_years, max_exp_years FROM jobs').all() as any[];

      const updateJobStmt = db.prepare(`
        UPDATE jobs
        SET experience_level = ?,
            min_exp_years = ?,
            max_exp_years = ?,
            fresher_status = ?,
            location_category = ?
        WHERE id = ?
      `);

      for (const row of rows) {
        const norm = normalizeExperienceLevel(row.experience_level, row.min_exp_years, row.title, row.description);
        const locNorm = classifyLocation(row.location, row.description);

        updateJobStmt.run(
          norm.level,
          norm.minYears ?? null,
          norm.maxYears ?? null,
          norm.fresherStatus,
          locNorm.category,
          row.id
        );
      }
    },
  },
  {
    version: 7,
    name: '007_user_preferences_and_application_resume_link',
    up: (db: DatabaseSync) => {
      try { db.exec("ALTER TABLE candidate_profile ADD COLUMN max_expected_salary REAL;"); } catch {}
      try { db.exec("ALTER TABLE candidate_profile ADD COLUMN min_experience_years REAL DEFAULT 0;"); } catch {}
      try { db.exec("ALTER TABLE candidate_profile ADD COLUMN max_experience_years REAL DEFAULT 2;"); } catch {}
      try { db.exec("ALTER TABLE candidate_profile ADD COLUMN preferred_industries TEXT DEFAULT '[]';"); } catch {}
      try { db.exec("ALTER TABLE applications ADD COLUMN resume_version_id TEXT;"); } catch {}
      try { db.exec("ALTER TABLE applications ADD COLUMN cover_letter_text TEXT;"); } catch {}
    },
  },
  {
    version: 8,
    name: '008_daily_discovery_scheduler_and_temporal_job_tracking',
    up: (db: DatabaseSync) => {
      // 1. Extend jobs table with temporal discovery, status and source tracking
      try { db.exec("ALTER TABLE jobs ADD COLUMN posted_at TEXT;"); } catch {}
      try { db.exec("ALTER TABLE jobs ADD COLUMN first_seen_at TEXT;"); } catch {}
      try { db.exec("ALTER TABLE jobs ADD COLUMN last_seen_at TEXT;"); } catch {}
      try { db.exec("ALTER TABLE jobs ADD COLUMN closed_at TEXT;"); } catch {}
      try { db.exec("ALTER TABLE jobs ADD COLUMN source_id TEXT;"); } catch {}
      try { db.exec("ALTER TABLE jobs ADD COLUMN external_job_id TEXT;"); } catch {}
      try { db.exec("ALTER TABLE jobs ADD COLUMN job_status TEXT DEFAULT 'Open';"); } catch {}
      try { db.exec("ALTER TABLE jobs ADD COLUMN is_updated INTEGER DEFAULT 0;"); } catch {}

      // Indices for high-performance daily filtering and status checks
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_jobs_first_seen_at ON jobs(first_seen_at);
        CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at);
        CREATE INDEX IF NOT EXISTS idx_jobs_job_status ON jobs(job_status);
        CREATE INDEX IF NOT EXISTS idx_jobs_source_id ON jobs(source_id);
        CREATE INDEX IF NOT EXISTS idx_jobs_external_job_id ON jobs(external_job_id);
      `);

      // 2. Backfill existing jobs in SQLite
      db.exec(`
        UPDATE jobs
        SET posted_at = CASE WHEN date_posted IS NOT NULL AND date_posted != '' THEN date_posted ELSE NULL END,
            first_seen_at = COALESCE(created_at, datetime('now')),
            last_seen_at = COALESCE(last_checked, created_at, datetime('now')),
            external_job_id = CASE WHEN source_job_id IS NOT NULL AND source_job_id != '' THEN source_job_id ELSE NULL END,
            job_status = CASE WHEN freshness_status = 'Closed' THEN 'Closed' WHEN freshness_status = 'Expired' THEN 'Expired' ELSE 'Open' END,
            is_updated = 0
        WHERE first_seen_at IS NULL;

        UPDATE jobs
        SET source_id = (
          SELECT company_sources.id FROM company_sources
          WHERE LOWER(company_sources.name) = LOWER(jobs.company)
          LIMIT 1
        )
        WHERE source_id IS NULL;
      `);

      // 3. Scheduler State Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS scheduler_state (
          id TEXT PRIMARY KEY DEFAULT 'global_scheduler',
          enabled INTEGER NOT NULL DEFAULT 1,
          schedule_time_ist TEXT NOT NULL DEFAULT '07:00',
          interval_hours INTEGER NOT NULL DEFAULT 24,
          last_run_at TEXT,
          last_successful_run_at TEXT,
          next_run_at TEXT,
          execution_status TEXT NOT NULL DEFAULT 'idle',
          last_error TEXT,
          catch_up_enabled INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL
        );
      `);

      const now = new Date().toISOString();
      const initialNextRun = computeNextRunAtIst('07:00', 24);
      db.prepare(`
        INSERT OR IGNORE INTO scheduler_state (
          id, enabled, schedule_time_ist, interval_hours, next_run_at, execution_status, catch_up_enabled, updated_at
        ) VALUES ('global_scheduler', 1, '07:00', 24, ?, 'idle', 1, ?)
      `).run(initialNextRun, now);

      // 4. Extend company_sources with crawl metrics and enabled status
      try { db.exec("ALTER TABLE company_sources ADD COLUMN http_status INTEGER DEFAULT 200;"); } catch {}
      try { db.exec("ALTER TABLE company_sources ADD COLUMN pages_fetched INTEGER DEFAULT 1;"); } catch {}
      try { db.exec("ALTER TABLE company_sources ADD COLUMN raw_jobs_count INTEGER DEFAULT 0;"); } catch {}
      try { db.exec("ALTER TABLE company_sources ADD COLUMN new_jobs_count INTEGER DEFAULT 0;"); } catch {}
      try { db.exec("ALTER TABLE company_sources ADD COLUMN updated_jobs_count INTEGER DEFAULT 0;"); } catch {}
      try { db.exec("ALTER TABLE company_sources ADD COLUMN duplicates_count INTEGER DEFAULT 0;"); } catch {}
      try { db.exec("ALTER TABLE company_sources ADD COLUMN closed_jobs_count INTEGER DEFAULT 0;"); } catch {}
      try { db.exec("ALTER TABLE company_sources ADD COLUMN execution_duration_ms INTEGER DEFAULT 0;"); } catch {}
      try { db.exec("ALTER TABLE company_sources ADD COLUMN is_enabled INTEGER DEFAULT 1;"); } catch {}
    },
  },
];

function runMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: number }>;
  const appliedSet = new Set(appliedRows.map((r) => r.version));

  for (const migration of MIGRATIONS) {
    if (!appliedSet.has(migration.version)) {
      db.exec('BEGIN TRANSACTION;');
      try {
        migration.up(db);
        const recordStmt = db.prepare(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
        );
        recordStmt.run(migration.version, migration.name, new Date().toISOString());
        db.exec('COMMIT;');
      } catch (err) {
        db.exec('ROLLBACK;');
        throw new Error(`Migration ${migration.version} (${migration.name}) failed: ${(err as Error).message}`);
      }
    }
  }
}

export function initDatabase(customPath?: string): DatabaseSync {
  if (dbInstance) {
    // If same path, return existing instance
    const targetPath = customPath ? path.resolve(process.cwd(), customPath) : getDatabasePath();
    if (currentDbPath === targetPath) {
      return dbInstance;
    }
    closeDatabase();
  }

  const targetPath = customPath ? path.resolve(process.cwd(), customPath) : getDatabasePath();
  const dbDir = path.dirname(targetPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new DatabaseSync(targetPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  runMigrations(db);

  dbInstance = db;
  currentDbPath = targetPath;

  // Ensure default candidate record exists for foreign key references
  candidateRepository.saveInitialEmptyProfile();

  return dbInstance;
}

// ---------------- REPOSITORIES ----------------

// 1. CANDIDATE REPOSITORY
export const candidateRepository = {
  getProfile(): CandidateProfile {
    const db = getDatabase();
    const row: any = db.prepare('SELECT * FROM candidate_profile WHERE id = ?').get('candidate-default');

    if (!row) {
      // Initialize authentic empty candidate profile in DB
      this.saveInitialEmptyProfile();
      return { ...emptyCandidateProfile };
    }

    // Fetch resume versions
    const resumeRows: any[] = db
      .prepare('SELECT * FROM resume_versions WHERE candidate_id = ? ORDER BY uploaded_at DESC')
      .all('candidate-default');

    const resumeVersions: ResumeVersion[] = resumeRows.map((r) => ({
      id: r.id,
      fileName: r.file_name,
      uploadedAt: r.uploaded_at,
      fileSizeBytes: Number(r.file_size_bytes || 0),
      extractedTextLength: Number(r.extracted_text_length || 0),
      versionName: r.version_name,
      isActive: intToBool(r.is_active),
    }));

    return {
      id: row.id,
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      location: row.location || '',
      headline: row.headline || '',
      summary: row.summary || '',
      skills: fromJson<string[]>(row.skills, []),
      skillCategories: fromJson(row.skill_categories, emptyCandidateProfile.skillCategories),
      experience: fromJson(row.experience, []),
      education: fromJson(row.education, []),
      projects: fromJson(row.projects, []),
      certifications: fromJson(row.certifications, []),
      preferredRoles: fromJson(row.preferred_roles, []),
      preferredLocations: fromJson(row.preferred_locations, []),
      preferredArrangements: fromJson(row.preferred_arrangements, []),
      preferredTypes: fromJson(row.preferred_types, []),
      preferredIndustries: fromJson<string[]>(row.preferred_industries, []),
      minExperienceYears: row.min_experience_years != null ? Number(row.min_experience_years) : 0,
      maxExperienceYears: row.max_experience_years != null ? Number(row.max_experience_years) : 2,
      minExpectedSalary: row.min_expected_salary != null ? Number(row.min_expected_salary) : undefined,
      maxExpectedSalary: row.max_expected_salary != null ? Number(row.max_expected_salary) : undefined,
      workAuthorization: row.work_authorization || '',
      rawResumeText: row.raw_resume_text || '',
      resumeVersions,
      activeResumeId: row.active_resume_id || '',
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  },

  saveInitialEmptyProfile(): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO candidate_profile (
        id, name, email, phone, location, headline, summary,
        skills, skill_categories, experience, education, projects,
        certifications, preferred_roles, preferred_locations,
        preferred_arrangements, preferred_types, min_expected_salary,
        max_expected_salary, min_experience_years, max_experience_years,
        preferred_industries,
        work_authorization, raw_resume_text, active_resume_id, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?,
        ?, ?, ?, ?
      )
    `);

    stmt.run(
      'candidate-default',
      '',
      '',
      '',
      '',
      '',
      '',
      '[]',
      toJson(emptyCandidateProfile.skillCategories),
      '[]',
      '[]',
      '[]',
      '[]',
      '[]',
      '[]',
      '[]',
      '[]',
      null,
      null,
      0,
      2,
      '[]',
      '',
      '',
      '',
      new Date().toISOString()
    );
  },

  updateProfile(updates: Partial<CandidateProfile>): CandidateProfile {
    const current = this.getProfile();
    const updated: CandidateProfile = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO candidate_profile (
        id, name, email, phone, location, headline, summary,
        skills, skill_categories, experience, education, projects,
        certifications, preferred_roles, preferred_locations,
        preferred_arrangements, preferred_types, min_expected_salary,
        max_expected_salary, min_experience_years, max_experience_years,
        preferred_industries,
        work_authorization, raw_resume_text, active_resume_id, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?,
        ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        phone = excluded.phone,
        location = excluded.location,
        headline = excluded.headline,
        summary = excluded.summary,
        skills = excluded.skills,
        skill_categories = excluded.skill_categories,
        experience = excluded.experience,
        education = excluded.education,
        projects = excluded.projects,
        certifications = excluded.certifications,
        preferred_roles = excluded.preferred_roles,
        preferred_locations = excluded.preferred_locations,
        preferred_arrangements = excluded.preferred_arrangements,
        preferred_types = excluded.preferred_types,
        min_expected_salary = excluded.min_expected_salary,
        max_expected_salary = excluded.max_expected_salary,
        min_experience_years = excluded.min_experience_years,
        max_experience_years = excluded.max_experience_years,
        preferred_industries = excluded.preferred_industries,
        work_authorization = excluded.work_authorization,
        raw_resume_text = excluded.raw_resume_text,
        active_resume_id = excluded.active_resume_id,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      updated.id || 'candidate-default',
      updated.name,
      updated.email,
      updated.phone,
      updated.location,
      updated.headline,
      updated.summary,
      toJson(updated.skills, '[]'),
      toJson(updated.skillCategories, '{}'),
      toJson(updated.experience, '[]'),
      toJson(updated.education, '[]'),
      toJson(updated.projects, '[]'),
      toJson(updated.certifications, '[]'),
      toJson(updated.preferredRoles, '[]'),
      toJson(updated.preferredLocations, '[]'),
      toJson(updated.preferredArrangements, '[]'),
      toJson(updated.preferredTypes, '[]'),
      updated.minExpectedSalary !== undefined ? updated.minExpectedSalary : null,
      updated.maxExpectedSalary !== undefined ? updated.maxExpectedSalary : null,
      updated.minExperienceYears !== undefined ? updated.minExperienceYears : 0,
      updated.maxExperienceYears !== undefined ? updated.maxExperienceYears : 2,
      toJson(updated.preferredIndustries, '[]'),
      updated.workAuthorization,
      updated.rawResumeText,
      updated.activeResumeId,
      updated.updatedAt
    );

    activityLogsRepository.log(
      'profile_updated',
      'candidate',
      updated.id,
      `Candidate profile updated for ${updated.name || 'Candidate'}`
    );

    return this.getProfile();
  },

  addResumeVersion(version: ResumeVersion, rawText: string): void {
    this.saveInitialEmptyProfile();
    const db = getDatabase();
    transaction(() => {
      // Deactivate prior versions if this is active
      if (version.isActive) {
        db.prepare('UPDATE resume_versions SET is_active = 0 WHERE candidate_id = ?').run('candidate-default');
      }

      const stmt = db.prepare(`
        INSERT INTO resume_versions (
          id, candidate_id, file_name, version_name, file_size_bytes,
          extracted_text_length, raw_text, is_active, uploaded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        version.id,
        'candidate-default',
        version.fileName,
        version.versionName,
        version.fileSizeBytes,
        version.extractedTextLength,
        rawText,
        boolToInt(version.isActive),
        version.uploadedAt
      );

      // Update candidate_profile active_resume_id and raw_resume_text
      db.prepare(`
        UPDATE candidate_profile
        SET active_resume_id = ?, raw_resume_text = ?, updated_at = ?
        WHERE id = ?
      `).run(version.id, rawText, new Date().toISOString(), 'candidate-default');
    });

    activityLogsRepository.log(
      'resume_uploaded',
      'candidate',
      version.id,
      `New resume version uploaded: "${version.fileName}" (${version.versionName})`
    );
  },
};

// 2. JOBS REPOSITORY
function mapJobFromRow(row: any): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    companyLogo: row.company_logo || undefined,
    companyWebsite: row.company_website || undefined,
    location: row.location,
    country: row.country || 'India',
    workArrangement: row.work_arrangement as any,
    employmentType: row.employment_type as any,
    experienceLevel: row.experience_level as any,
    minExpYears: row.min_exp_years != null ? Number(row.min_exp_years) : undefined,
    maxExpYears: row.max_exp_years != null ? Number(row.max_exp_years) : undefined,
    salary: fromJson(row.salary, undefined),
    description: row.description,
    responsibilities: fromJson(row.responsibilities, []),
    requiredSkills: fromJson(row.required_skills, []),
    preferredSkills: fromJson(row.preferred_skills, []),
    source: row.source as any,
    sourceType: row.source_type || undefined,
    sourceJobId: row.source_job_id || '',
    originalUrl: row.original_url || '',
    canonicalUrl: row.canonical_url || '',
    applicationUrl: row.application_url || row.original_url || '',
    datePosted: row.date_posted,
    lastChecked: row.last_checked,
    postedAt: row.posted_at || (row.date_posted && row.date_posted.trim() !== '' ? row.date_posted : undefined),
    firstSeenAt: row.first_seen_at || row.created_at || undefined,
    lastSeenAt: row.last_seen_at || row.last_checked || undefined,
    closedAt: row.closed_at || undefined,
    sourceId: row.source_id || undefined,
    externalJobId: row.external_job_id || row.source_job_id || undefined,
    jobStatus: (row.job_status as any) || (row.freshness_status === 'Closed' ? 'Closed' : 'Open'),
    isUpdated: intToBool(row.is_updated),
    isStartup: intToBool(row.is_startup),
    startupInfo: fromJson(row.startup_info, undefined),
    verificationReport: fromJson(row.verification_report, {
      status: 'Needs Review',
      confidence: 50,
      lastChecked: new Date().toISOString(),
      summary: 'Pending verification',
      checks: [],
      evidence: [],
      warnings: [],
    }),
    matchResult: fromJson(row.match_result, undefined),
    isSaved: intToBool(row.is_saved),
    isDismissed: intToBool(row.is_dismissed),
    isDuplicate: intToBool(row.is_duplicate),
    duplicateOfId: row.duplicate_of_id || undefined,
    freshnessStatus: (row.freshness_status as any) || 'Active',
    fresherStatus: (row.fresher_status as any) || undefined,
    locationCategory: (row.location_category as any) || undefined,
    targetRoleCategory: row.target_role_category || undefined,
    expiryDate: row.expiry_date || undefined,
    lastVerifiedAt: row.last_verified_at || row.last_checked || undefined,
  };
}

export const jobsRepository = {
  getAllJobs(): Job[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM jobs ORDER BY date_posted DESC').all() as any[];
    return rows.map(mapJobFromRow);
  },

  getJobById(id: string): Job | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as any;
    if (!row) return null;
    return mapJobFromRow(row);
  },

  saveJob(job: Job): Job {
    const db = getDatabase();
    const now = new Date().toISOString();
    const postedAt = job.postedAt || (job.datePosted && job.datePosted.trim() !== '' ? job.datePosted : null);
    const firstSeenAt = job.firstSeenAt || now;
    const lastSeenAt = job.lastSeenAt || now;
    const jobStatus = job.jobStatus || 'Open';
    const isUpdated = job.isUpdated ? 1 : 0;

    const stmt = db.prepare(`
      INSERT INTO jobs (
        id, title, company, company_logo, company_website, location, country, work_arrangement,
        employment_type, experience_level, min_exp_years, max_exp_years,
        salary, description, responsibilities, required_skills, preferred_skills,
        source, source_type, source_job_id, original_url, canonical_url, application_url, date_posted,
        last_checked, is_startup, startup_info, verification_report,
        match_result, is_saved, is_dismissed, is_duplicate, duplicate_of_id,
        freshness_status, fresher_status, location_category, target_role_category, expiry_date, last_verified_at,
        posted_at, first_seen_at, last_seen_at, closed_at, source_id, external_job_id, job_status, is_updated,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        company = excluded.company,
        company_logo = excluded.company_logo,
        company_website = excluded.company_website,
        location = excluded.location,
        country = excluded.country,
        work_arrangement = excluded.work_arrangement,
        employment_type = excluded.employment_type,
        experience_level = excluded.experience_level,
        min_exp_years = excluded.min_exp_years,
        max_exp_years = excluded.max_exp_years,
        salary = excluded.salary,
        description = excluded.description,
        responsibilities = excluded.responsibilities,
        required_skills = excluded.required_skills,
        preferred_skills = excluded.preferred_skills,
        source = excluded.source,
        source_type = excluded.source_type,
        source_job_id = excluded.source_job_id,
        original_url = excluded.original_url,
        canonical_url = excluded.canonical_url,
        application_url = excluded.application_url,
        date_posted = excluded.date_posted,
        last_checked = excluded.last_checked,
        is_startup = excluded.is_startup,
        startup_info = excluded.startup_info,
        verification_report = excluded.verification_report,
        match_result = excluded.match_result,
        freshness_status = excluded.freshness_status,
        fresher_status = excluded.fresher_status,
        location_category = excluded.location_category,
        target_role_category = excluded.target_role_category,
        expiry_date = excluded.expiry_date,
        last_verified_at = excluded.last_verified_at,
        posted_at = COALESCE(excluded.posted_at, jobs.posted_at),
        last_seen_at = excluded.last_seen_at,
        closed_at = excluded.closed_at,
        source_id = COALESCE(excluded.source_id, jobs.source_id),
        external_job_id = COALESCE(excluded.external_job_id, jobs.external_job_id),
        job_status = excluded.job_status,
        is_updated = CASE WHEN jobs.description != excluded.description OR jobs.title != excluded.title THEN 1 ELSE jobs.is_updated END,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      job.id,
      job.title,
      job.company,
      job.companyLogo || null,
      job.companyWebsite || null,
      job.location,
      job.country || 'India',
      job.workArrangement,
      job.employmentType,
      job.experienceLevel,
      job.minExpYears !== undefined ? job.minExpYears : null,
      job.maxExpYears !== undefined ? job.maxExpYears : null,
      toJson(job.salary, null),
      job.description,
      toJson(job.responsibilities, '[]'),
      toJson(job.requiredSkills, '[]'),
      toJson(job.preferredSkills, '[]'),
      job.source,
      job.sourceType || null,
      job.sourceJobId,
      job.originalUrl,
      job.canonicalUrl,
      job.applicationUrl || job.originalUrl || null,
      job.datePosted,
      job.lastChecked,
      boolToInt(job.isStartup),
      toJson(job.startupInfo, null),
      toJson(job.verificationReport, '{}'),
      toJson(job.matchResult, null),
      boolToInt(job.isSaved),
      boolToInt(job.isDismissed),
      boolToInt(job.isDuplicate),
      job.duplicateOfId || null,
      job.freshnessStatus || 'Active',
      job.fresherStatus || 'Unclear',
      job.locationCategory || 'India city',
      job.targetRoleCategory || null,
      job.expiryDate || null,
      job.lastVerifiedAt || job.lastChecked || now,
      postedAt,
      firstSeenAt,
      lastSeenAt,
      job.closedAt || null,
      job.sourceId || null,
      job.externalJobId || job.sourceJobId || null,
      jobStatus,
      isUpdated,
      now,
      now
    );

    return this.getJobById(job.id)!;
  },

  toggleSave(id: string): Job | null {
    const job = this.getJobById(id);
    if (!job) return null;

    const newSaved = !job.isSaved;
    const db = getDatabase();
    db.prepare('UPDATE jobs SET is_saved = ?, updated_at = ? WHERE id = ?').run(
      boolToInt(newSaved),
      new Date().toISOString(),
      id
    );

    activityLogsRepository.log(
      'job_saved_toggled',
      'job',
      id,
      `${newSaved ? 'Saved' : 'Unsaved'} opportunity: ${job.title} at ${job.company}`
    );

    return this.getJobById(id);
  },

  toggleDismiss(id: string): Job | null {
    const job = this.getJobById(id);
    if (!job) return null;

    const newDismissed = !job.isDismissed;
    const db = getDatabase();
    db.prepare('UPDATE jobs SET is_dismissed = ?, updated_at = ? WHERE id = ?').run(
      boolToInt(newDismissed),
      new Date().toISOString(),
      id
    );

    activityLogsRepository.log(
      'job_dismissed_toggled',
      'job',
      id,
      `${newDismissed ? 'Dismissed' : 'Restored'} listing: ${job.title} at ${job.company}`
    );

    return this.getJobById(id);
  },

  updateVerification(id: string, report: VerificationReport): Job | null {
    const db = getDatabase();
    db.prepare('UPDATE jobs SET verification_report = ?, updated_at = ? WHERE id = ?').run(
      toJson(report, '{}'),
      new Date().toISOString(),
      id
    );
    return this.getJobById(id);
  },

  updateMatch(id: string, match: MatchResult): Job | null {
    const db = getDatabase();
    db.prepare('UPDATE jobs SET match_result = ?, updated_at = ? WHERE id = ?').run(
      toJson(match, '{}'),
      new Date().toISOString(),
      id
    );
    return this.getJobById(id);
  },

  importJobs(incomingJobs: Job[]): { addedCount: number; duplicateCount: number; totalJobs: number } {
    const db = getDatabase();
    let addedCount = 0;
    let duplicateCount = 0;

    transaction(() => {
      // Load current normalized keys for fast deduplication
      const existingJobs = this.getAllJobs();
      const existingKeys = new Set(
        existingJobs.map(
          (j) => `${j.company.toLowerCase().replace(/[^a-z0-9]/g, '')}::${j.title.toLowerCase().replace(/[^a-z0-9]/g, '')}`
        )
      );

      for (const job of incomingJobs) {
        if (!job.title || !job.company) continue;

        const key = `${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}::${job.title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        if (existingKeys.has(key)) {
          duplicateCount++;
          continue;
        }

        existingKeys.add(key);
        this.saveJob(job);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      activityLogsRepository.log(
        'jobs_imported',
        'job',
        null,
        `Ingested batch of ${addedCount} jobs (${duplicateCount} duplicates filtered)`
      );
    }

    const totalJobs = (db.prepare('SELECT COUNT(*) as count FROM jobs').get() as any).count;
    return { addedCount, duplicateCount, totalJobs };
  },

  recalculateAllMatches(profile: CandidateProfile, matchFn: (p: CandidateProfile, j: Job) => MatchResult): void {
    const jobs = this.getAllJobs();
    const db = getDatabase();
    transaction(() => {
      const stmt = db.prepare('UPDATE jobs SET match_result = ?, updated_at = ? WHERE id = ?');
      const now = new Date().toISOString();
      for (const job of jobs) {
        if (job.isDismissed) continue;
        const newMatch = matchFn(profile, job);
        stmt.run(toJson(newMatch, '{}'), now, job.id);
      }
    });
  },

  updateFreshness(id: string, freshnessStatus: string): Job | null {
    const db = getDatabase();
    db.prepare('UPDATE jobs SET freshness_status = ?, updated_at = ? WHERE id = ?').run(
      freshnessStatus,
      new Date().toISOString(),
      id
    );
    return this.getJobById(id);
  },

  updateExistingJobSeen(id: string, updates?: { description?: string; title?: string; datePosted?: string }): Job | null {
    const db = getDatabase();
    const existing = this.getJobById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    let isUpdated = existing.isUpdated ? 1 : 0;
    if (updates && ((updates.description && updates.description !== existing.description) || (updates.title && updates.title !== existing.title))) {
      isUpdated = 1;
    }
    db.prepare(`
      UPDATE jobs
      SET last_seen_at = ?,
          last_checked = ?,
          job_status = 'Open',
          freshness_status = 'Active',
          closed_at = NULL,
          is_updated = ?,
          description = COALESCE(?, description),
          title = COALESCE(?, title),
          posted_at = COALESCE(?, posted_at),
          updated_at = ?
      WHERE id = ?
    `).run(
      now,
      now,
      isUpdated,
      updates?.description || null,
      updates?.title || null,
      updates?.datePosted || null,
      now,
      id
    );
    return this.getJobById(id);
  },

  updateJobStatus(id: string, status: 'Open' | 'Closed' | 'Expired' | 'Unverified'): Job | null {
    const db = getDatabase();
    const now = new Date().toISOString();
    const closedAt = status === 'Closed' ? now : null;
    db.prepare(`
      UPDATE jobs
      SET job_status = ?,
          freshness_status = CASE WHEN ? = 'Closed' THEN 'Closed' WHEN ? = 'Expired' THEN 'Expired' ELSE freshness_status END,
          closed_at = CASE WHEN ? = 'Closed' THEN ? ELSE closed_at END,
          updated_at = ?
      WHERE id = ?
    `).run(status, status, status, status, closedAt, now, id);
    return this.getJobById(id);
  },

  markMissingJobsClosedForCompany(companyId: string, companyName: string, activeKeys: Set<string>): { closedCount: number } {
    const db = getDatabase();
    const now = new Date().toISOString();
    const openJobs = db.prepare(`
      SELECT id, title, company, original_url, canonical_url, external_job_id, source_job_id
      FROM jobs
      WHERE (source_id = ? OR LOWER(company) = LOWER(?))
        AND job_status != 'Closed'
    `).all(companyId, companyName) as any[];

    let closedCount = 0;
    const closeStmt = db.prepare(`
      UPDATE jobs
      SET job_status = 'Closed',
          freshness_status = 'Closed',
          closed_at = ?,
          updated_at = ?
      WHERE id = ?
    `);

    for (const job of openJobs) {
      const extId = job.external_job_id || job.source_job_id || '';
      const url = job.original_url || job.canonical_url || '';
      const normKey = `${(job.company || '').toLowerCase().replace(/[^a-z0-9]/g, '')}::${(job.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      const isFound = (extId && activeKeys.has(extId)) ||
                      (url && activeKeys.has(url)) ||
                      activeKeys.has(normKey);

      if (!isFound) {
        closeStmt.run(now, now, job.id);
        closedCount++;
      }
    }

    if (closedCount > 0) {
      activityLogsRepository.log(
        'jobs_closed_detected',
        'source',
        companyId,
        `Marked ${closedCount} missing vacancy listing(s) as Closed for ${companyName}.`
      );
    }

    return { closedCount };
  },

  getDailyDiscoveries(
    timeframe: 'today' | '24h' | '7d' | '30d' = 'today',
    filters: {
      role?: string;
      experience?: string;
      location?: string;
      status?: string;
    } = {}
  ): {
    jobs: Job[];
    stats: {
      newlyDiscoveredToday: number;
      newlyPostedLast24h: number;
      newOpeningsLast7d: number;
      recentlyUpdated: number;
      fresherJobs: number;
      internships: number;
      remoteIndia: number;
      byRole: Record<string, number>;
      byLocation: Record<string, number>;
    };
  } {
    const allJobs = this.getAllJobs();

    let newlyDiscoveredToday = 0;
    let newlyPostedLast24h = 0;
    let newOpeningsLast7d = 0;
    let recentlyUpdated = 0;
    let fresherJobs = 0;
    let internships = 0;
    let remoteIndia = 0;
    const byRole: Record<string, number> = {};
    const byLocation: Record<string, number> = {};

    for (const j of allJobs) {
      if (isTodayIst(j.firstSeenAt)) newlyDiscoveredToday++;
      if (j.postedAt && isWithinHours(j.postedAt, 24)) newlyPostedLast24h++;
      if (isWithinDays(j.firstSeenAt, 7)) newOpeningsLast7d++;
      if (j.isUpdated || (j.lastSeenAt && j.firstSeenAt && j.lastSeenAt > j.firstSeenAt)) recentlyUpdated++;
      if (j.fresherStatus === 'Fresher') fresherJobs++;
      if (j.employmentType === 'Internship' || j.experienceLevel === 'Intern') internships++;
      if (j.workArrangement === 'Remote' || j.locationCategory === 'India remote') remoteIndia++;

      const roleCat = j.targetRoleCategory || 'Other Software Roles';
      byRole[roleCat] = (byRole[roleCat] || 0) + 1;

      const locKey = j.location.split(',')[0].trim();
      if (locKey) {
        byLocation[locKey] = (byLocation[locKey] || 0) + 1;
      }
    }

    let filtered = allJobs.filter((j) => {
      if (timeframe === 'today') {
        return isTodayIst(j.firstSeenAt) || (j.postedAt && isTodayIst(j.postedAt));
      } else if (timeframe === '24h') {
        return isWithinHours(j.firstSeenAt, 24) || (j.postedAt && isWithinHours(j.postedAt, 24));
      } else if (timeframe === '7d') {
        return isWithinDays(j.firstSeenAt, 7) || (j.postedAt && isWithinDays(j.postedAt, 7));
      } else if (timeframe === '30d') {
        return isWithinDays(j.firstSeenAt, 30) || (j.postedAt && isWithinDays(j.postedAt, 30));
      }
      return true;
    });

    // If today has no new discoveries yet, return open catalog jobs
    if (filtered.length === 0 && timeframe === 'today') {
      filtered = allJobs.filter((j) => j.jobStatus !== 'Closed').slice(0, 30);
    }

    if (filters.role && filters.role !== 'all') {
      const q = filters.role.toLowerCase();
      filtered = filtered.filter((j) =>
        j.title.toLowerCase().includes(q) ||
        (j.targetRoleCategory || '').toLowerCase().includes(q) ||
        j.requiredSkills.some((s) => s.toLowerCase().includes(q))
      );
    }

    if (filters.experience && filters.experience !== 'all') {
      if (filters.experience === 'fresher') {
        filtered = filtered.filter((j) => j.fresherStatus === 'Fresher');
      } else if (filters.experience === 'internship') {
        filtered = filtered.filter((j) => j.employmentType === 'Internship' || j.experienceLevel === 'Intern');
      } else if (filters.experience === 'experienced') {
        filtered = filtered.filter((j) => j.fresherStatus === 'Experienced');
      }
    }

    if (filters.location && filters.location !== 'all') {
      const locQ = filters.location.toLowerCase();
      if (locQ === 'remote_india') {
        filtered = filtered.filter((j) => j.workArrangement === 'Remote' || j.locationCategory === 'India remote');
      } else {
        filtered = filtered.filter((j) => j.location.toLowerCase().includes(locQ));
      }
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((j) => (j.jobStatus || 'Open') === filters.status);
    }

    return {
      jobs: filtered,
      stats: {
        newlyDiscoveredToday,
        newlyPostedLast24h,
        newOpeningsLast7d,
        recentlyUpdated,
        fresherJobs,
        internships,
        remoteIndia,
        byRole,
        byLocation,
      },
    };
  },
};

// 3. APPLICATIONS REPOSITORY
function mapApplicationFromRow(row: any): ApplicationRecord {
  return {
    id: row.id,
    jobId: row.job_id,
    jobTitle: row.job_title,
    company: row.company,
    companyLogo: row.company_logo || undefined,
    location: row.location,
    workArrangement: row.work_arrangement,
    originalUrl: row.original_url || '',
    source: row.source || '',
    status: row.status as ApplicationStatus,
    statusReason: row.status_reason || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    appliedAt: row.applied_at || undefined,
    submissionConfirmed: intToBool(row.submission_confirmed),
    submissionEvidence: fromJson(row.submission_evidence, undefined),
    recruiterContact: fromJson(row.recruiter_contact, undefined),
    nextFollowUpDate: row.next_follow_up_date || undefined,
    notes: row.notes || '',
    resumeVersionId: row.resume_version_id || undefined,
    coverLetterText: row.cover_letter_text || undefined,
    matchScoreAtApplication: row.match_score_at_application != null ? Number(row.match_score_at_application) : undefined,
    preparedMaterials: fromJson(row.prepared_materials, undefined),
    timeline: fromJson(row.timeline, []),
  };
}

export const applicationsRepository = {
  getAllApplications(): ApplicationRecord[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM applications ORDER BY updated_at DESC').all() as any[];
    return rows.map(mapApplicationFromRow);
  },

  getApplicationById(id: string): ApplicationRecord | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as any;
    if (!row) return null;
    return mapApplicationFromRow(row);
  },

  createApplication(payload: {
    jobId: string;
    status?: ApplicationStatus;
    notes?: string;
    resumeVersionId?: string;
    coverLetterText?: string;
    preparedMaterials?: PreparedMaterials;
  }): ApplicationRecord {
    const job = jobsRepository.getJobById(payload.jobId);
    if (!job) {
      throw new Error(`Job with id "${payload.jobId}" not found in database.`);
    }

    const now = new Date().toISOString();
    const newId = `app-${Date.now()}`;
    const initialStatus: ApplicationStatus = payload.status || 'Preparing';

    const initialTimeline: ApplicationTimelineEvent[] = [
      {
        id: `evt-${Date.now()}`,
        timestamp: now,
        status: initialStatus,
        note: 'Application initiated in JobPilot workspace.',
        source: 'candidate',
      },
    ];

    const appRecord: ApplicationRecord = {
      id: newId,
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      companyLogo: job.companyLogo,
      location: job.location,
      workArrangement: job.workArrangement,
      originalUrl: job.originalUrl,
      source: job.source,
      status: initialStatus,
      createdAt: now,
      updatedAt: now,
      submissionConfirmed: false,
      notes: payload.notes || '',
      resumeVersionId: payload.resumeVersionId,
      coverLetterText: payload.coverLetterText,
      matchScoreAtApplication: job.matchResult?.overallScore || 0,
      preparedMaterials: payload.preparedMaterials,
      timeline: initialTimeline,
    };

    const db = getDatabase();
    transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO applications (
          id, job_id, job_title, company, company_logo, location,
          work_arrangement, original_url, source, status, status_reason,
          submission_confirmed, submission_evidence, recruiter_contact,
          next_follow_up_date, notes, resume_version_id, cover_letter_text,
          match_score_at_application,
          prepared_materials, timeline, applied_at, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?,
          ?, ?, ?, ?, ?
        )
      `);

      stmt.run(
        appRecord.id,
        appRecord.jobId,
        appRecord.jobTitle,
        appRecord.company,
        appRecord.companyLogo || null,
        appRecord.location,
        appRecord.workArrangement,
        appRecord.originalUrl,
        appRecord.source,
        appRecord.status,
        null,
        boolToInt(appRecord.submissionConfirmed),
        null,
        null,
        null,
        appRecord.notes,
        appRecord.resumeVersionId || null,
        appRecord.coverLetterText || null,
        appRecord.matchScoreAtApplication || 0,
        toJson(appRecord.preparedMaterials, null),
        toJson(appRecord.timeline, '[]'),
        null,
        appRecord.createdAt,
        appRecord.updatedAt
      );

      // Create notification
      notificationsRepository.createNotification({
        id: `notif-${Date.now()}`,
        title: `Started Application: ${job.company}`,
        message: `Began preparing application package for ${job.title}.`,
        timestamp: now,
        type: 'application_update',
        isRead: false,
        relatedJobId: job.id,
        relatedApplicationId: newId,
      });

      activityLogsRepository.log(
        'application_created',
        'application',
        newId,
        `Started application for ${job.title} at ${job.company}`
      );
    });

    return this.getApplicationById(newId)!;
  },

  updateApplication(id: string, updates: Partial<ApplicationRecord>): ApplicationRecord {
    const existing = this.getApplicationById(id);
    if (!existing) {
      throw new Error(`Application with id "${id}" not found.`);
    }

    const now = new Date().toISOString();
    const updatedTimeline = [...existing.timeline];

    if (updates.status && updates.status !== existing.status) {
      updatedTimeline.push({
        id: `evt-${Date.now()}`,
        timestamp: now,
        status: updates.status,
        note: updates.statusReason || updates.notes || `Status transitioned to ${updates.status}`,
        source: 'candidate',
      });
    }

    const updated: ApplicationRecord = {
      ...existing,
      ...updates,
      timeline: updatedTimeline,
      updatedAt: now,
      appliedAt: updates.status === 'Applied' && !existing.appliedAt ? now : existing.appliedAt,
    };

    const db = getDatabase();
    transaction(() => {
      const stmt = db.prepare(`
        UPDATE applications SET
          status = ?,
          status_reason = ?,
          submission_confirmed = ?,
          submission_evidence = ?,
          recruiter_contact = ?,
          next_follow_up_date = ?,
          notes = ?,
          resume_version_id = ?,
          cover_letter_text = ?,
          prepared_materials = ?,
          timeline = ?,
          applied_at = ?,
          updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        updated.status,
        updated.statusReason || null,
        boolToInt(updated.submissionConfirmed),
        toJson(updated.submissionEvidence, null),
        toJson(updated.recruiterContact, null),
        updated.nextFollowUpDate || null,
        updated.notes,
        updated.resumeVersionId || null,
        updated.coverLetterText || null,
        toJson(updated.preparedMaterials, null),
        toJson(updated.timeline, '[]'),
        updated.appliedAt || null,
        updated.updatedAt,
        id
      );

      // Create milestone notification if status advanced
      if (updates.status && updates.status !== existing.status) {
        if (updates.status === 'Interview' || updates.status === 'Offer' || updates.status === 'Assessment') {
          notificationsRepository.createNotification({
            id: `notif-${Date.now()}`,
            title: `Application Milestone: ${existing.company}`,
            message: `Status updated to ${updates.status} for ${existing.jobTitle}.`,
            timestamp: now,
            type: updates.status === 'Interview' ? 'interview_reminder' : 'application_update',
            isRead: false,
            relatedJobId: existing.jobId,
            relatedApplicationId: existing.id,
          });
        }

        activityLogsRepository.log(
          'application_status_updated',
          'application',
          id,
          `Application at ${existing.company} updated to stage "${updates.status}"`
        );
      }
    });

    return this.getApplicationById(id)!;
  },
};

// 4. EMAILS REPOSITORY
function mapEmailFromRow(row: any): EmailMessageRecord {
  return {
    id: row.id,
    from: row.sender,
    subject: row.subject,
    receivedAt: row.received_at,
    snippet: row.snippet,
    fullBody: row.full_body,
    detectedType: row.detected_type as any,
    associatedApplicationId: row.associated_application_id || undefined,
    confidence: Number(row.confidence || 0),
    suggestedStatusChange: row.suggested_status_change || undefined,
    statusChangeApplied: intToBool(row.status_change_applied),
    requiresReview: intToBool(row.requires_review),
  };
}

export const emailsRepository = {
  getAllEmails(): EmailMessageRecord[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM emails ORDER BY received_at DESC').all() as any[];
    return rows.map(mapEmailFromRow);
  },

  getEmailById(id: string): EmailMessageRecord | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM emails WHERE id = ?').get(id) as any;
    if (!row) return null;
    return mapEmailFromRow(row);
  },

  createEmail(email: EmailMessageRecord): EmailMessageRecord {
    const db = getDatabase();
    const now = new Date().toISOString();

    transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO emails (
          id, sender, subject, received_at, snippet, full_body,
          detected_type, associated_application_id, confidence,
          suggested_status_change, status_change_applied,
          requires_review, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?
        )
      `);

      stmt.run(
        email.id,
        email.from,
        email.subject,
        email.receivedAt,
        email.snippet,
        email.fullBody,
        email.detectedType,
        email.associatedApplicationId || null,
        email.confidence,
        email.suggestedStatusChange || null,
        boolToInt(email.statusChangeApplied),
        boolToInt(email.requiresReview),
        now
      );

      // Notification
      if (email.detectedType === 'interview_invite' || email.detectedType === 'offer') {
        notificationsRepository.createNotification({
          id: `notif-${Date.now()}`,
          title: `Important Inbound Recruiter Message`,
          message: `${email.from}: ${email.subject} (${email.detectedType.replace('_', ' ')})`,
          timestamp: now,
          type: 'interview_reminder',
          isRead: false,
          relatedApplicationId: email.associatedApplicationId,
        });
      }

      activityLogsRepository.log(
        'email_logged',
        'email',
        email.id,
        `Logged recruiter email from ${email.from}: "${email.subject}"`
      );
    });

    return this.getEmailById(email.id)!;
  },

  applyStatus(emailId: string): { success: boolean; application: ApplicationRecord; email: EmailMessageRecord } {
    const email = this.getEmailById(emailId);
    if (!email) {
      throw new Error(`Email with id "${emailId}" not found.`);
    }

    if (!email.associatedApplicationId) {
      throw new Error(`No application associated with email "${emailId}".`);
    }

    if (!email.suggestedStatusChange) {
      throw new Error(`Email does not recommend a status change.`);
    }

    const updatedApp = transaction(() => {
      const app = applicationsRepository.updateApplication(email.associatedApplicationId!, {
        status: email.suggestedStatusChange,
        notes: `Auto-updated from recruiter message: "${email.subject}"`,
      });

      const db = getDatabase();
      db.prepare('UPDATE emails SET status_change_applied = 1 WHERE id = ?').run(emailId);

      return app;
    });

    return {
      success: true,
      application: updatedApp,
      email: this.getEmailById(emailId)!,
    };
  },
};

// 5. NOTIFICATIONS REPOSITORY
function mapNotificationFromRow(row: any): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    timestamp: row.timestamp,
    type: row.type as any,
    isRead: intToBool(row.is_read),
    relatedJobId: row.related_job_id || undefined,
    relatedApplicationId: row.related_application_id || undefined,
    actionUrl: row.action_url || undefined,
  };
}

export const notificationsRepository = {
  getAllNotifications(): NotificationItem[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM notifications ORDER BY timestamp DESC').all() as any[];
    return rows.map(mapNotificationFromRow);
  },

  createNotification(item: NotificationItem): NotificationItem {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO notifications (
        id, title, message, timestamp, type, is_read,
        related_job_id, related_application_id, action_url, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      item.id,
      item.title,
      item.message,
      item.timestamp,
      item.type,
      boolToInt(item.isRead),
      item.relatedJobId || null,
      item.relatedApplicationId || null,
      item.actionUrl || null,
      now
    );

    return item;
  },

  markAsRead(id: string): boolean {
    const db = getDatabase();
    const res = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
    return (res.changes || 0) > 0;
  },
};

// 6. CONNECTORS REPOSITORY
function mapConnectorFromRow(row: any): SourceConnector {
  return {
    id: row.id,
    name: row.name as any,
    displayName: row.display_name,
    description: row.description,
    status: row.status as any,
    accessMethod: row.access_method as any,
    requiresAuth: intToBool(row.requires_auth),
    termsCompliant: intToBool(row.terms_compliant),
    rateLimitInfo: row.rate_limit_info || '',
    lastSyncTimestamp: row.last_sync_timestamp || undefined,
    activeJobsCount: Number(row.active_jobs_count || 0),
    setupInstructions: row.setup_instructions || '',
  };
}

export const connectorsRepository = {
  getAllConnectors(): SourceConnector[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM connectors ORDER BY display_name ASC').all() as any[];
    return rows.map(mapConnectorFromRow);
  },

  saveConnector(conn: SourceConnector): SourceConnector {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO connectors (
        id, name, display_name, description, status, access_method,
        requires_auth, terms_compliant, rate_limit_info,
        last_sync_timestamp, active_jobs_count, setup_instructions,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        display_name = excluded.display_name,
        description = excluded.description,
        status = excluded.status,
        access_method = excluded.access_method,
        requires_auth = excluded.requires_auth,
        terms_compliant = excluded.terms_compliant,
        rate_limit_info = excluded.rate_limit_info,
        last_sync_timestamp = excluded.last_sync_timestamp,
        active_jobs_count = excluded.active_jobs_count,
        setup_instructions = excluded.setup_instructions,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      conn.id,
      conn.name,
      conn.displayName,
      conn.description,
      conn.status,
      conn.accessMethod,
      boolToInt(conn.requiresAuth),
      boolToInt(conn.termsCompliant),
      conn.rateLimitInfo,
      conn.lastSyncTimestamp || null,
      conn.activeJobsCount,
      conn.setupInstructions,
      now,
      now
    );

    return conn;
  },
};

// 7. ACTIVITY LOGS REPOSITORY
export const activityLogsRepository = {
  log(actionType: string, entityType: string, entityId: string | null, summary: string, details?: any): void {
    try {
      const db = getDatabase();
      const id = `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const now = new Date().toISOString();
      const stmt = db.prepare(`
        INSERT INTO activity_logs (id, action_type, entity_type, entity_id, summary, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, actionType, entityType, entityId, summary, toJson(details, null), now);
    } catch (err) {
      console.error('Failed to write activity log:', err);
    }
  },

  getRecent(limit: number = 20): any[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?').all(limit);
  },
};

// 8. EXPORT REPOSITORY
export const exportRepository = {
  getBackupPayload(): {
    candidate: CandidateProfile;
    candidateProfile: CandidateProfile;
    jobs: Job[];
    applications: ApplicationRecord[];
    emails: EmailMessageRecord[];
    notifications: NotificationItem[];
    connectors: SourceConnector[];
    activityLogs: any[];
    ingestionRuns: IngestionRunRecord[];
    exportedAt: string;
  } {
    const cand = candidateRepository.getProfile();
    return {
      candidate: cand,
      candidateProfile: cand,
      jobs: jobsRepository.getAllJobs(),
      applications: applicationsRepository.getAllApplications(),
      emails: emailsRepository.getAllEmails(),
      notifications: notificationsRepository.getAllNotifications(),
      connectors: connectorsRepository.getAllConnectors(),
      activityLogs: activityLogsRepository.getRecent(100),
      ingestionRuns: ingestionRunsRepository.getRecentRuns(100),
      exportedAt: new Date().toISOString(),
    };
  },
};

// 9. INGESTION RUNS REPOSITORY
export const ingestionRunsRepository = {
  createRun(run: IngestionRunRecord): IngestionRunRecord {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO ingestion_runs (
        id, trigger_type, status, started_at, completed_at,
        sources_checked, jobs_found, jobs_added, duplicates_filtered,
        errors, details, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      run.id,
      run.triggerType,
      run.status,
      run.startedAt,
      run.completedAt || null,
      toJson(run.sourcesChecked, '[]'),
      run.jobsFound,
      run.jobsAdded,
      run.duplicatesFiltered,
      toJson(run.errors, '[]'),
      toJson(run.details, null),
      run.createdAt
    );
    return run;
  },

  updateRun(id: string, updates: Partial<IngestionRunRecord>): IngestionRunRecord | null {
    const db = getDatabase();
    const current = this.getRunById(id);
    if (!current) return null;

    const merged = { ...current, ...updates };
    const stmt = db.prepare(`
      UPDATE ingestion_runs
      SET status = ?, completed_at = ?, sources_checked = ?,
          jobs_found = ?, jobs_added = ?, duplicates_filtered = ?,
          errors = ?, details = ?
      WHERE id = ?
    `);
    stmt.run(
      merged.status,
      merged.completedAt || null,
      toJson(merged.sourcesChecked, '[]'),
      merged.jobsFound,
      merged.jobsAdded,
      merged.duplicatesFiltered,
      toJson(merged.errors, '[]'),
      toJson(merged.details, null),
      id
    );
    return this.getRunById(id);
  },

  getRunById(id: string): IngestionRunRecord | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM ingestion_runs WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      triggerType: row.trigger_type,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at || undefined,
      sourcesChecked: fromJson(row.sources_checked, []),
      jobsFound: Number(row.jobs_found || 0),
      jobsAdded: Number(row.jobs_added || 0),
      duplicatesFiltered: Number(row.duplicates_filtered || 0),
      errors: fromJson(row.errors, []),
      details: fromJson(row.details, undefined),
      createdAt: row.created_at,
    };
  },

  getRecentRuns(limit: number = 20): IngestionRunRecord[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM ingestion_runs ORDER BY started_at DESC LIMIT ?').all(limit) as any[];
    return rows.map((row) => ({
      id: row.id,
      triggerType: row.trigger_type,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at || undefined,
      sourcesChecked: fromJson(row.sources_checked, []),
      jobsFound: Number(row.jobs_found || 0),
      jobsAdded: Number(row.jobs_added || 0),
      duplicatesFiltered: Number(row.duplicates_filtered || 0),
      errors: fromJson(row.errors, []),
      details: fromJson(row.details, undefined),
      createdAt: row.created_at,
    }));
  },

  countRuns(): number {
    const db = getDatabase();
    const row = db.prepare('SELECT COUNT(*) as count FROM ingestion_runs').get() as any;
    return row ? Number(row.count) : 0;
  },
};

// 10. JOB SOURCES REPOSITORY
export const jobSourcesRepository = {
  addSourceReference(ref: JobSourceReference): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO job_sources (id, job_id, source_name, source_job_id, source_url, discovered_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      ref.id || `jsrc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ref.jobId,
      ref.sourceName,
      ref.sourceJobId || null,
      ref.sourceUrl,
      ref.discoveredAt || new Date().toISOString(),
      toJson(ref.rawMetadata, null)
    );
  },

  getSourcesForJob(jobId: string): JobSourceReference[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM job_sources WHERE job_id = ? ORDER BY discovered_at DESC').all(jobId) as any[];
    return rows.map((row) => ({
      id: row.id,
      jobId: row.job_id,
      sourceName: row.source_name as any,
      sourceJobId: row.source_job_id || undefined,
      sourceUrl: row.source_url,
      discoveredAt: row.discovered_at,
      rawMetadata: fromJson(row.metadata, undefined),
    }));
  },

  findExistingJobByExternalId(sourceName: string, sourceJobId: string): string | null {
    if (!sourceJobId) return null;
    const db = getDatabase();
    const row = db.prepare('SELECT job_id FROM job_sources WHERE source_name = ? AND source_job_id = ? LIMIT 1').get(sourceName, sourceJobId) as any;
    return row ? row.job_id : null;
  },
};

// 11. API USAGE REPOSITORY
export const apiUsageRepository = {
  getCurrentMonthKey(): string {
    const d = new Date();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${d.getUTCFullYear()}-${month}`;
  },

  getUsage(provider: string, defaultQuota: number = 200): ProviderUsageInfo {
    const db = getDatabase();
    const currentMonth = this.getCurrentMonthKey();
    const row = db.prepare('SELECT * FROM api_usage WHERE provider = ?').get(provider) as any;

    if (!row) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO api_usage (provider, monthly_quota, current_month, requests_used, last_request_at, created_at, updated_at)
        VALUES (?, ?, ?, 0, NULL, ?, ?)
      `).run(provider, defaultQuota, currentMonth, now, now);

      return {
        provider,
        monthlyQuota: defaultQuota,
        requestsUsed: 0,
        requestsRemaining: defaultQuota,
        currentMonth,
        cachedQueriesCount: queryCacheRepository.countCached(provider),
      };
    }

    // Reset if month has rolled over
    if (row.current_month !== currentMonth) {
      db.prepare(`
        UPDATE api_usage
        SET current_month = ?, requests_used = 0, updated_at = ?
        WHERE provider = ?
      `).run(currentMonth, new Date().toISOString(), provider);

      return {
        provider,
        monthlyQuota: row.monthly_quota,
        requestsUsed: 0,
        requestsRemaining: row.monthly_quota,
        currentMonth,
        lastRequestAt: row.last_request_at || undefined,
        cachedQueriesCount: queryCacheRepository.countCached(provider),
      };
    }

    const quota = Number(row.monthly_quota || defaultQuota);
    const used = Number(row.requests_used || 0);

    return {
      provider,
      monthlyQuota: quota,
      requestsUsed: used,
      requestsRemaining: Math.max(0, quota - used),
      currentMonth: row.current_month,
      lastRequestAt: row.last_request_at || undefined,
      cachedQueriesCount: queryCacheRepository.countCached(provider),
    };
  },

  getAllUsage(): ProviderUsageInfo[] {
    const providers = ['jsearch', 'adzuna', 'career-pages'];
    return providers.map((p) => this.getUsage(p));
  },

  canMakeRequest(provider: string, defaultQuota: number = 200): boolean {
    const usage = this.getUsage(provider, defaultQuota);
    return usage.requestsUsed < usage.monthlyQuota;
  },

  recordRequest(provider: string, defaultQuota: number = 200): ProviderUsageInfo {
    const db = getDatabase();
    this.getUsage(provider, defaultQuota); // ensures row exists and current month is checked
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE api_usage
      SET requests_used = requests_used + 1, last_request_at = ?, updated_at = ?
      WHERE provider = ?
    `).run(now, now, provider);

    return this.getUsage(provider, defaultQuota);
  },

  setQuota(provider: string, quota: number): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE api_usage
      SET monthly_quota = ?, updated_at = ?
      WHERE provider = ?
    `).run(quota, now, provider);
  },
};

// 12. QUERY CACHE REPOSITORY
export const queryCacheRepository = {
  createKey(provider: string, queryParams: any): string {
    const str = typeof queryParams === 'string' ? queryParams : JSON.stringify(queryParams);
    return `${provider}:${str.toLowerCase().replace(/\s+/g, '')}`;
  },

  get<T>(provider: string, queryParams: any): T | null {
    const db = getDatabase();
    const key = this.createKey(provider, queryParams);
    const now = new Date().toISOString();
    const row = db.prepare('SELECT response_json FROM query_cache WHERE cache_key = ? AND expires_at > ?').get(key, now) as any;
    if (!row) return null;
    return fromJson<T>(row.response_json, null as any);
  },

  set(provider: string, queryParams: any, data: any, ttlSeconds: number = 86400): void {
    const db = getDatabase();
    const key = this.createKey(provider, queryParams);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
    const createdAt = now.toISOString();

    db.prepare(`
      INSERT INTO query_cache (cache_key, provider, query_params, response_json, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        response_json = excluded.response_json,
        expires_at = excluded.expires_at
    `).run(key, provider, toJson(queryParams, '{}'), toJson(data, '{}'), expiresAt, createdAt);
  },

  countCached(provider?: string): number {
    const db = getDatabase();
    const now = new Date().toISOString();
    if (provider) {
      const row = db.prepare('SELECT COUNT(*) as count FROM query_cache WHERE provider = ? AND expires_at > ?').get(provider, now) as any;
      return row ? Number(row.count) : 0;
    }
    const row = db.prepare('SELECT COUNT(*) as count FROM query_cache WHERE expires_at > ?').get(now) as any;
    return row ? Number(row.count) : 0;
  },

  cleanExpired(): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare('DELETE FROM query_cache WHERE expires_at <= ?').run(now);
  },
};

// 13. COMPANY SOURCES REPOSITORY (Web-first public ATS & Career Discovery)
export const companySourcesRepository = {
  getAll(): CompanySource[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM company_sources ORDER BY name ASC').all() as any[];
    return rows.map((r) => this.mapRow(r));
  },

  getById(id: string): CompanySource | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM company_sources WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  },

  getByWebsite(websiteUrl: string): CompanySource | null {
    const db = getDatabase();
    const cleanUrl = websiteUrl.trim().toLowerCase().replace(/\/$/, '');
    const row = db.prepare('SELECT * FROM company_sources WHERE website_url LIKE ? OR careers_url LIKE ?').get(`%${cleanUrl}%`, `%${cleanUrl}%`) as any;
    if (!row) return null;
    return this.mapRow(row);
  },

  getActiveDueForCrawl(cooldownHours: number = 6): CompanySource[] {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();
    const rows = db.prepare(`
      SELECT * FROM company_sources
      WHERE status = 'active'
        AND (last_crawl_at IS NULL OR last_crawl_at <= ?)
      ORDER BY last_crawl_at ASC
    `).all(cutoff) as any[];
    return rows.map((r) => this.mapRow(r));
  },

  create(source: Partial<CompanySource>): CompanySource {
    const db = getDatabase();
    const id = source.id || `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO company_sources (
        id, name, website_url, careers_url, ats_provider, ats_slug,
        status, crawl_frequency_hours, jobs_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      source.name || 'Company',
      source.websiteUrl || '',
      source.careersUrl || source.websiteUrl || '',
      source.atsProvider || null,
      source.atsSlug || null,
      source.status || 'active',
      source.crawlFrequencyHours || 6,
      source.jobsCount || 0,
      now,
      now
    );
    return this.getById(id)!;
  },

  update(id: string, updates: Partial<CompanySource>): CompanySource | null {
    const db = getDatabase();
    const current = this.getById(id);
    if (!current) return null;

    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    db.prepare(`
      UPDATE company_sources
      SET name = ?, website_url = ?, careers_url = ?, ats_provider = ?, ats_slug = ?,
          status = ?, last_crawl_at = ?, last_successful_crawl_at = ?, last_error = ?,
          crawl_frequency_hours = ?, jobs_count = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updated.name,
      updated.websiteUrl,
      updated.careersUrl,
      updated.atsProvider || null,
      updated.atsSlug || null,
      updated.status,
      updated.lastCrawlAt || null,
      updated.lastSuccessfulCrawlAt || null,
      updated.lastError || null,
      updated.crawlFrequencyHours,
      updated.jobsCount,
      updated.updatedAt,
      id
    );
    return this.getById(id);
  },

  delete(id: string): boolean {
    const db = getDatabase();
    const res = db.prepare('DELETE FROM company_sources WHERE id = ?').run(id);
    return Number(res.changes) > 0;
  },

  recordCrawlResult(id: string, jobsFound: number, error?: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    if (error) {
      db.prepare(`
        UPDATE company_sources
        SET last_crawl_at = ?, last_error = ?, updated_at = ?
        WHERE id = ?
      `).run(now, error, now, id);
    } else {
      db.prepare(`
        UPDATE company_sources
        SET last_crawl_at = ?, last_successful_crawl_at = ?, jobs_count = ?, last_error = NULL, status = 'active', updated_at = ?
        WHERE id = ?
      `).run(now, now, jobsFound, now, id);
    }
  },

  recordDetailedCrawlResult(
    id: string,
    metrics: {
      httpStatus: number;
      pagesFetched: number;
      rawJobs: number;
      newJobs: number;
      updatedJobs: number;
      duplicates: number;
      closedJobs: number;
      durationMs: number;
      error?: string;
    }
  ): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    if (metrics.error) {
      db.prepare(`
        UPDATE company_sources
        SET last_crawl_at = ?,
            last_error = ?,
            http_status = ?,
            pages_fetched = ?,
            raw_jobs_count = ?,
            new_jobs_count = ?,
            updated_jobs_count = ?,
            duplicates_count = ?,
            closed_jobs_count = ?,
            execution_duration_ms = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        now,
        metrics.error,
        metrics.httpStatus,
        metrics.pagesFetched,
        metrics.rawJobs,
        metrics.newJobs,
        metrics.updatedJobs,
        metrics.duplicates,
        metrics.closedJobs,
        metrics.durationMs,
        now,
        id
      );
    } else {
      db.prepare(`
        UPDATE company_sources
        SET last_crawl_at = ?,
            last_successful_crawl_at = ?,
            last_error = NULL,
            status = 'active',
            jobs_count = ?,
            http_status = ?,
            pages_fetched = ?,
            raw_jobs_count = ?,
            new_jobs_count = ?,
            updated_jobs_count = ?,
            duplicates_count = ?,
            closed_jobs_count = ?,
            execution_duration_ms = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        now,
        now,
        metrics.rawJobs,
        metrics.httpStatus,
        metrics.pagesFetched,
        metrics.rawJobs,
        metrics.newJobs,
        metrics.updatedJobs,
        metrics.duplicates,
        metrics.closedJobs,
        metrics.durationMs,
        now,
        id
      );
    }
  },

  toggleEnabled(id: string, isEnabled?: boolean): CompanySource | null {
    const current = this.getById(id);
    if (!current) return null;
    const db = getDatabase();
    const newEnabled = isEnabled !== undefined ? isEnabled : !(current.isEnabled ?? true);
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE company_sources
      SET is_enabled = ?,
          status = CASE WHEN ? = 1 THEN 'active' ELSE 'disabled' END,
          updated_at = ?
      WHERE id = ?
    `).run(boolToInt(newEnabled), boolToInt(newEnabled), now, id);
    return this.getById(id);
  },

  mapRow(r: any): CompanySource {
    return {
      id: r.id,
      name: r.name,
      websiteUrl: r.website_url,
      careersUrl: r.careers_url,
      atsProvider: r.ats_provider || undefined,
      atsSlug: r.ats_slug || undefined,
      status: r.status,
      lastCrawlAt: r.last_crawl_at || undefined,
      lastSuccessfulCrawlAt: r.last_successful_crawl_at || undefined,
      lastError: r.last_error || undefined,
      crawlFrequencyHours: Number(r.crawl_frequency_hours || 6),
      jobsCount: Number(r.jobs_count || 0),
      httpStatus: r.http_status != null ? Number(r.http_status) : undefined,
      pagesFetched: r.pages_fetched != null ? Number(r.pages_fetched) : 1,
      rawJobsCount: Number(r.raw_jobs_count || 0),
      newJobsCount: Number(r.new_jobs_count || 0),
      updatedJobsCount: Number(r.updated_jobs_count || 0),
      duplicatesCount: Number(r.duplicates_count || 0),
      closedJobsCount: Number(r.closed_jobs_count || 0),
      executionDurationMs: Number(r.execution_duration_ms || 0),
      isEnabled: r.is_enabled != null ? intToBool(r.is_enabled) : true,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  },
};

// 14. SCHEDULER REPOSITORY (Persistent Asia/Kolkata Scheduler State)
export const schedulerRepository = {
  getState(): SchedulerState {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM scheduler_state WHERE id = ?').get('global_scheduler') as any;
    if (!row) {
      return this.saveInitialState();
    }
    return {
      id: row.id,
      enabled: intToBool(row.enabled),
      scheduleTimeIst: row.schedule_time_ist || '07:00',
      intervalHours: Number(row.interval_hours || 24),
      lastRunAt: row.last_run_at || undefined,
      lastSuccessfulRunAt: row.last_successful_run_at || undefined,
      nextRunAt: row.next_run_at || undefined,
      executionStatus: (row.execution_status as any) || 'idle',
      lastError: row.last_error || undefined,
      catchUpEnabled: intToBool(row.catch_up_enabled),
      updatedAt: row.updated_at,
    };
  },

  saveInitialState(): SchedulerState {
    const db = getDatabase();
    const now = new Date().toISOString();
    const nextRun = computeNextRunAtIst('07:00', 24);
    db.prepare(`
      INSERT OR REPLACE INTO scheduler_state (
        id, enabled, schedule_time_ist, interval_hours, next_run_at, execution_status, catch_up_enabled, updated_at
      ) VALUES ('global_scheduler', 1, '07:00', 24, ?, 'idle', 1, ?)
    `).run(nextRun, now);

    return {
      id: 'global_scheduler',
      enabled: true,
      scheduleTimeIst: '07:00',
      intervalHours: 24,
      nextRunAt: nextRun,
      executionStatus: 'idle',
      catchUpEnabled: true,
      updatedAt: now,
    };
  },

  updateState(updates: Partial<SchedulerState>): SchedulerState {
    const db = getDatabase();
    const current = this.getState();
    const merged: SchedulerState = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.scheduleTimeIst || updates.intervalHours !== undefined) {
      merged.nextRunAt = computeNextRunAtIst(merged.scheduleTimeIst, merged.intervalHours);
    }

    db.prepare(`
      UPDATE scheduler_state
      SET enabled = ?, schedule_time_ist = ?, interval_hours = ?,
          last_run_at = ?, last_successful_run_at = ?, next_run_at = ?,
          execution_status = ?, last_error = ?, catch_up_enabled = ?, updated_at = ?
      WHERE id = 'global_scheduler'
    `).run(
      boolToInt(merged.enabled),
      merged.scheduleTimeIst,
      merged.intervalHours,
      merged.lastRunAt || null,
      merged.lastSuccessfulRunAt || null,
      merged.nextRunAt || null,
      merged.executionStatus,
      merged.lastError || null,
      boolToInt(merged.catchUpEnabled),
      merged.updatedAt
    );

    return merged;
  },

  recordRunStart(): SchedulerState {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE scheduler_state
      SET execution_status = 'running', last_run_at = ?, updated_at = ?
      WHERE id = 'global_scheduler'
    `).run(now, now);
    return this.getState();
  },

  recordRunComplete(success: boolean, error?: string): SchedulerState {
    const current = this.getState();
    const now = new Date().toISOString();
    const nextRun = computeNextRunAtIst(current.scheduleTimeIst, current.intervalHours);

    const db = getDatabase();
    if (success) {
      db.prepare(`
        UPDATE scheduler_state
        SET execution_status = 'completed',
            last_successful_run_at = ?,
            next_run_at = ?,
            last_error = NULL,
            updated_at = ?
        WHERE id = 'global_scheduler'
      `).run(now, nextRun, now);
    } else {
      db.prepare(`
        UPDATE scheduler_state
        SET execution_status = 'failed',
            next_run_at = ?,
            last_error = ?,
            updated_at = ?
        WHERE id = 'global_scheduler'
      `).run(nextRun, error || 'Discovery run failed', now);
    }
    return this.getState();
  },
};

// 14. DISCOVERY ATTEMPTS REPOSITORY
export const discoveryAttemptsRepository = {
  record(attempt: Omit<DiscoveryAttempt, 'id' | 'attemptedAt'>): DiscoveryAttempt {
    const db = getDatabase();
    const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO discovery_attempts (id, company_id, url, status, http_status, error_message, jobs_found, attempted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      attempt.companyId || null,
      attempt.url,
      attempt.status,
      attempt.httpStatus || null,
      attempt.errorMessage || null,
      attempt.jobsFound || 0,
      now
    );
    return {
      id,
      ...attempt,
      attemptedAt: now,
    };
  },

  getRecent(limit: number = 30): DiscoveryAttempt[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM discovery_attempts ORDER BY attempted_at DESC LIMIT ?').all(limit) as any[];
    return rows.map((r) => ({
      id: r.id,
      companyId: r.company_id || undefined,
      url: r.url,
      status: r.status,
      httpStatus: r.http_status ? Number(r.http_status) : undefined,
      errorMessage: r.error_message || undefined,
      jobsFound: Number(r.jobs_found || 0),
      attemptedAt: r.attempted_at,
    }));
  },
};
