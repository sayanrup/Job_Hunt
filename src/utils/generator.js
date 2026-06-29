export class ContentGenerator {
  constructor(api) { this.api = api; }

  async extractJobDetails(url, subject, emailText) {
    const system = `You are a job data extraction assistant. Extract structured information from job suggestion emails.
IMPORTANT: Extract "company" and "role" from the job listing body content, NOT from the email subject line.
Return ONLY a valid JSON object. Schema: {"company":"string","role":"string","location":"string or null","jdSummary":"2-3 sentence summary","keySkills":["skill1"],"hmEmail":"email or null","hmLinkedIn":"LinkedIn profile URL of hiring manager/recruiter or null","jdLink":"direct job posting URL or null"}`;
    const user = `Job URL: ${url || 'not available'}\nEmail Subject: ${subject}\n\nEmail Content:\n${emailText.slice(0, 3000)}`;
    const raw = await this.api.complete(system, user, 700);
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return this._fallback(subject, url);
      const parsed = JSON.parse(match[0]);
      if (!parsed.company || parsed.company === 'Unknown') {
        const fromUrl = parseNaukriUrl(url);
        if (fromUrl.company) parsed.company = fromUrl.company;
        if (fromUrl.role && (!parsed.role || parsed.role === subject.slice(0, 60))) parsed.role = fromUrl.role;
      }
      parsed.company = parsed.company || 'Unknown';
      parsed.role = parsed.role || subject.slice(0, 60);
      return parsed;
    } catch { return this._fallback(subject, url); }
  }

  _fallback(subject, url) {
    const fromUrl = parseNaukriUrl(url);
    return {
      company: fromUrl.company || 'Unknown',
      role: fromUrl.role || subject.slice(0, 60),
      location: null,
      jdSummary: subject,
      keySkills: [],
      hmEmail: null,
      hmLinkedIn: null,
      jdLink: url || null,
    };
  }

  async generateCV(baseCV, job) {
    const system = `You are an expert resume writer for PM roles. Keep EXACT same structure as base CV. Only reword bullets and summary to match the role. Do NOT invent experience. Return complete tailored CV as plain text.`;
    const user = `Target: ${job.role} at ${job.company}\nJD: ${job.jdSummary}\nSkills: ${(job.keySkills||[]).join(', ')}\n\nBase CV:\n${baseCV.slice(0, 1800)}`;
    return this.api.complete(system, user, 1500);
  }

  async generateCoverLetter(baseCV, job) {
    const system = `Write a 3-paragraph PM cover letter under 300 words. Para1: hook + why this company. Para2: quantified achievement. Para3: CTA close. Sign off: Sayan Samanta`;
    const user = `Role: ${job.role} at ${job.company}\nJD: ${job.jdSummary}\n\nCandidate CV:\n${baseCV.slice(0, 1200)}`;
    return this.api.complete(system, user, 500);
  }

  buildEmailDraft(coverLetter, cv, job) {
    return { subject: `Application for ${job.role} at ${job.company}`, body: `${coverLetter}\n\n${'─'.repeat(50)}\n\nCV ATTACHED BELOW\n\n${cv}` };
  }
}

function parseNaukriUrl(url) {
  if (!url) return {};
  const m = url.match(/naukri\.com\/job-listings-(.+?)(?:-\d{10,})?(?:[?#]|$)/i);
  if (!m) return {};
  const slug = m[1];
  const roleMap = [
    { prefix: 'senior-product-manager-', role: 'Senior Product Manager' },
    { prefix: 'product-manager-', role: 'Product Manager' },
    { prefix: 'associate-product-manager-', role: 'Associate Product Manager' },
  ];
  for (const { prefix, role } of roleMap) {
    if (slug.startsWith(prefix)) {
      const rest = slug.slice(prefix.length);
      const companySlug = rest.replace(/[-](bengaluru|bangalore|mumbai|delhi|ncr|pune|hyderabad|chennai|gurgaon|gurugram|noida|remote|india|\d[-\d]*[-to]*[-yrs]*).*$/i, '');
      const company = companySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return { role, company };
    }
  }
  return {};
}
