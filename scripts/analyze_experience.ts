import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'data', 'jobpilot.db');
const db = new DatabaseSync(dbPath);

const allJobs = db.prepare('SELECT id, title, company, location, experience_level, min_exp_years, max_exp_years, fresher_status, description, original_url, application_url FROM jobs').all() as any[];

console.log('Total jobs:', allJobs.length);

const currentFresher = allJobs.filter(j => j.fresher_status === 'Fresher');
console.log(`\n=== CURRENT FRESHER JOBS (${currentFresher.length}) ===`);
currentFresher.forEach((j, i) => {
  console.log(`${i+1}. [${j.company}] "${j.title}" (${j.location}) | min: ${j.min_exp_years}, max: ${j.max_exp_years}`);
});

const currentExp = allJobs.filter(j => j.fresher_status === 'Experienced');
console.log(`\n=== CURRENT EXPERIENCED JOBS (${currentExp.length}) ===`);

const currentUnclear = allJobs.filter(j => j.fresher_status === 'Unclear');
console.log(`\n=== CURRENT UNCLEAR JOBS (${currentUnclear.length}) ===`);

// Let's inspect how many of the Unclear jobs actually have experience requirements in title or description!
console.log('\n=== ANALYZING 127 UNCLEAR JOBS ===');
const unclearAnalysis = currentUnclear.map(j => {
  const text = `${j.title} ${j.description || ''}`;
  // Look for senior keywords
  const isSeniorTitle = /\b(senior|lead|principal|staff|architect|director|head of|vp|manager)\b/i.test(j.title);
  // Look for numeric years pattern
  const yearsMatch = text.match(/\b(\d+)\+?\s*(?:to|-)\s*(\d+)?\s*(?:years?|yrs?)\b/i) || text.match(/\b(?:minimum|at least)\s*(\d+)\+?\s*(?:years?|yrs?)\b/i) || text.match(/\b(\d+)\+\s*(?:years?|yrs?)\b/i);
  // Look for intern/fresher
  const isFresherPattern = /\b(intern|internship|fresher|fresh graduate|graduate trainee|trainee|0\s*-\s*1\s*years?|0\s*-\s*2\s*years?)\b/i.test(text);
  
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    isSeniorTitle,
    yearsMatch: yearsMatch ? yearsMatch[0] : null,
    isFresherPattern
  };
});

const shouldBeExp = unclearAnalysis.filter(a => a.isSeniorTitle || (a.yearsMatch && parseInt(a.yearsMatch) >= 3));
const shouldBeFresher = unclearAnalysis.filter(a => a.isFresherPattern && !a.isSeniorTitle && !(a.yearsMatch && parseInt(a.yearsMatch) >= 3));
const genuinelyUnclear = unclearAnalysis.filter(a => !shouldBeExp.includes(a) && !shouldBeFresher.includes(a));

console.log(`Unclear jobs that are clearly EXPERIENCED: ${shouldBeExp.length}`);
console.log(`Unclear jobs that are clearly FRESHER: ${shouldBeFresher.length}`);
console.log(`Unclear jobs that are GENUINELY UNCLEAR (no experience stated): ${genuinelyUnclear.length}`);

console.log('\nSample Unclear -> Fresher:');
shouldBeFresher.forEach(s => console.log(`  [${s.company}] "${s.title}" -> pattern: ${s.isFresherPattern}`));

console.log('\nSample Unclear -> Experienced:');
shouldBeExp.slice(0, 10).forEach(s => console.log(`  [${s.company}] "${s.title}" -> ${s.isSeniorTitle ? 'Senior title' : ''} ${s.yearsMatch || ''}`));
