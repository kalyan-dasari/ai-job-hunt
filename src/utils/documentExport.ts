import { CandidateProfile } from '../types/candidate';

/**
 * Formats a candidate profile or tailored resume into clean plain text for clipboard copying.
 */
export function formatResumeAsPlainText(profile: {
  name: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills?: string[];
  experience?: Array<{
    title: string;
    company: string;
    startDate: string;
    endDate: string;
    description?: string;
    skillsUsed?: string[];
  }>;
  projects?: Array<{
    title: string;
    summary: string;
    techStack?: string[];
    highlights?: string[];
  }>;
  education?: Array<{
    degree: string;
    field: string;
    institution: string;
    gradYear: string;
  }>;
  certifications?: string[];
}): string {
  const parts: string[] = [];

  // Header
  parts.push(profile.name.toUpperCase());
  if (profile.headline) parts.push(profile.headline);

  const contact = [profile.email, profile.phone, profile.location].filter(Boolean).join(' | ');
  if (contact) parts.push(contact);
  parts.push('='.repeat(50));

  // Summary
  if (profile.summary) {
    parts.push('\nPROFESSIONAL SUMMARY');
    parts.push('-'.repeat(30));
    parts.push(profile.summary);
  }

  // Skills
  if (profile.skills && profile.skills.length > 0) {
    parts.push('\nTECHNICAL SKILLS');
    parts.push('-'.repeat(30));
    parts.push(profile.skills.join(', '));
  }

  // Experience
  if (profile.experience && profile.experience.length > 0) {
    parts.push('\nWORK EXPERIENCE');
    parts.push('-'.repeat(30));
    profile.experience.forEach((exp) => {
      parts.push(`${exp.title} | ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'})`);
      if (exp.description) parts.push(exp.description);
      if (exp.skillsUsed && exp.skillsUsed.length > 0) {
        parts.push(`Key Technologies: ${exp.skillsUsed.join(', ')}`);
      }
      parts.push('');
    });
  }

  // Projects
  if (profile.projects && profile.projects.length > 0) {
    parts.push('\nPROJECTS');
    parts.push('-'.repeat(30));
    profile.projects.forEach((proj) => {
      parts.push(`${proj.title}`);
      if (proj.techStack && proj.techStack.length > 0) {
        parts.push(`Tech Stack: ${proj.techStack.join(', ')}`);
      }
      if (proj.summary) parts.push(proj.summary);
      if (proj.highlights && proj.highlights.length > 0) {
        proj.highlights.forEach((h) => parts.push(`  • ${h}`));
      }
      parts.push('');
    });
  }

  // Education
  if (profile.education && profile.education.length > 0) {
    parts.push('\nEDUCATION');
    parts.push('-'.repeat(30));
    profile.education.forEach((edu) => {
      parts.push(`${edu.degree} in ${edu.field} | ${edu.institution} (${edu.gradYear})`);
    });
  }

  // Certifications
  if (profile.certifications && profile.certifications.length > 0) {
    parts.push('\nCERTIFICATIONS');
    parts.push('-'.repeat(30));
    profile.certifications.forEach((c) => parts.push(`• ${c}`));
  }

  return parts.join('\n');
}

/**
 * Downloads a resume as a formatted DOCX document file.
 * Generates standard Word-compatible HTML with MSOffice XML namespaces so it opens seamlessly in Microsoft Word, LibreOffice, and Google Docs.
 */
