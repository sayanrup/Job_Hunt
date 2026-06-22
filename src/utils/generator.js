const PORTFOLIO = 'https://sayanrup.github.io/SAYAN/';

export class ContentGenerator {
  constructor(api) { this.api = api; }

  async extractJobDetails(url, subject, emailText) {
    const system = `You are a job data extraction assistant. Extract structured information from job suggestion emails.
Return ONLY a valid JSON object. Schema: {"company":"string","role":"string","location":"string or null","jdSummary":"2-3 sentence summary","keySkills":["skill1"],"hmEmail":"email or null"}`;
    const user = `Job URL: ${url || 'not available'}\nEmail Subject: ${subject}\n\nEmail Content:\n${emailText.slice(0, 2500)}`;
    const raw = await this.api.complete(system, user, 600);
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return this._fallback(subject);
      const parsed = JSON.parse(match[0]);
      parsed.company = parsed.company || 'Unknown';
      parsed.role = parsed.role || subject.slice(0, 60);
      return parsed;
    } catch { return this._fallback(subject); }
  }

  _fallback(subject) {
    return { company: 'Unknown', role: subject.slice(0, 60), location: null, jdSummary: subject, keySkills: [], hmEmail: null };
  }

  async generateCV(baseCV, job) {
    const system = `You are an expert resume writer for PM roles. Keep EXACT same structure as base CV. Only reword bullets and summary to match the role. Do NOT invent experience. Return complete tailored CV as plain text.`;
    const user = `Target: ${job.role} at ${job.company}\nJD: ${job.jdSummary}\nSkills: ${(job.keySkills||[]).join(', ')}\n\nBase CV:\n${baseCV}`;
    return this.api.complete(system, user, 2500);
  }

  async generateCoverLetter(baseCV, job) {
    const system = `Write a 3-paragraph PM cover letter under 300 words. Para1: hook + why this company. Para2: quantified achievement. Para3: CTA close. Sign off: Sayan Samanta`;
    const user = `Role: ${job.role} at ${job.company}\nJD: ${job.jdSummary}\n\nCandidate CV:\n${baseCV.slice(0, 1800)}`;
    return this.api.complete(system, user, 700);
  }

  async generateLinkedInMessage(job) {
    const system = `Write a LinkedIn connection message under 250 chars. Mention company+role. End with: ${PORTFOLIO}. No clichés.`;
    const user = `Company: ${job.company}\nRole: ${job.role}`;
    return this.api.complete(system, user, 150);
  }

  buildEmailDraft(coverLetter, cv, job) {
    return { subject: `Application for ${job.role} at ${job.company}`, body: `${coverLetter}\n\n${'─'.repeat(50)}\n\nCV ATTACHED BELOW\n\n${cv}` };
  }
}
