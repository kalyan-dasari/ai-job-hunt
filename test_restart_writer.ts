import path from 'node:path';
import { initDatabase, closeDatabase, candidateRepository, jobsRepository, applicationsRepository } from './server/database.ts';
import { Job } from './src/types/job.ts';
import { ResumeVersion } from './src/types/candidate.ts';

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'test_restart_lifecycle.db');
console.log(`[Process 1 - Writer] Initializing database at ${dbPath}...`);
initDatabase(dbPath);

console.log('[Process 1 - Writer] Uploading candidate resume and profile...');
const sampleResume = `
KAVYA PATEL
Senior Full-Stack Engineer | Seattle, WA | kavya.patel@example.com
Summary: Experienced full-stack software engineer with deep expertise in TypeScript, React, Node.js, and distributed databases.
Skills: TypeScript, React, Node.js, Express, PostgreSQL, Redis, Docker, AWS
Experience:
Senior Software Engineer at Zeta Dynamics (2022 - Present)
- Designed high-throughput microservices using Node.js and TypeScript.
Education:
B.S. in Computer Science, University of Washington (2020)
`;

const resumeVersion: ResumeVersion = {
  id: 'resume-restart-test-1',
  fileName: 'Kavya_Patel_Resume.pdf',
  versionName: 'Initial Resume',
  fileSizeBytes: sampleResume.length,
  extractedTextLength: sampleResume.length,
  isActive: true,
  uploadedAt: new Date().toISOString(),
};

candidateRepository.addResumeVersion(resumeVersion, sampleResume);
candidateRepository.updateProfile({
  name: 'Kavya Patel',
  email: 'kavya.patel@example.com',
  headline: 'Senior Full-Stack Engineer',
  location: 'Seattle, WA',
  skills: ['TypeScript', 'React', 'Node.js', 'Express', 'PostgreSQL', 'Redis', 'Docker', 'AWS'],
});

console.log('[Process 1 - Writer] Importing 2 jobs...');
const job1: Job = {
  id: 'job-restart-101',
  title: 'Senior Full-Stack Engineer',
  company: 'Zeta Dynamics',
  location: 'Seattle, WA',
  workArrangement: 'Hybrid',
  employmentType: 'Full-time',
  experienceLevel: 'Senior',
  description: 'Lead engineering for scalable core platform systems.',
  responsibilities: ['Build React dashboards', 'Design Node APIs'],
  requiredSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
  preferredSkills: ['Docker', 'AWS'],
  source: 'Career Page',
  sourceJobId: 'zeta-101',
  originalUrl: 'https://zetadynamics.example.com/careers/101',
  canonicalUrl: 'https://zetadynamics.example.com/careers/101',
  datePosted: '2026-10-30',
  lastChecked: new Date().toISOString(),
  isStartup: true,
  verificationReport: {
    status: 'Verified',
    confidence: 95,
    lastChecked: new Date().toISOString(),
    summary: 'Corroborated directly with official corporate registry.',
    checks: [],
    evidence: [],
    warnings: [],
  },
  matchResult: {
    overallScore: 94,
    dimensions: {
      technicalSkills: 95,
      relevantExperience: 90,
      projectRelevance: 92,
      educationAndCerts: 95,
      locationAndArrangement: 95,
      seniorityFit: 92,
    },
    strongMatches: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    missingSkills: [],
    eligibilityConcerns: [],
    explanation: 'Exceptional direct skill match for core stack.',
    recommendations: [],
    calculatedAt: new Date().toISOString(),
  },
  isSaved: false,
  isDismissed: false,
};

const job2: Job = {
  id: 'job-restart-102',
  title: 'Backend Systems Lead',
  company: 'Nexus Infra',
  location: 'Remote',
  workArrangement: 'Remote',
  employmentType: 'Full-time',
  experienceLevel: 'Lead',
  description: 'Build high-performance distributed systems.',
  responsibilities: ['Architect microservices'],
  requiredSkills: ['Go', 'Docker', 'Kubernetes'],
  preferredSkills: ['AWS'],
  source: 'Startup Feed',
  sourceJobId: 'nexus-102',
  originalUrl: 'https://nexusinfra.example.com/jobs/102',
  canonicalUrl: 'https://nexusinfra.example.com/jobs/102',
  datePosted: '2026-10-29',
  lastChecked: new Date().toISOString(),
  isStartup: true,
  verificationReport: {
    status: 'Verified',
    confidence: 90,
    lastChecked: new Date().toISOString(),
    summary: 'Verified domain and corporate records.',
    checks: [],
    evidence: [],
    warnings: [],
  },
  isSaved: true,
  isDismissed: false,
};

jobsRepository.saveJob(job1);
jobsRepository.saveJob(job2);

console.log('[Process 1 - Writer] Creating application for job-restart-101...');
const app = applicationsRepository.createApplication({
  jobId: job1.id,
  notes: 'Direct application through verified careers portal with customized resume.',
});

console.log(`[Process 1 - Writer] Application created with ID: ${app.id}`);
console.log('[Process 1 - Writer] Closing database connection and terminating process...');
closeDatabase();
console.log('[Process 1 - Writer] Worker process completed successfully.');
process.exit(0);