export function downloadResumeAsDocx(
  profile: Parameters<typeof formatResumeAsPlainText>[0],
  fileName?: string
): void {
  const plainText = formatResumeAsPlainText(profile);
  const title = fileName || `${(profile.name || 'Candidate').replace(/\s+/g, '_')}_Resume`;

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <style>
        body {
          font-family: 'Calibri', 'Arial', sans-serif;
          font-size: 11pt;
          line-height: 1.35;
          color: #1a1a1a;
          margin: 1in;
        }
        h1 {
          font-size: 20pt;
          margin-bottom: 2pt;
          color: #0f172a;
          text-align: center;
        }
        .contact {
          text-align: center;
          font-size: 10pt;
          color: #475569;
          margin-bottom: 14pt;
        }
        h2 {
          font-size: 12pt;
          border-bottom: 1.5pt solid #0f172a;
          padding-bottom: 2pt;
          margin-top: 12pt;
          margin-bottom: 6pt;
          text-transform: uppercase;
          color: #0f172a;
          letter-spacing: 0.5pt;
        }
        .role-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          margin-top: 6pt;
        }
        .company-line {
          font-style: italic;
          color: #334155;
          margin-bottom: 3pt;
        }
        ul {
          margin-top: 2pt;
          margin-bottom: 6pt;
          padding-left: 18pt;
        }
        li {
          margin-bottom: 2pt;
        }
      </style>
    </head>
    <body>
      <h1>${profile.name || 'Candidate Name'}</h1>
      ${profile.headline ? `<div style="text-align:center; font-size:11pt; color:#334155; margin-bottom:4pt;"><strong>${profile.headline}</strong></div>` : ''}
      <div class="contact">
        ${[profile.email, profile.phone, profile.location].filter(Boolean).join(' | ')}
      </div>

      ${profile.summary ? `
        <h2>Professional Summary</h2>
        <p>${profile.summary}</p>
      ` : ''}

      ${profile.skills && profile.skills.length > 0 ? `
        <h2>Technical Skills</h2>
        <p>${profile.skills.join(' • ')}</p>
      ` : ''}

      ${profile.experience && profile.experience.length > 0 ? `
        <h2>Work Experience</h2>
        ${profile.experience.map((exp) => `
          <div class="role-header">
            <span>${exp.title}</span>
            <span>${exp.startDate} – ${exp.endDate || 'Present'}</span>
          </div>
          <div class="company-line">${exp.company}</div>
          ${exp.description ? `<p>${exp.description}</p>` : ''}
          ${exp.skillsUsed && exp.skillsUsed.length > 0 ? `<p style="font-size:9.5pt; color:#475569;"><em>Technologies: ${exp.skillsUsed.join(', ')}</em></p>` : ''}
        `).join('')}
      ` : ''}

      ${profile.projects && profile.projects.length > 0 ? `
        <h2>Projects</h2>
        ${profile.projects.map((proj) => `
          <div class="role-header">
            <span>${proj.title}</span>
          </div>
          ${proj.techStack && proj.techStack.length > 0 ? `<div style="font-size:9.5pt; color:#475569;">Tech: ${proj.techStack.join(', ')}</div>` : ''}
          <p>${proj.summary}</p>
          ${proj.highlights && proj.highlights.length > 0 ? `
            <ul>
              ${proj.highlights.map((h) => `<li>${h}</li>`).join('')}
            </ul>
          ` : ''}
        `).join('')}
      ` : ''}

      ${profile.education && profile.education.length > 0 ? `
        <h2>Education</h2>
        ${profile.education.map((edu) => `
          <div class="role-header">
            <span>${edu.degree} in ${edu.field}</span>
            <span>${edu.gradYear}</span>
          </div>
          <div class="company-line">${edu.institution}</div>
        `).join('')}
      ` : ''}

      ${profile.certifications && profile.certifications.length > 0 ? `
        <h2>Certifications</h2>
        <ul>
          ${profile.certifications.map((c) => `<li>${c}</li>`).join('')}
        </ul>
      ` : ''}
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers printing of the resume formatted cleanly for PDF saving.
 */
