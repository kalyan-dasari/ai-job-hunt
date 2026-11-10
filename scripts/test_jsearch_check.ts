import { normalizeJSearchJob } from '../server/job-sources/sources/jsearch-adapter.ts';
import { normalizeRawJob } from '../server/job-sources/normalizer.ts';

const mock = {
  job_id: 'jsearch-in-9912',
  job_title: 'Full Stack Engineer - React & Node.js',
  employer_name: 'PhonePe',
  job_city: 'Bengaluru',
  job_state: 'Karnataka',
  job_country: 'IN',
  job_min_salary: 1800000,
  job_max_salary: 2800000,
  job_salary_currency: 'INR',
  job_salary_period: 'YEAR',
  job_description: 'We are hiring a Full Stack Engineer with 2+ years of experience.',
  job_apply_link: 'https://phonepe.com/careers/job-9912',
  job_posted_at_datetime_utc: '2026-10-25T10:00:00Z',
  job_required_skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
  job_required_experience: { no_experience_required: false, required_experience_in_months: 24, experience_mentioned: true },
  job_highlights: { Responsibilities: ['Design distributed payment microservices', 'Implement resilient real-time APIs'] }
};

const raw = normalizeJSearchJob(mock);
const norm = normalizeRawJob(raw);
console.log('company === PhonePe:', norm.company === 'PhonePe');
console.log('title === Full Stack...:', norm.title === 'Full Stack Engineer - React & Node.js');
console.log('source === JSearch:', norm.source === 'JSearch', `(actual: "${norm.source}")`);
console.log('location includes Bengaluru:', norm.location.includes('Bengaluru'), `(actual: "${norm.location}")`);
console.log('minExpYears === 2:', norm.minExpYears === 2, `(actual: ${norm.minExpYears})`);
console.log('salary.min === 1800000:', norm.salary?.min === 1800000, `(actual: ${norm.salary?.min})`);
console.log('salary.currency === INR:', norm.salary?.currency === 'INR', `(actual: "${norm.salary?.currency}")`);
console.log('responsibilities.length === 2:', norm.responsibilities.length === 2, `(actual: ${norm.responsibilities.length})`);
console.log('skills includes React:', norm.requiredSkills.includes('React'), `(actual: ${norm.requiredSkills})`);
