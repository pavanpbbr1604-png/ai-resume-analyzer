import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { WebDocumentViewer } from '../components/WebDocumentViewer';
import { ReviewPanel } from '../components/ReviewPanel';
import { LeftUploadPanel, LeftUploadPanelHandle } from '../components/LeftUploadPanel';
import { EditModal } from '../components/EditModal';
import { UploadCloud, Target, ShieldCheck, X, AlertTriangle, ArrowLeft } from 'lucide-react';
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
      section_id: 'sec_projects',
      heading_text: 'KEY PROJECTS',
      section_type: 'PROJECTS',
      confidence: 1.0,
      paragraphs: [
        {
          paragraph_id: 'p_proj_1',
          index: 5,
          is_bullet: false,
          alignment: 'LEFT',
          full_text: 'Crowd Density Estimation System | YOLOv8, PyTorch, OpenCV',
          text_hash: 'hash_proj_1',
          runs: [],
        },
        {
          paragraph_id: 'p_proj_2',
          index: 6,
          is_bullet: true,
          bullet_symbol: '•',
          alignment: 'LEFT',
          full_text: 'Used YOLOv8 to detect people in crowded environments.',
          text_hash: 'hash_proj_2',
          runs: [],
        },
        {
          paragraph_id: 'p_proj_3',
          index: 7,
          is_bullet: false,
          alignment: 'LEFT',
          full_text: 'E-Commerce Platform | PHP, MySQL, JavaScript',
          text_hash: 'hash_proj_3',
          runs: [],
        },
        {
          paragraph_id: 'p_proj_4',
          index: 8,
          is_bullet: true,
          bullet_symbol: '•',
          alignment: 'LEFT',
          full_text: 'Made an ecommerce website using PHP.',
          text_hash: 'hash_proj_4',
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
  const [activeSidebarView, setActiveSidebarView] = useState<'optimizer' | 'assistant' | 'rewriter' | 'interview'>('optimizer');
  const [activeSuggestionForChat, setActiveSuggestionForChat] = useState<AISuggestionItem | null>(null);
  const [historyStack, setHistoryStack] = useState<Array<{ suggestionId: string; prevStatus: string; prevDoc: NormalizedDocument }>>([]);
  const [version, setVersion] = useState<number>(1);
  const [isGlobalDragOver, setIsGlobalDragOver] = useState<boolean>(false);
  const [currentJdText, setCurrentJdText] = useState<string>('');
  const [showJdDrawer, setShowJdDrawer] = useState<boolean>(false);
  const [draftJdText, setDraftJdText] = useState<string>('');

  // --- No-JD Popup state ---
  const [showNoJdPopup, setShowNoJdPopup] = useState<boolean>(false);
  const [pendingAnalysisFile, setPendingAnalysisFile] = useState<File | null>(null);

  // Ref to the upload panel so popup "Go Back" can focus the JD textarea.
  const uploadPanelRef = useRef<LeftUploadPanelHandle>(null);

  const activeTab: 'suggestions' | 'chat' | 'enhancer' | 'interview' =
    activeSidebarView === 'optimizer'
      ? 'suggestions'
      : activeSidebarView === 'assistant'
      ? 'chat'
      : activeSidebarView === 'rewriter'
      ? 'enhancer'
      : 'interview';


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
          // If a JD is already present, analyze immediately (explicit user intent).
          // Otherwise, show the No-JD popup to ask the user what they want.
          if (currentJdText && currentJdText.trim()) {
            handleAnalyze(file, currentJdText, true);
          } else {
            setPendingAnalysisFile(file);
            setShowNoJdPopup(true);
          }
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
        category: 'CONTENT_RELEVANCE',
        type: 'PROJECT_DESCRIPTION',
        severity: 'HIGH',
        confidence: 0.98,
        requires_user_confirmation: true,
        location: {
          section_id: 'sec_projects',
          paragraph_id: 'p_proj_2',
          run_ids: [],
          start_offset: 0,
          end_offset: 54,
          original_text_snippet: 'Used YOLOv8 to detect people',
          paragraph_text_hash: 'hash_proj_2',
          location_label: 'Project: Crowd Density Estimation',
        },
        location_confidence: 0.98,
        location_label: 'Project: Crowd Density Estimation',
        original_text: 'Used YOLOv8 to detect people in crowded environments.',
        suggested_text:
          'Implemented YOLOv8-based person detection for real-time crowd analysis.',
        reasoning:
          'The revised version is more specific and uses stronger action-oriented wording.',
        why_it_matters: 'Precise technical terminology clearly communicates engineering ownership to recruiters.',
        status: 'PENDING',
      },
      {
        suggestion_id: 'sug_sample_2',
        category: 'CONTENT_RELEVANCE',
        type: 'PROJECT_DESCRIPTION',
        severity: 'HIGH',
        confidence: 0.95,
        requires_user_confirmation: true,
        location: {
          section_id: 'sec_projects',
          paragraph_id: 'p_proj_4',
          run_ids: [],
          start_offset: 0,
          end_offset: 35,
          original_text_snippet: 'Made an ecommerce website',
          paragraph_text_hash: 'hash_proj_4',
          location_label: 'Project: E-Commerce Platform',
        },
        location_confidence: 0.95,
        location_label: 'Project: E-Commerce Platform',
        original_text: 'Made an ecommerce website using PHP.',
        suggested_text:
          'Developed a full-stack e-commerce platform using PHP and MySQL with an admin dashboard and payment integration.',
        reasoning:
          'The original statement is too vague and does not communicate the scope of the project.',
        why_it_matters: 'Communicating complete stack scope and end-to-end features distinguishes your technical profile.',
        status: 'PENDING',
      },
      {
        suggestion_id: 'sug_sample_3',
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
          location_label: 'Experience: Platform Engineering',
        },
        location_confidence: 0.98,
        location_label: 'Experience: Platform Engineering',
        original_text: 'Led a team of 5 engineers to deliver the main platform update.',
        suggested_text:
          'Spearheaded a cross-functional team of 5 engineers to architect and deploy major platform updates, boosting user throughput by 35%.',
        reasoning:
          "Replaced passive verb 'Led' with executive power verb 'Spearheaded' and quantified business impact.",
        why_it_matters: 'Executive action verbs increase candidate response rates by 40%.',
        status: 'PENDING',
      },
      {
        suggestion_id: 'sug_sample_4',
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
          location_label: 'Experience: Backend Optimization',
        },
        location_confidence: 0.94,
        location_label: 'Experience: Backend Optimization',
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
        ats_score: 84,
        ats_breakdown: {
          parseability: 90,
          standard_sections: 85,
          contact_info: 100,
          skills_inventory: 80,
          experience_projects: 75,
          formatting_safety: 70,
          content_optimization: 80,
        },
        jd_match_score: 88,
        jd_match_breakdown: {
          required_skills: 85,
          preferred_skills: 80,
          technical_keywords: 90,
          semantic_similarity: 88,
          experience_match: 90,
          education_match: 100,
          projects_experience: 85,
        },
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
        missing_required_skills: ['Docker', 'Kubernetes'],
        missing_preferred_skills: [],
        section_scores: [],
        has_jd: true,
        analysis_mode: 'targeted',
      },
      suggestions: mockSuggestions,
    });
  };

  /**
   * Primary analysis entry point.
   * When called from the upload panel and jdText is empty, shows the No-JD popup
   * unless `continueWithoutJd` is explicitly true (e.g. popup confirmed).
   */
  const handleAnalyze = async (file: File, jdText: string, continueWithoutJd = false) => {
    const hasJdInput = Boolean(jdText && jdText.trim());

    // If no JD and not yet confirmed via popup, show popup.
    if (!hasJdInput && !continueWithoutJd) {
      setPendingAnalysisFile(file);
      setShowNoJdPopup(true);
      return;
    }

    // Close popup if open and clear pending file.
    setShowNoJdPopup(false);
    setPendingAnalysisFile(null);

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

  /** Popup "Go Back / Add JD" — closes popup and focuses JD textarea in upload panel. */
  const handleNoJdGoBack = () => {
    setShowNoJdPopup(false);
    uploadPanelRef.current?.focusJdInput();
  };

  /** Popup "Continue Without JD" — runs standalone ATS analysis. */
  const handleNoJdContinue = () => {
    if (pendingAnalysisFile) {
      handleAnalyze(pendingAnalysisFile, '', true);
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
      {/* NO-JD CONFIRMATION POPUP */}
      {showNoJdPopup && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowNoJdPopup(false); }}
        >
          <div className="relative w-full max-w-md bg-[#1a1c1e] border border-[#2C3136] rounded-sm shadow-2xl flex flex-col gap-4 p-6 animate-fade-in">
            {/* Close */}
            <button
              onClick={() => setShowNoJdPopup(false)}
              className="absolute top-3 right-3 text-[#8e9196] hover:text-white transition-colors cursor-pointer"
              aria-label="Close popup"
            >
              <X size={16} />
            </button>

            {/* Icon + Heading */}
            <div className="flex flex-col items-center gap-2.5 text-center">
              <div className="w-12 h-12 rounded-full bg-[#ff9100]/15 border border-[#ff9100]/40 flex items-center justify-center">
                <AlertTriangle size={24} className="text-[#ff9100]" />
              </div>
              <div>
                <h2 className="font-headline-lg text-lg text-white font-bold tracking-tight">
                  No Job Description Added
                </h2>
                <p className="text-xs text-[#e4beb4] mt-1.5 leading-relaxed max-w-sm mx-auto">
                  Add a job description for role-targeted matching, or continue with a general ATS review.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 mt-1">
              <button
                id="popup-go-back-btn"
                onClick={handleNoJdGoBack}
                className="w-full flex items-center justify-center gap-2 bg-[#1e2022] border border-[#ff5722] text-[#ff5722] py-2.5 rounded-sm font-label-caps text-xs font-bold hover:bg-[#ff5722]/10 transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                + ADD JOB DESCRIPTION
              </button>
              <button
                id="popup-continue-btn"
                onClick={handleNoJdContinue}
                className="w-full flex items-center justify-center gap-2 bg-[#ff5722] text-white py-2.5 rounded-sm font-label-caps text-xs font-bold glow-orange hover:bg-opacity-90 transition-all cursor-pointer"
              >
                <ShieldCheck size={14} />
                CONTINUE WITH GENERAL REVIEW
              </button>
            </div>

            <p className="text-center text-[10px] font-mono text-[#8e9196]">
              You can add a Job Description anytime later in the workspace.
            </p>
          </div>
        </div>
      )}

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
                ref={uploadPanelRef}
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
                      placeholder="Paste target job description here..."
                      className="w-full bg-[#121416] text-[#e2e2e5] border border-[#2C3136] p-2 text-xs font-mono rounded-sm focus:border-[#ff5722] outline-none"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => handleReAnalyzeWithJd(draftJdText)}
                          disabled={isLoading}
                          className="bg-[#ff5722] text-white px-3 py-1.5 rounded-sm font-label-caps text-xs font-bold glow-orange hover:bg-opacity-90 transition-all cursor-pointer"
                        >
                          {isLoading ? 'ANALYZING...' : draftJdText.trim() ? 'RUN ROLE MATCH →' : 'UPDATE REVIEW'}
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
                            CLEAR JD
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] text-[#8e9196] font-mono">
                        {draftJdText.trim() ? '✓ Targeted role match' : 'ⓘ General review'}
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
                  document={doc}
                  activeTab={activeTab}
                  onTabChange={(tab) => {
                    if (tab === 'suggestions') setActiveSidebarView('optimizer');
                    if (tab === 'chat') setActiveSidebarView('assistant');
                    if (tab === 'enhancer') setActiveSidebarView('rewriter');
                    if (tab === 'interview') {
                      setActiveSidebarView('interview');
                      if (!hasJd) setShowJdDrawer(true);
                    }
                  }}
                  activeSuggestionForChat={activeSuggestionForChat}
                  onSelectSuggestionForChat={(sug) => setActiveSuggestionForChat(sug)}
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