export function printResumeAsPdf(profile: Parameters<typeof formatResumeAsPlainText>[0]): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print or export PDF.');
    return;
  }

  const title = `${profile.name || 'Candidate'}_Resume`;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        @page {
          size: A4;
          margin: 1.5cm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 10.5pt;
          line-height: 1.4;
          color: #111827;
          background: #ffffff;
          margin: 0;
          padding: 0;
        }
        .header {
          text-align: center;
          margin-bottom: 14pt;
          border-bottom: 1.5pt solid #0f172a;
          padding-bottom: 8pt;
        }
        .name {
          font-size: 18pt;
          font-weight: 700;
          letter-spacing: -0.5pt;
          margin: 0 0 2pt 0;
        }
        .headline {
          font-size: 11pt;
          font-weight: 600;
          color: #374151;
          margin-bottom: 3pt;
        }
        .contact {
          font-size: 9.5pt;
          color: #4b5563;
        }
        h2 {
          font-size: 11.5pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5pt;
          border-bottom: 1pt solid #e5e7eb;
          padding-bottom: 2pt;
          margin-top: 10pt;
          margin-bottom: 4pt;
          color: #111827;
        }
        .item-header {
          display: flex;
          justify-content: space-between;
          font-weight: 600;
          font-size: 10.5pt;
          margin-top: 5pt;
        }
        .item-sub {
          font-size: 9.5pt;
          color: #4b5563;
          margin-bottom: 2pt;
        }
        p {
          margin: 2pt 0 4pt 0;
          font-size: 10pt;
        }
        ul {
          margin: 2pt 0 4pt 0;
          padding-left: 14pt;
        }
        li {
          font-size: 9.5pt;
          margin-bottom: 1.5pt;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="name">${profile.name || 'Candidate Name'}</h1>
        ${profile.headline ? `<div class="headline">${profile.headline}</div>` : ''}
        <div class="contact">
          ${[profile.email, profile.phone, profile.location].filter(Boolean).join(' · ')}
        </div>
      </div>

      ${profile.summary ? `
        <h2>Professional Summary</h2>
        <p>${profile.summary}</p>
      ` : ''}

      ${profile.skills && profile.skills.length > 0 ? `
        <h2>Technical Skills</h2>
        <p>${profile.skills.join(' · ')}</p>
      ` : ''}

      ${profile.experience && profile.experience.length > 0 ? `
        <h2>Work Experience</h2>
        ${profile.experience.map((exp) => `
          <div class="item-header">
            <span>${exp.title}</span>
            <span>${exp.startDate} – ${exp.endDate || 'Present'}</span>
          </div>
          <div class="item-sub">${exp.company}</div>
          ${exp.description ? `<p>${exp.description}</p>` : ''}
          ${exp.skillsUsed && exp.skillsUsed.length > 0 ? `<div style="font-size:9pt; color:#6b7280;">Tech Stack: ${exp.skillsUsed.join(', ')}</div>` : ''}
        `).join('')}
      ` : ''}

      ${profile.projects && profile.projects.length > 0 ? `
        <h2>Projects</h2>
        ${profile.projects.map((proj) => `
          <div class="item-header">
            <span>${proj.title}</span>
          </div>
          ${proj.techStack && proj.techStack.length > 0 ? `<div class="item-sub">Tech: ${proj.techStack.join(', ')}</div>` : ''}
          <p>${proj.summary}</p>
          ${proj.highlights && proj.highlights.length > 0 ? `
            <ul>
              ${proj.highlights.map((h) => `<li>${h}</li>`).join('')}
            </ul>
          ` : ''}
        `).join('')}
      ` : ''}

      ${profile.education && profile.education.length > 0 ? `
        <h2>Education</h2>
        ${profile.education.map((edu) => `
          <div class="item-header">
            <span>${edu.degree} in ${edu.field}</span>
            <span>${edu.gradYear}</span>
          </div>
          <div class="item-sub">${edu.institution}</div>
        `).join('')}
      ` : ''}

      ${profile.certifications && profile.certifications.length > 0 ? `
        <h2>Certifications</h2>
        <ul>
          ${profile.certifications.map((c) => `<li>${c}</li>`).join('')}
        </ul>
      ` : ''}

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `);

  printWindow.document.close();
}
