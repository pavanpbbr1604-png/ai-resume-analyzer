import {
  NormalizedDocument,
  AnalysisResultResponse,
  InterviewPreparationPlan,
  ResumeChatMessage,
  ResumeChatResponse,
} from '../types';

const API_BASE = '/api';

export const api = {
  async chatResume(
    resumeId: string,
    message: string,
    options?: {
      analysisId?: string;
      suggestionId?: string;
      history?: ResumeChatMessage[];
      jdText?: string;
    }
  ): Promise<ResumeChatResponse> {
    const res = await fetch(`${API_BASE}/analyses/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resume_id: resumeId,
        message,
        analysis_id: options?.analysisId,
        suggestion_id: options?.suggestionId,
        history: options?.history || [],
        jd_text: options?.jdText,
      }),
    });
    if (!res.ok) throw new Error('Failed to send resume chat message.');
    return res.json();
  },

  async uploadResume(file: File): Promise<NormalizedDocument> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/resumes/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload resume file.');
    return res.json();
  },

  async getResume(resumeId: string): Promise<NormalizedDocument> {
    const res = await fetch(`${API_BASE}/resumes/${resumeId}`);
    if (!res.ok) throw new Error('Failed to fetch resume.');
    return res.json();
  },

  async createAnalysis(
    resumeId: string,
    jdText = '',
    jdTitle = 'Target Role',
    jdCompany = 'Target Company'
  ): Promise<AnalysisResultResponse> {
    const res = await fetch(`${API_BASE}/analyses?resume_id=${encodeURIComponent(resumeId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: jdTitle,
        company: jdCompany,
        text: jdText || '',
      }),
    });
    if (!res.ok) throw new Error('Failed to start resume analysis.');
    return res.json();
  },

  async getAnalysis(analysisId: string): Promise<AnalysisResultResponse> {
    const res = await fetch(`${API_BASE}/analyses/${analysisId}`);
    if (!res.ok) throw new Error('Failed to fetch analysis details.');
    return res.json();
  },

  async applySuggestion(suggestionId: string, customText?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/suggestions/${suggestionId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_text: customText || null }),
    });
    if (!res.ok) throw new Error('Failed to apply suggestion.');
  },

  async ignoreSuggestion(suggestionId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/suggestions/${suggestionId}/ignore`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to ignore suggestion.');
  },

  async undoDocument(documentId: string): Promise<{ current_version: number }> {
    const res = await fetch(`${API_BASE}/documents/${documentId}/undo`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Cannot undo further.');
    return res.json();
  },

  async getHtmlPreview(documentId: string): Promise<string> {
    const res = await fetch(`${API_BASE}/documents/${documentId}/html-preview`);
    if (!res.ok) return '';
    return res.text();
  },

  getDownloadUrl(documentId: string): string {
    return `${API_BASE}/documents/${documentId}/download`;
  },

  async enhanceBullet(bulletText: string, targetRole?: string): Promise<string[]> {
    const res = await fetch(`${API_BASE}/analyses/enhance-bullet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bullet_text: bulletText, target_role: targetRole }),
    });
    if (!res.ok) throw new Error('Failed to enhance bullet point.');
    const data = await res.json();
    return data.options || [];
  },

  async generateCoverLetter(resumeId: string, jdText = '', jdTitle = 'Target Role', jdCompany = 'Target Company'): Promise<string> {
    const res = await fetch(`${API_BASE}/analyses/cover-letter?resume_id=${encodeURIComponent(resumeId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: jdTitle, company: jdCompany, text: jdText }),
    });
    if (!res.ok) throw new Error('Failed to generate cover letter.');
    const data = await res.json();
    return data.cover_letter || '';
  },

  async getInterviewPlan(resumeId: string, jdText = '', jdTitle = 'Target Role', jdCompany = 'Target Company'): Promise<InterviewPreparationPlan> {
    const res = await fetch(`${API_BASE}/analyses/interview-plan?resume_id=${encodeURIComponent(resumeId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: jdTitle, company: jdCompany, text: jdText }),
    });
    if (!res.ok) throw new Error('Failed to generate interview preparation plan.');
    return res.json();
  },

  async predictInterviewQuestions(resumeId: string, jdText = '', jdTitle = 'Target Role', jdCompany = 'Target Company'): Promise<Array<{ id: string; category: string; question: string; answer_guide: string }>> {
    const res = await fetch(`${API_BASE}/analyses/interview-questions?resume_id=${encodeURIComponent(resumeId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: jdTitle, company: jdCompany, text: jdText }),
    });
    if (!res.ok) throw new Error('Failed to predict interview questions.');
    const data = await res.json();
    return data.questions || [];
  },
};
