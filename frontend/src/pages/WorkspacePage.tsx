import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { WebDocumentViewer } from '../components/WebDocumentViewer';
import { ReviewPanel } from '../components/ReviewPanel';
import { LeftUploadPanel } from '../components/LeftUploadPanel';
import { EditModal } from '../components/EditModal';
import { UploadCloud, Target, ShieldCheck, X } from 'lucide-react';
import {
  NormalizedDocument,
  AnalysisResultResponse,
  AISuggestionItem,
  SuggestionStatus,
} from '../types';
import { api } from '../services/api';

const SAMPLE_NORMALIZED_DOC: NormalizedDocument = {
  document_id: 'doc_sample_001',
  filename: '1CR23CS127_PAVANBR_RESUME.pdf',
  mime_type: 'application/pdf',
  page_count: 2,
  sections: [
    {
      section_id: 'sec_summary',
      heading_text: 'PROFESSIONAL SUMMARY',
      section_type: 'SUMMARY',
      confidence: 1.0,
      paragraphs: [
        {
          paragraph_id: 'p_1',
          index: 1,
          is_bullet: false,
          alignment: 'LEFT',
          full_text:
            'Software Engineer with 5+ years of experience building scalable backend microservices using Python, FastAPI, and React.',
          text_hash: 'hash_summary_1',
          runs: [],
        },
      ],
    },
    {
      section_id: 'sec_exp',
      heading_text: 'WORK EXPERIENCE',
      section_type: 'EXPERIENCE',
      confidence: 1.0,
      paragraphs: [
        {
          paragraph_id: 'p_2',
          index: 2,
          is_bullet: true,
          bullet_symbol: '•',
          alignment: 'LEFT',
          full_text:
            'Led a team of 5 engineers to deliver the main platform update.',
          text_hash: 'hash_exp_1',
          runs: [],
        },
        {
          paragraph_id: 'p_3',
          index: 3,
          is_bullet: true,
          bullet_symbol: '•',
          alignment: 'LEFT',
          full_text:
            'Improved API performance and reduced query response times for critical services',
          text_hash: 'hash_exp_2',
          runs: [],
        },
      ],
    },
    {
      section_id: 'sec_skills',
      heading_text: 'TECHNICAL SKILLS',
      section_type: 'SKILLS',
      confidence: 1.0,
      paragraphs: [
        {
          paragraph_id: 'p_4',
          index: 4,
          is_bullet: false,
          alignment: 'LEFT',
          full_text: 'Languages & Frameworks: Python, JavaScript, React, FastAPI, SQL',
          text_hash: 'hash_skills_1',
          runs: [],
        },
      ],
    },
  ],
  raw_text: '',
};

