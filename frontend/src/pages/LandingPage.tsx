import React, { useState, useEffect, useRef } from 'react';
import { useTypewriter } from '../hooks/useTypewriter';
import { BLOG_POSTS, BlogPost } from '../data/blogData';
import { ArrowRight, X, Clock, User } from 'lucide-react';

interface LandingPageProps {
  onLaunchApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchApp }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Video scrub control state & refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const targetTimeRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  const prevXRef = useRef<number | null>(null);
  const blogSectionRef = useRef<HTMLDivElement | null>(null);

  // Typewriter hook setup tailored for LUMIER AI Resume Analyzer
  const { displayed, done } = useTypewriter({
    text: 'All eyes on your resume. Zero ATS filters in your way. What role are we securing today?',
    speed: 38,
    startDelay: 600,
  });

  // Mouse movement video scrubbing setup according to exact specification
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const video = videoRef.current;
      if (!video || !video.duration || isNaN(video.duration)) return;

      if (prevXRef.current === null) {
        prevXRef.current = e.clientX;
        return;
      }

      const delta = e.clientX - prevXRef.current;
      prevXRef.current = e.clientX;

      const SENSITIVITY = 0.8;
      const timeOffset = (delta / window.innerWidth) * SENSITIVITY * video.duration;
      let newTarget = targetTimeRef.current + timeOffset;
      newTarget = Math.max(0, Math.min(video.duration, newTarget));
      targetTimeRef.current = newTarget;

      if (!isSeekingRef.current) {
        isSeekingRef.current = true;
        video.currentTime = targetTimeRef.current;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleSeeked = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    if (Math.abs(video.currentTime - targetTimeRef.current) > 0.02) {
      video.currentTime = targetTimeRef.current;
    } else {
      isSeekingRef.current = false;
    }
  };

  const scrollToBlog = () => {
    if (blogSectionRef.current) {
      blogSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const filteredPosts = BLOG_POSTS.filter((post) => {
    if (activeCategory === 'ALL') return true;
    return post.category.includes(activeCategory);
  });

  return (
    <div
      className="relative w-full min-h-screen bg-[#121416] text-[#e2e2e5] select-none overflow-x-hidden"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {/* BACKGROUND VIDEO (mouse-scrub controlled) */}
      <video
        ref={videoRef}
        onSeeked={handleSeeked}
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4"
        className="fixed inset-0 z-0 object-cover w-full h-full pointer-events-none opacity-85"
        style={{ objectPosition: '70% center' }}
        muted
        playsInline
        preload="auto"
      />

      {/* NAVBAR (fixed, z-index: 10) */}
      <nav className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5 w-full backdrop-blur-md bg-black/10 border-b border-black/10">
        {/* Left: Engineering Blog shortcut */}
        <div className="flex items-center">
          <button
            onClick={scrollToBlog}
            className="text-[14px] sm:text-[16px] text-black font-medium hover:opacity-60 transition-opacity bg-transparent border-0 cursor-pointer"
          >
            Engineering Blog ↗
          </button>
        </div>

        {/* Center Logo: LUMIER® ✳︎ */}
        <div
          onClick={onLaunchApp}
          className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2 cursor-pointer group"
          title="Launch LUMIER AI Workspace"
        >
          <span
            className="text-[22px] sm:text-[28px] tracking-tight text-black group-hover:opacity-75 transition-opacity font-bold"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            LUMIER®
          </span>
          <span
            className="text-[26px] sm:text-[32px] text-black select-none"
            style={{ letterSpacing: '-0.02em' }}
          >
            ✳︎
          </span>
        </div>

        {/* Right: Launch Workspace CTA */}
        <div className="hidden sm:flex items-center gap-4">
          <button
            onClick={onLaunchApp}
            className="bg-[#ff5722] text-white px-5 py-2 rounded-full font-label-caps text-xs glow-orange hover:bg-opacity-90 transition-all font-bold cursor-pointer"
          >
            START COOKING... →
          </button>
        </div>

        {/* Mobile Hamburger Button (visible below md) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex flex-col justify-center items-center gap-[5px] w-8 h-8 md:hidden z-20 bg-transparent border-0 cursor-pointer"
          aria-label="Toggle menu"
        >
          <span
            className={`w-6 h-[2px] bg-black transition-all duration-300 ${
              mobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
            }`}
          />
          <span
            className={`w-6 h-[2px] bg-black transition-opacity duration-300 ${
              mobileMenuOpen ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <span
            className={`w-6 h-[2px] bg-black transition-all duration-300 ${
              mobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
            }`}
          />
        </button>
      </nav>

      {/* MOBILE OVERLAY (z-index: 9) */}
      <div
        className={`fixed inset-0 z-9 bg-white/95 backdrop-blur-sm flex flex-col justify-center px-8 gap-8 md:hidden transition-all duration-300 ${
          mobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        {['ATS Optimizer', 'AI Rewriter', 'Interview Prep'].map((item) => (
          <button
            key={item}
            onClick={() => {
              setMobileMenuOpen(false);
              onLaunchApp();
            }}
            className="text-[32px] font-medium text-left text-black hover:opacity-60 transition-opacity bg-transparent border-0 cursor-pointer"
          >
            {item}
          </button>
        ))}
        <button
          onClick={() => {
            setMobileMenuOpen(false);
            scrollToBlog();
          }}
          className="text-[32px] font-medium text-left text-black hover:opacity-60 transition-opacity bg-transparent border-0 cursor-pointer"
        >
          Engineering Blog
        </button>
        <button
          onClick={() => {
            setMobileMenuOpen(false);
            onLaunchApp();
          }}
          className="text-[32px] font-medium text-left text-black underline underline-offset-4 hover:opacity-60 transition-opacity bg-transparent border-0 cursor-pointer"
        >
          Start Cooking...
        </button>
      </div>

      {/* HERO SECTION (z-index: 1) */}
      <section className="relative z-1 flex flex-col h-screen justify-end pb-12 md:justify-center md:pb-0 px-5 sm:px-8 md:px-10 overflow-hidden">
        <div className="max-w-xl relative z-10">
          {/* 1. Blurred intro label */}
          <div
            className="pointer-events-none select-none mb-5 sm:mb-6 text-black font-normal"
            style={{
              fontSize: 'clamp(18px, 4vw, 26px)',
              lineHeight: 1.3,
              filter: 'blur(4px)',
            }}
          >
            Hey there, meet LUMIER AI,
            <br />
            Main character energy for your resume.
          </div>

          {/* 2. Typewriter text */}
          <p
            className="text-black mb-5 sm:mb-6 font-normal min-h-[54px]"
            style={{
              fontSize: 'clamp(18px, 4vw, 26px)',
              lineHeight: 1.35,
            }}
          >
            {displayed}
            {!done && (
              <span
                className="inline-block w-[2px] h-[1.1em] bg-black align-middle ml-[2px]"
                style={{ animation: 'blink 1s step-end infinite' }}
              />
            )}
          </p>
        </div>
      </section>

      {/* BLOG & CASE STUDIES SECTION (z-index: 10) */}
      <section
        ref={blogSectionRef}
        className="relative z-10 bg-[#121416]/95 border-t border-[#2C3136] py-20 px-5 sm:px-10 lg:px-16 text-[#e2e2e5] backdrop-blur-xl"
      >
        <div className="max-w-6xl mx-auto flex flex-col gap-12">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#2C3136] pb-8">
            <div>
              <div className="text-[#ff5722] font-label-caps text-xs tracking-wider mb-2 font-bold">
                LUMIER LABS — ENGINEERING & RESUME INTELLIGENCE
              </div>
              <h2 className="font-headline-lg text-3xl sm:text-4xl text-white font-bold tracking-tight">
                Architectural Insights & Technical Deep Dives
              </h2>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {['ALL', 'AI', 'DOCUMENT', 'ATS', 'CONCURRENCY', 'FRONTEND'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 font-label-caps text-xs border rounded-full transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === cat
                    ? 'bg-[#ff5722] text-white border-[#ff5722] font-bold glow-orange'
                    : 'bg-[#1a1c1e] text-[#e4beb4] border-[#2C3136] hover:border-[#ff5722] hover:text-white'
                }`}
              >
                {cat === 'ALL' ? 'ALL ARTICLES' : cat}
              </button>
            ))}
          </div>

          {/* Article Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="group border border-[#2C3136] bg-[#1a1c1e] p-6 rounded-sm flex flex-col justify-between gap-6 hover:border-[#ff5722] transition-all cursor-pointer shadow-lg hover:shadow-2xl"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center text-[10px] font-label-caps">
                    <span className="text-[#ff5722] font-bold border border-[#ff5722]/30 px-2 py-0.5 rounded-sm bg-[#ff5722]/10">
                      {post.category}
                    </span>
                    <span className="text-[#e4beb4] flex items-center gap-1">
                      <Clock size={12} />
                      {post.readTime}
                    </span>
                  </div>

                  <h3 className="font-headline-md text-lg text-white font-bold group-hover:text-[#ff5722] transition-colors leading-snug">
                    {post.title}
                  </h3>

                  <p className="font-body-md text-xs text-[#e4beb4] leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#2C3136] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] text-[#e4beb4]">
                    <User size={12} className="text-[#ff5722]" />
                    <span>{post.author}</span>
                  </div>
                  <span className="text-xs font-label-caps text-[#ff5722] group-hover:translate-x-1 transition-transform flex items-center gap-1 font-bold">
                    READ ARTICLE <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Banner Launch Workspace CTA */}
          <div className="border border-[#ff5722]/40 bg-gradient-to-r from-[#ff5722]/20 via-[#1a1c1e] to-[#121416] p-8 rounded-sm flex flex-col md:flex-row items-center justify-between gap-6 mt-6 shadow-xl">
            <div className="flex flex-col gap-2">
              <h3 className="font-headline-md text-xl text-white font-bold">
                Ready to optimize your resume with AI?
              </h3>
              <p className="font-body-md text-xs text-[#e4beb4]">
                Upload your DOCX or PDF resume to get 1-click ATS replacements, skill heatmaps, and side-by-side editing live.
              </p>
            </div>
            <button
              onClick={onLaunchApp}
              className="bg-[#ff5722] text-white px-8 py-3 rounded-sm font-label-caps text-xs font-bold glow-orange hover:bg-opacity-90 transition-all whitespace-nowrap cursor-pointer"
            >
              START COOKING... →
            </button>
          </div>
        </div>
      </section>

      {/* FULL ARTICLE MODAL READER */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#1a1c1e] border border-[#2C3136] w-full max-w-3xl max-h-[90vh] rounded-sm flex flex-col overflow-hidden shadow-2xl relative">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#2C3136] bg-[#121416] flex justify-between items-start gap-4">
              <div>
                <span className="text-[#ff5722] font-label-caps text-[10px] font-bold border border-[#ff5722]/30 px-2 py-0.5 rounded-sm bg-[#ff5722]/10 mb-2 inline-block">
                  {selectedPost.category}
                </span>
                <h2 className="font-headline-lg text-2xl text-white font-bold leading-tight">
                  {selectedPost.title}
                </h2>
                <div className="flex items-center gap-4 text-xs text-[#e4beb4] mt-2 font-label-caps">
                  <span>By {selectedPost.author} ({selectedPost.authorRole})</span>
                  <span>•</span>
                  <span>{selectedPost.date}</span>
                  <span>•</span>
                  <span>{selectedPost.readTime}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="text-[#e4beb4] hover:text-white p-2 rounded-full hover:bg-[#282a2c] transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Article Content Body */}
            <div className="p-6 overflow-y-auto flex-1 font-body-md text-xs sm:text-sm text-[#e2e2e5] leading-relaxed flex flex-col gap-4">
              {selectedPost.content.split('\n\n').map((paragraph, idx) => {
                if (paragraph.startsWith('### ')) {
                  return (
                    <h3 key={idx} className="font-headline-md text-lg text-[#ffb5a0] font-bold mt-4 mb-1">
                      {paragraph.replace('### ', '')}
                    </h3>
                  );
                }
                if (paragraph.startsWith('#### ')) {
                  return (
                    <h4 key={idx} className="font-headline-md text-md text-[#ff5722] font-bold mt-3 mb-1">
                      {paragraph.replace('#### ', '')}
                    </h4>
                  );
                }
                if (paragraph.startsWith('```')) {
                  return (
                    <pre key={idx} className="bg-[#121416] border border-[#2C3136] p-4 rounded-sm font-mono text-xs text-[#00C853] overflow-x-auto my-2">
                      {paragraph.replace(/```(python|json|xml)?/g, '').trim()}
                    </pre>
                  );
                }
                if (paragraph.startsWith('- ')) {
                  return (
                    <ul key={idx} className="list-disc pl-5 flex flex-col gap-1 text-[#e4beb4]">
                      {paragraph.split('\n').map((li, lIdx) => (
                        <li key={lIdx}>{li.replace('- ', '')}</li>
                      ))}
                    </ul>
                  );
                }
                return <p key={idx} className="text-[#e2e2e5] leading-relaxed">{paragraph}</p>;
              })}
            </div>

            {/* Modal Footer CTA */}
            <div className="p-4 border-t border-[#2C3136] bg-[#121416] flex justify-between items-center gap-4">
              <div className="flex gap-2">
                {selectedPost.tags.map((tag) => (
                  <span key={tag} className="text-[10px] font-label-caps border border-[#2C3136] px-2 py-0.5 text-[#e4beb4]">
                    #{tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => {
                  setSelectedPost(null);
                  onLaunchApp();
                }}
                className="bg-[#ff5722] text-white px-6 py-2 rounded-sm font-label-caps text-xs font-bold glow-orange hover:bg-opacity-90 transition-all cursor-pointer"
              >
                TRY LIVE IN WORKSPACE →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
