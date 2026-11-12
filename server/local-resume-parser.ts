import { WorkExperience, EducationItem, ProjectItem } from '../src/types/candidate';

export interface ParsedResumeData {
  name: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  skills: string[];
  skillCategories: {
    languages: string[];
    frameworks: string[];
    cloudDevops: string[];
    tools: string[];
    domainSpecialties: string[];
  };
  experience: WorkExperience[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: string[];
  preferredRoles: string[];
  preferredLocations: string[];
  minExperienceYears: number;
  maxExperienceYears: number;
}

const COMMON_TECH_LIST = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'React.js', 'Next.js', 'Vue.js', 'Angular',
  'Node.js', 'Express', 'Express.js', 'Django', 'FastAPI', 'Flask', 'Java', 'Spring Boot',
  'Kotlin', 'Go', 'Golang', 'Rust', 'C++', 'C#', '.NET', 'PostgreSQL', 'Postgres', 'MySQL',
  'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Docker', 'Kubernetes', 'AWS',
  'Amazon Web Services', 'Azure', 'GCP', 'Google Cloud', 'Terraform', 'CI/CD', 'Git',
  'GitHub Actions', 'REST APIs', 'GraphQL', 'Tailwind', 'TailwindCSS', 'HTML5', 'CSS3',
  'Linux', 'Microservices', 'PyTorch', 'TensorFlow', 'Pandas', 'NumPy', 'Scikit-learn',
  'Kafka', 'RabbitMQ', 'Celery', 'SQL',
];

const INDIA_CITIES = [
  'Bengaluru', 'Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Mumbai',
  'Delhi', 'Noida', 'Gurugram', 'Gurgaon', 'Kolkata', 'Ahmedabad', 'Kochi',
];