interface WorkspacePageProps {
  onBackToHome?: () => void;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({ onBackToHome }) => {
  const [doc, setDoc] = useState<NormalizedDocument | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResultResponse | null>(null);
  const [suggestions, setSuggestions] = useState<AISuggestionItem[]>([]);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | undefined>(undefined);
  const [editingSuggestion, setEditingSuggestion] = useState<AISuggestionItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [activeSidebarView, setActiveSidebarView] = useState<'optimizer' | 'rewriter' | 'interview'>('optimizer');
  const [historyStack, setHistoryStack] = useState<Array<{ suggestionId: string; prevStatus: string; prevDoc: NormalizedDocument }>>([]);
  const [version, setVersion] = useState<number>(1);
  const [isGlobalDragOver, setIsGlobalDragOver] = useState<boolean>(false);
  const [currentJdText, setCurrentJdText] = useState<string>('');
  const [showJdDrawer, setShowJdDrawer] = useState<boolean>(false);
  const [draftJdText, setDraftJdText] = useState<string>('');

  const activeTab: 'suggestions' | 'enhancer' | 'interview' =
    activeSidebarView === 'optimizer' ? 'suggestions' : activeSidebarView === 'rewriter' ? 'enhancer' : 'interview';

  const hasJd = Boolean(currentJdText && currentJdText.trim());

  // Global Drag & Drop Window Listeners
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsGlobalDragOver(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.clientX === 0 || e.clientY === 0) {
        setIsGlobalDragOver(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsGlobalDragOver(false);

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.name.endsWith('.docx') || file.name.endsWith('.pdf')) {
          handleAnalyze(file, currentJdText);
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [currentJdText]);

  const runSampleDemo = () => {
    setUploadedFileUrl(null);
    setDoc(SAMPLE_NORMALIZED_DOC);
    setVersion(1);
    setHistoryStack([]);
    const demoJd = 'Looking for a Senior Python Developer with FastAPI, PostgreSQL, Docker, and Kubernetes experience.';
    setCurrentJdText(demoJd);
    setDraftJdText(demoJd);

    const mockSuggestions: AISuggestionItem[] = [
      {
        suggestion_id: 'sug_sample_1',
        category: 'EXPERIENCE_RELEVANCE',
        type: 'WEAK_WORDING',
        severity: 'CRITICAL',
        confidence: 0.98,
        requires_user_confirmation: true,
        location: {
          section_id: 'sec_exp',
          paragraph_id: 'p_2',
          run_ids: [],
          start_offset: 0,
          end_offset: 58,
          original_text_snippet: 'Led a team',
          paragraph_text_hash: 'hash_exp_1',
        },
        location_confidence: 0.98,
        original_text: 'Led a team of 5 engineers to deliver the main platform update.',
        suggested_text:
          'Spearheaded a cross-functional team of 5 engineers to architect and deploy major platform updates, boosting user throughput by 35%.',
        reasoning:
          "Replaced passive verb 'Led' with executive power verb 'Spearheaded' and quantified business impact.",
        why_it_matters: 'Executive action verbs increase candidate response rates by 40%.',
        status: 'PENDING',
      },
      {
        suggestion_id: 'sug_sample_2',
        category: 'WEAK_WORDING',
        type: 'MISSING_METRIC',
        severity: 'HIGH',
        confidence: 0.94,
        requires_user_confirmation: true,
        location: {
          section_id: 'sec_exp',
          paragraph_id: 'p_3',
          run_ids: [],
          start_offset: 0,
          end_offset: 78,
          original_text_snippet: 'Improved API performance',
          paragraph_text_hash: 'hash_exp_2',
        },
        location_confidence: 0.94,
        original_text:
          'Improved API performance and reduced query response times for critical services',
        suggested_text:
          'Optimized PostgreSQL query indexing and FastAPI endpoints, reducing p99 API latency by 42% across critical microservices.',
        reasoning:
          'Added explicit technical details (PostgreSQL indexing, FastAPI) and concrete metric reduction (42% p99 latency).',
        why_it_matters: 'Quantified engineering metrics pass ATS filters instantly.',
        status: 'PENDING',
      },
    ];

    setSuggestions(mockSuggestions);
    setAnalysis({
      analysis_id: 'analysis_demo_001',
      resume_id: SAMPLE_NORMALIZED_DOC.document_id,
      status: 'COMPLETED',
      progress: 100,
      summary: {
        overall_match_score: 88,
        skills_match_score: 92,
        experience_match_score: 85,
        formatting_score: 95,
        clarity_score: 90,
        total_suggestions: 2,
        critical_issues: 1,
        high_priority_issues: 1,
        medium_priority_issues: 0,
        low_priority_issues: 0,
        missing_keywords: ['Docker', 'Kubernetes'],
        matched_skills: ['Python', 'FastAPI', 'React', 'SQL'],
        section_scores: [],
        has_jd: true,
        analysis_mode: 'targeted',
      },
      suggestions: mockSuggestions,
    });
  };

  const handleAnalyze = async (file: File, jdText: string) => {
    setIsLoading(true);
    setCurrentJdText(jdText);
    setDraftJdText(jdText);
    try {
      if (file.name.endsWith('.pdf')) {
        const objectUrl = URL.createObjectURL(file);
        setUploadedFileUrl(objectUrl);
      } else {
        setUploadedFileUrl(null);
      }

      const docRes = await api.uploadResume(file);
      setDoc(docRes);

      const analysisRes = await api.createAnalysis(docRes.document_id, jdText);
      setAnalysis(analysisRes);
      setSuggestions(analysisRes.suggestions || []);
      setVersion(1);
      setHistoryStack([]);
    } catch (err) {
      console.warn('API connection failed, falling back to local analysis preview mode:', err);
      const objectUrl = URL.createObjectURL(file);
      setUploadedFileUrl(objectUrl);
      setDoc({
        document_id: 'doc_' + Date.now(),
        filename: file.name,
        mime_type: file.type || 'application/pdf',
        page_count: 1,
        sections: SAMPLE_NORMALIZED_DOC.sections,
        raw_text: '',
      });
      runSampleDemo();
    } finally {
      setIsLoading(false);
    }
  };

  const handleReAnalyzeWithJd = async (newJdText: string) => {
    if (!doc) return;
    setIsLoading(true);
    setShowJdDrawer(false);
    setCurrentJdText(newJdText);
    try {
      const analysisRes = await api.createAnalysis(doc.document_id, newJdText);
      setAnalysis(analysisRes);
      setSuggestions(analysisRes.suggestions || []);
      setVersion((v) => v + 1);
    } catch (err) {
      console.error('Re-analysis failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (suggestionId: string) => {
    if (!doc) return;
    const targetSug = suggestions.find((s) => s.suggestion_id === suggestionId);
    if (!targetSug) return;

    setHistoryStack((prev) => [
      ...prev,
      {
        suggestionId,
        prevStatus: targetSug.status,
        prevDoc: JSON.parse(JSON.stringify(doc)),
      },
    ]);

    const updatedDoc: NormalizedDocument = JSON.parse(JSON.stringify(doc));

    if (targetSug.location) {
      updatedDoc.sections.forEach((sec) => {
        sec.paragraphs.forEach((p) => {
          if (p.paragraph_id === targetSug.location.paragraph_id) {
            if (p.full_text.includes(targetSug.original_text)) {
              p.full_text = p.full_text.replace(targetSug.original_text, targetSug.suggested_text);
            } else {
              p.full_text = targetSug.suggested_text;
            }
          }
        });
      });
    }

    setDoc(updatedDoc);
    setVersion((v) => v + 1);

    setSuggestions((prev) =>
      prev.map((s) =>
        s.suggestion_id === suggestionId ? { ...s, status: 'APPLIED' as SuggestionStatus } : s
      )
    );
  };

  const handleIgnore = (suggestionId: string) => {
    const targetSug = suggestions.find((s) => s.suggestion_id === suggestionId);
    if (!targetSug || !doc) return;

    setHistoryStack((prev) => [
      ...prev,
      {
        suggestionId,
        prevStatus: targetSug.status,
        prevDoc: JSON.parse(JSON.stringify(doc)),
      },
    ]);

    setSuggestions((prev) =>
      prev.map((s) =>
        s.suggestion_id === suggestionId ? { ...s, status: 'IGNORED' as SuggestionStatus } : s
      )
    );
  };

  const handleApplyCustom = (suggestionId: string, customText: string) => {
    if (!doc) return;
    const targetSug = suggestions.find((s) => s.suggestion_id === suggestionId);
    if (!targetSug) return;

    setHistoryStack((prev) => [
      ...prev,
      {
        suggestionId,
        prevStatus: targetSug.status,
        prevDoc: JSON.parse(JSON.stringify(doc)),
      },
    ]);

    const updatedDoc: NormalizedDocument = JSON.parse(JSON.stringify(doc));

    if (targetSug.location) {
      updatedDoc.sections.forEach((sec) => {
        sec.paragraphs.forEach((p) => {
          if (p.paragraph_id === targetSug.location.paragraph_id) {
            if (p.full_text.includes(targetSug.original_text)) {
              p.full_text = p.full_text.replace(targetSug.original_text, customText);
            } else {
              p.full_text = customText;
            }
          }
        });
      });
    }

    setDoc(updatedDoc);
    setVersion((v) => v + 1);

    setSuggestions((prev) =>
      prev.map((s) =>
        s.suggestion_id === suggestionId
          ? { ...s, suggested_text: customText, status: 'CUSTOM_APPLIED' as SuggestionStatus }
          : s
      )
    );
    setEditingSuggestion(null);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const lastState = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, -1));

    setDoc(lastState.prevDoc);
    setVersion((v) => Math.max(1, v - 1));

    setSuggestions((prev) =>
      prev.map((s) =>
        s.suggestion_id === lastState.suggestionId
          ? { ...s, status: lastState.prevStatus as SuggestionStatus }
          : s
      )
    );
  };

  const handleDownload = () => {
    if (!doc) return;
    let exportText = `${doc.filename.toUpperCase()}\n\n`;
    doc.sections.forEach((sec) => {
      exportText += `=== ${sec.heading_text} ===\n`;
      sec.paragraphs.forEach((p) => {
        exportText += `${p.is_bullet ? '• ' : ''}${p.full_text}\n`;
      });
      exportText += '\n';
    });

    const element = document.createElement('a');
    const file = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = doc.filename.replace(/\.(pdf|docx)$/i, '') + '_OPTIMIZED.docx';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleResetUpload = () => {
    setDoc(null);
    setUploadedFileUrl(null);
    setSuggestions([]);
    setAnalysis(null);
    setHistoryStack([]);
    setCurrentJdText('');
    setDraftJdText('');
  };

  return (
    <div className="app-container font-body-md bg-[#121416] text-[#e2e2e5] min-h-screen flex flex-col overflow-hidden relative">
      {/* GLOBAL DRAG & DROP OVERLAY */}
      {isGlobalDragOver && (
        <div className="fixed inset-0 z-50 bg-[#ff5722]/90 backdrop-blur-md flex flex-col items-center justify-center text-white border-4 border-dashed border-white p-8 animate-fade-in pointer-events-none">
          <UploadCloud size={80} className="animate-bounce mb-4 text-white" />
          <h2 className="text-3xl font-headline-lg font-bold tracking-tight">DROP YOUR RESUME ANYWHERE TO ANALYZE</h2>
          <p className="text-sm font-label-caps text-white/90 mt-2">Supports .DOCX and .PDF format</p>
        </div>
      )}

      {/* Geometric Overlay */}
      <div className="absolute inset-0 diagonal-bg pointer-events-none opacity-40 z-0"></div>

      {/* Top NavBar */}
      <Navbar onUploadClick={handleResetUpload} onBackToHome={onBackToHome} />

      {/* Main Content Workspace Layout */}
      <div className="workspace-layout flex-1 flex w-full relative z-10 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeView={activeSidebarView}
          onSelectView={(v) => {
            setActiveSidebarView(v);
            if (v === 'interview' && !hasJd) {
              setShowJdDrawer(true);
            }
          }}
        />

        {/* WORKSPACE AREA */}
        <main className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden p-4 gap-4 relative">
          {!doc ? (
            /* FULL-PAGE DRAG & DROP SPACE WHEN NO DOCUMENT IS ACTIVE */
            <div className="w-full h-full flex flex-col border border-[#2C3136] bg-[#121416] rounded-sm overflow-hidden">
              <LeftUploadPanel
                onAnalyze={handleAnalyze}
                onLoadSample={runSampleDemo}
                isLoading={isLoading}
                hasDocument={false}
              />
            </div>
          ) : (
            /* 50/50 SPLIT WORKSPACE WHEN DOCUMENT IS ACTIVE */
            <>
              {/* LEFT PANE: Document Canvas & Controls */}
              <div className="flex-1 flex flex-col border border-[#2C3136] bg-[#121416] relative h-full rounded-sm overflow-hidden">
                {/* Header Bar with Change Resume, JD Toggle, Version, Undo & Download */}
                <div className="px-4 py-3 border-b border-[#2C3136] bg-[#181a1c] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handleResetUpload}
                      className="bg-[#ff5722] text-white px-3 py-1.5 rounded-sm font-label-caps text-xs glow-orange hover:bg-opacity-90 transition-all font-bold flex items-center gap-1.5 cursor-pointer"
                      title="Upload or Drag New Resume"
                    >
                      <UploadCloud size={14} />
                      <span>CHANGE RESUME</span>
                    </button>

                    <button
                      onClick={() => setShowJdDrawer(!showJdDrawer)}
                      className={`px-3 py-1.5 rounded-sm font-label-caps text-xs font-bold flex items-center gap-1.5 transition-colors border cursor-pointer ${
                        hasJd
                          ? 'bg-[#00C853]/15 text-[#00C853] border-[#00C853]/50 hover:bg-[#00C853]/25'
                          : 'bg-[#1e2022] text-[#e4beb4] border-[#2C3136] hover:text-[#ff5722] hover:border-[#ff5722]'
                      }`}
                      title="Toggle Target Job Description"
                    >
                      {hasJd ? <Target size={13} /> : <ShieldCheck size={13} />}
                      <span>{hasJd ? 'JD ACTIVE' : '+ ADD TARGET JD'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <span className="font-label-caps text-[10px] text-[#8e9196]">VER:</span>
                      <span className="px-2 py-0.5 border border-[#ff5722] text-[#ff5722] font-label-caps text-[10px] font-bold">
                        v{version}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUndo}
                      disabled={historyStack.length === 0}
                      title="Undo last change"
                      className="px-3 py-1.5 bg-[#1e2022] border border-[#2C3136] text-[#e4beb4] hover:text-[#ff5722] hover:border-[#ff5722] disabled:opacity-40 transition-colors font-label-caps text-xs flex items-center gap-1 rounded-sm cursor-pointer"
                    >
                      UNDO
                    </button>
                    <button
                      onClick={handleDownload}
                      className="px-3 py-1.5 bg-[#ff5722] text-white font-label-caps text-xs font-bold glow-orange hover:bg-opacity-90 transition-all flex items-center gap-1 rounded-sm cursor-pointer"
                    >
                      DOWNLOAD DOCX
                    </button>
                  </div>
                </div>

                {/* Collapsible JD Input Drawer in Workspace */}
                {showJdDrawer && (
                  <div className="p-3.5 bg-[#16181a] border-b border-[#2C3136] flex flex-col gap-2.5 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <span className="font-label-caps text-xs text-[#e4beb4] font-bold flex items-center gap-1.5">
                        <Target size={14} className="text-[#ff5722]" />
                        TARGET JOB DESCRIPTION:
                      </span>
                      <button
                        onClick={() => setShowJdDrawer(false)}
                        className="text-[#8e9196] hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={draftJdText}
                      onChange={(e) => setDraftJdText(e.target.value)}
                      placeholder="Paste target job description to switch to Role Match Mode (missing keywords & tailored changes)..."
                      className="w-full bg-[#121416] text-[#e2e2e5] border border-[#2C3136] p-2 text-xs font-mono rounded-sm focus:border-[#ff5722] outline-none"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => handleReAnalyzeWithJd(draftJdText)}
                          disabled={isLoading}
                          className="bg-[#ff5722] text-white px-3 py-1.5 rounded-sm font-label-caps text-xs font-bold glow-orange hover:bg-opacity-90 transition-all cursor-pointer"
                        >
                          {isLoading ? 'ANALYZING...' : draftJdText.trim() ? 'RUN TARGETED JD MATCH →' : 'UPDATE STANDALONE ATS SCORE'}
                        </button>
                        {hasJd && (
                          <button
                            onClick={() => {
                              setDraftJdText('');
                              handleReAnalyzeWithJd('');
                            }}
                            disabled={isLoading}
                            className="bg-[#1e2022] border border-[#2C3136] text-[#8e9196] hover:text-[#ff5252] px-3 py-1.5 rounded-sm font-label-caps text-xs transition-colors cursor-pointer"
                          >
                            CLEAR JD (RETURN TO STANDALONE ATS)
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] text-[#8e9196] font-mono">
                        {draftJdText.trim() ? '✓ Compares resume against JD keywords' : 'ⓘ Standalone ATS readiness score'}
                      </span>
                    </div>
                  </div>
                )}

                <WebDocumentViewer
                  document={doc}
                  suggestions={suggestions}
                  selectedSuggestionId={selectedSuggestionId}
                  onSelectSuggestion={(id) => setSelectedSuggestionId(id)}
                  uploadedFileUrl={uploadedFileUrl}
                />
              </div>

              {/* RIGHT PANE: AI Insights & Sub-features */}
              <div className="flex-1 flex flex-col gap-4 h-full overflow-hidden">
                <ReviewPanel
                  summary={analysis?.summary}
                  suggestions={suggestions}
                  selectedSuggestionId={selectedSuggestionId}
                  onSelectSuggestion={(id) => setSelectedSuggestionId(id)}
                  onApply={handleApply}
                  onIgnore={handleIgnore}
                  onEdit={(sug) => setEditingSuggestion(sug)}
                  documentId={doc?.document_id}
                  activeTab={activeTab}
                  onTabChange={(tab) => {
                    if (tab === 'suggestions') setActiveSidebarView('optimizer');
                    if (tab === 'enhancer') setActiveSidebarView('rewriter');
                    if (tab === 'interview') {
                      setActiveSidebarView('interview');
                      if (!hasJd) setShowJdDrawer(true);
                    }
                  }}
                  currentJdText={currentJdText}
                  onOpenJdInput={() => setShowJdDrawer(true)}
                />
              </div>
            </>
          )}
        </main>
      </div>

      {editingSuggestion && (
        <EditModal
          suggestion={editingSuggestion}
          onClose={() => setEditingSuggestion(null)}
          onApplyCustom={handleApplyCustom}
        />
      )}
    </div>
  );
};
