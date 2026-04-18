import { Award, BookOpen, ExternalLink, Github, Heart, Linkedin, Sparkles, Target, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <div className="bg-[var(--color-bg)] animate-fade-in">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-radial from-blue-100/60 via-indigo-50/20 to-transparent dark:from-blue-900/15 dark:to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-[var(--color-primary)] text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
              <BookOpen size={13} /> About ExamPrep AI
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--color-text)] mb-5 tracking-tight leading-tight">
              Built for learners<br />
              <span className="text-[var(--color-primary)]">who deserve better</span>
            </h1>
            <p className="text-[var(--color-text-muted)] text-lg max-w-2xl mx-auto leading-relaxed">
              ExamPrep AI is an AI-powered platform helping students and professionals master any subject through intelligent MCQ generation, proctoring, analytics, and verified certificates — free.
            </p>
          </div>

          {/* Mission cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
            {[
              { icon: Zap, title: 'Our Mission', desc: 'Democratize quality exam preparation by making AI-powered practice accessible to everyone, everywhere.', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
              { icon: Target, title: 'Our Vision', desc: 'A world where every learner has a personalized AI tutor that identifies gaps and accelerates mastery.', color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600' },
              { icon: Heart, title: 'Why We Built It', desc: 'Quality exam prep platforms are expensive. We built ExamPrep AI so cost is never a barrier to growth.', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' },
              { icon: Award, title: 'What We Offer', desc: 'AI exams, proctoring, analytics, flashcards, gamification, certificates, and instructor tools — free to start.', color: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
            ].map((item) => (
              <div key={item.title} className="card hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-4`}>
                  <item.icon size={18} />
                </div>
                <h3 className="font-bold text-[var(--color-text)] mb-2">{item.title}</h3>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* ── Creator section (light theme) ── */}
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-lg bg-[var(--color-surface)]">

              {/* Header — light blue gradient */}
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-white dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-[var(--color-surface)] px-8 py-10 border-b border-[var(--color-border)]">
                <div className="flex flex-col sm:flex-row items-center gap-7">
                  {/* Profile photo */}
                  <div className="shrink-0 relative">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-white dark:ring-[var(--color-border)] shadow-lg">
                      <img
                        src="https://media.licdn.com/dms/image/v2/D5603AQFaxyPAi48gLQ/profile-displayphoto-crop_800_800/B56ZkizQFRI8AI-/0/1757225485770?e=1778112000&v=beta&t=EYVY5oRHurjaBmnANG4frMXqqidHeOF-OXsgFAReFZk"
                        alt="Abbas Haider"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="w-full h-full bg-[var(--color-primary)]/10 items-center justify-center text-3xl font-bold text-[var(--color-primary)] hidden">A</div>
                    </div>
                    <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-[var(--color-primary)] rounded-full flex items-center justify-center shadow">
                      <Sparkles size={13} className="text-white" />
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="text-center sm:text-left flex-1">
                    <div className="inline-flex items-center gap-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold px-3 py-1 rounded-full mb-2">
                      Creator & Developer
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--color-text)] mb-0.5">Abbas Haider</h2>
                    <p className="text-[var(--color-text-muted)] text-sm mb-4">Software Developer · Web Development · Cyber Security</p>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      <a
                        href="https://www.linkedin.com/in/abbashaider14/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-[#0077B5] hover:bg-[#006399] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
                      >
                        <Linkedin size={13} /> LinkedIn <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Story */}
              <div className="px-8 py-8">
                <h3 className="text-lg font-bold text-[var(--color-text)] mb-4">The Story Behind ExamPrep AI</h3>
                <div className="space-y-3 text-sm text-[var(--color-text-muted)] leading-relaxed">
                  <p>
                    Abbas Haider is a software developer with <strong className="text-[var(--color-text)]">4 years of experience</strong> in full-stack web development. He is currently expanding his expertise into <strong className="text-[var(--color-text)]">Cyber Security</strong> at CRAW Security Institute.
                  </p>
                  <p>
                    He created ExamPrep AI after recognizing that many learners around the world cannot afford expensive platforms to test and improve their knowledge. His goal: build a powerful, free alternative that gives everyone access to the same quality tools.
                  </p>
                  <p>
                    ExamPrep AI is the result of that vision — an AI-powered platform where anyone can generate exams, practice, earn certificates, and grow their skills without cost being a barrier.
                  </p>
                </div>

                {/* Free Pro offer */}
                <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="text-xl shrink-0 mt-0.5">🎁</div>
                    <div>
                      <h4 className="font-bold text-[var(--color-text)] mb-1">Get 3 Months of Pro — Free</h4>
                      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                        Abbas personally offers a complimentary 3-month Pro plan to anyone who can't afford to upgrade. DM him on LinkedIn to activate it.
                      </p>
                      <a
                        href="https://www.linkedin.com/in/abbashaider14/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-[var(--color-primary)] text-sm font-semibold hover:underline"
                      >
                        <Linkedin size={13} /> DM on LinkedIn <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <p className="text-[var(--color-text-muted)] mb-4">Ready to start learning?</p>
            <Link to="/signup" className="btn-primary px-8 py-3.5 inline-flex items-center gap-2 rounded-xl font-semibold shadow-lg shadow-blue-500/15">
              <Sparkles size={16} /> Get Started Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