export function parseResumeLocally(text: string): ParsedResumeData {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Contact Information
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  
  // Detect location
  let detectedLocation = '';
  for (const city of INDIA_CITIES) {
    const reg = new RegExp(`\\b${city}\\b`, 'i');
    if (reg.test(text)) {
      detectedLocation = city === 'Bangalore' ? 'Bengaluru' : city === 'Gurgaon' ? 'Gurugram' : city;
      break;
    }
  }

  // Name heuristic: First non-contact, reasonable length line
  let inferredName = 'Candidate';
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const l = lines[i];
    if (
      l.length > 2 &&
      l.length < 40 &&
      !l.includes('@') &&
      !/\d{5,}/.test(l) &&
      !/curriculum|resume|profile|cv/i.test(l)
    ) {
      inferredName = l.replace(/[#*_-]/g, '').trim();
      break;
    }
  }

  // 2. Skills Extraction
  const detectedSkills: string[] = [];
  COMMON_TECH_LIST.forEach((tech) => {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:$|[^a-zA-Z0-9_#+])`, 'i');
    if (regex.test(text)) {
      detectedSkills.push(tech);
    }
  });

  // 3. Section Segmentation
  const sections: Record<string, string[]> = {
    experience: [],
    education: [],
    projects: [],
    skills: [],
    summary: [],
  };

  let currentSection = 'summary';
  for (const line of lines) {
    const lLower = line.toLowerCase();
    if (/^(?:work\s+)?experience|employment(?:\s+history)?|professional\s+experience/i.test(lLower) && line.length < 40) {
      currentSection = 'experience';
      continue;
    } else if (/^education|academic(?:\s+background)?|qualifications/i.test(lLower) && line.length < 40) {
      currentSection = 'education';
      continue;
    } else if (/^(?:personal\s+|academic\s+|key\s+)?projects/i.test(lLower) && line.length < 40) {
      currentSection = 'projects';
      continue;
    } else if (/^(?:technical\s+)?skills|technologies|tools/i.test(lLower) && line.length < 40) {
      currentSection = 'skills';
      continue;
    }
    if (sections[currentSection]) {
      sections[currentSection].push(line);
    }
  }

  // 4. Work Experience Extraction
  const experience: WorkExperience[] = [];
  const expLines = sections.experience;
  let currentExp: Partial<WorkExperience> | null = null;

  for (let i = 0; i < expLines.length; i++) {
    const line = expLines[i];
    // Check if line looks like a date range or title: e.g. "Software Engineer | 2022 - Present" or "Jan 2023 - Dec 2023"
    const dateMatch = line.match(/(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(?:20\d\d|19\d\d)\s*(?:-|–|to)\s*(?:(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(?:20\d\d|Present|Current))/i);

    if (dateMatch || (currentExp && line.length < 50 && (line.includes('|') || line.includes(' - ') || line.includes(' at ')))) {
      if (currentExp && currentExp.title) {
        experience.push({
          id: `exp-${Date.now()}-${experience.length}`,
          title: currentExp.title || 'Software Engineer',
          company: currentExp.company || 'Company',
          startDate: currentExp.startDate || '2023',
          endDate: currentExp.endDate || 'Present',
          current: currentExp.current ?? true,
          description: currentExp.description || '',
          skillsUsed: [],
        });
      }

      const parts = line.split(/[|•–-]/).map((p) => p.trim());
      const dates = dateMatch ? dateMatch[0].split(/(?:-|–|to)/i).map((s) => s.trim()) : ['2023', 'Present'];

      currentExp = {
        title: parts[0] || 'Software Engineer',
        company: parts[1] || 'Company',
        startDate: dates[0] || '2023',
        endDate: dates[1] || 'Present',
        current: /present|current/i.test(dates[1] || ''),
        description: '',
      };
    } else if (currentExp) {
      currentExp.description = currentExp.description ? `${currentExp.description} ${line}` : line;
    }
  }

  if (currentExp && currentExp.title) {
    experience.push({
      id: `exp-${Date.now()}-${experience.length}`,
      title: currentExp.title || 'Software Engineer',
      company: currentExp.company || 'Company',
      startDate: currentExp.startDate || '2023',
      endDate: currentExp.endDate || 'Present',
      current: currentExp.current ?? true,
      description: currentExp.description || '',
      skillsUsed: [],
    });
  }

  // 5. Education Extraction
  const education: EducationItem[] = [];
  const eduLines = sections.education;
  for (let i = 0; i < eduLines.length; i++) {
    const line = eduLines[i];
    if (/b\.?tech|b\.?e\.?|m\.?tech|mca|bca|bachelor|master|degree|diploma/i.test(line)) {
      const yearMatch = (line + ' ' + (eduLines[i + 1] || '')).match(/\b(20\d\d)\b/);
      const degreeMatch = line.match(/(?:B\.?Tech|B\.?E\.?|M\.?Tech|MCA|BCA|Bachelor of [^,•\n]+|Master of [^,•\n]+|B\.?S\.?)/i);
      education.push({
        id: `edu-${Date.now()}-${education.length}`,
        degree: degreeMatch ? degreeMatch[0] : 'Bachelor of Technology',
        field: /computer\s+science|information\s+technology|electronics/i.test(line) ? 'Computer Science' : 'Engineering',
        institution: eduLines[i + 1] && eduLines[i + 1].length < 60 ? eduLines[i + 1] : 'University / Institute',
        gradYear: yearMatch ? yearMatch[1] : '2024',
      });
      if (education.length >= 2) break;
    }
  }

  // 6. Projects Extraction
  const projects: ProjectItem[] = [];
  const projLines = sections.projects;
  let currentProj: Partial<ProjectItem> | null = null;
  for (const line of projLines) {
    if (line.length < 50 && (line.includes(':') || line.includes('|') || /^[A-Z0-9\s]{3,30}$/.test(line))) {
      if (currentProj && currentProj.title) {
        projects.push({
          id: `proj-${Date.now()}-${projects.length}`,
          title: currentProj.title,
          summary: currentProj.summary || 'Engineered responsive full-stack software application.',
          techStack: currentProj.techStack || ['Python', 'React'],
          highlights: currentProj.highlights || [],
        });
        if (projects.length >= 3) break;
      }
      const parts = line.split(/[:|]/).map((s) => s.trim());
      currentProj = {
        title: parts[0],
        summary: parts[1] || '',
        techStack: detectedSkills.slice(0, 3),
        highlights: [],
      };
    } else if (currentProj) {
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        currentProj.highlights = [...(currentProj.highlights || []), line.replace(/^[•\-*]\s*/, '')];
      } else {
        currentProj.summary = currentProj.summary ? `${currentProj.summary} ${line}` : line;
      }
    }
  }
  if (currentProj && currentProj.title && projects.length < 3) {
    projects.push({
      id: `proj-${Date.now()}-${projects.length}`,
      title: currentProj.title,
      summary: currentProj.summary || 'Engineered responsive full-stack software application.',
      techStack: currentProj.techStack || ['Python', 'React'],
      highlights: currentProj.highlights || [],
    });
  }

  // 7. Calculate Experience Range & Level
  let totalExperienceYears = 0;
  if (experience.length > 0) {
    for (const exp of experience) {
      const s = parseInt(exp.startDate || '2023', 10);
      const e = exp.current || exp.endDate === 'Present' ? new Date().getFullYear() : parseInt(exp.endDate || '2023', 10);
      const diff = isNaN(e) || isNaN(s) ? 1 : Math.max(0.5, e - s);
      totalExperienceYears += diff;
    }
  }

  const isFresherCandidate =
    totalExperienceYears <= 1 ||
    experience.length === 0 ||
    experience.some((e) => /intern|trainee|apprentice/i.test(e.title));

  const minExperienceYears = isFresherCandidate ? 0 : Math.max(1, Math.floor(totalExperienceYears));
  const maxExperienceYears = isFresherCandidate ? 1 : Math.ceil(totalExperienceYears + 1);

  // 8. Inferred Preferred Roles & Locations
  const preferredRoles: string[] = [];
  if (experience.length > 0 && experience[0].title) {
    preferredRoles.push(experience[0].title);
  }
  if (detectedSkills.some((s) => ['Python', 'Django', 'FastAPI'].includes(s))) {
    preferredRoles.push('Python Developer', 'Backend Developer');
  }
  if (detectedSkills.some((s) => ['React', 'TypeScript', 'JavaScript'].includes(s))) {
    preferredRoles.push('Full Stack Developer', 'React Developer');
  }
  if (isFresherCandidate) {
    preferredRoles.push('Software Engineer', 'Graduate Engineer Trainee');
  }
  if (preferredRoles.length === 0) {
    preferredRoles.push('Software Engineer', 'Full Stack Developer');
  }

  const preferredLocations = [
    detectedLocation || 'Bengaluru',
    'Hyderabad',
    'Pune',
    'Remote India',
  ];

  const primaryHeadline = experience.length > 0
    ? `${experience[0].title} (${detectedSkills.slice(0, 3).join(', ')})`
    : detectedSkills.length > 0
    ? `Software Engineer (${detectedSkills.slice(0, 3).join(', ')})`
    : 'Software Professional';

  return {
    name: inferredName,
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0] : '',
    location: detectedLocation || 'Bengaluru, India',
    headline: primaryHeadline,
    summary: sections.summary.slice(0, 3).join(' ') || `${inferredName} is a software engineer specializing in ${detectedSkills.slice(0, 4).join(', ') || 'modern software development'}.`,
    skills: detectedSkills,
    skillCategories: {
      languages: detectedSkills.filter((s) => ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'SQL'].includes(s)),
      frameworks: detectedSkills.filter((s) => ['React', 'Next.js', 'Vue.js', 'Angular', 'Node.js', 'Express', 'Django', 'FastAPI', 'Flask', 'Spring Boot'].includes(s)),
      cloudDevops: detectedSkills.filter((s) => ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform'].includes(s)),
      tools: detectedSkills.filter((s) => ['Git', 'GitHub Actions', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Linux'].includes(s)),
      domainSpecialties: ['Web Engineering', 'Backend Systems', 'Distributed Services'],
    },
    experience,
    education,
    projects,
    certifications: [],
    preferredRoles: [...new Set(preferredRoles)].slice(0, 4),
    preferredLocations: [...new Set(preferredLocations)].slice(0, 4),
    minExperienceYears,
    maxExperienceYears,
  };
}

