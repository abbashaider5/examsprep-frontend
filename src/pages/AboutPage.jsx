import { Award, BookOpen, ExternalLink, Heart, Linkedin, Sparkles, Target, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <div className="bg-[var(--color-bg)] animate-fade-in">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-[var(--color-primary)] text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
              <BookOpen size={13} /> About ExamPrep AI
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--color-text)] mb-5 tracking-tight leading-tight">
              Built for learners<br />
              <span className="text-[var(--color-primary)]">who deserve better</span>
            </h1>
            <p className="text-[var(--color-text-muted)] text-lg max-w-2xl mx-auto leading-relaxed">
              ExamPrep AI is an AI-powered exam platform helping students and professionals master any subject through intelligent MCQ generation, proctoring, analytics, and verified certificates — free.
            </p>
          </div>

          {/* Mission cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
            {[
              { icon: Zap, title: 'Our Mission', desc: 'Democratize quality exam preparation by making AI-powered practice accessible to everyone, everywhere — at no cost.', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
              { icon: Target, title: 'Our Vision', desc: 'A world where every learner has a personalized AI tutor that identifies gaps and accelerates mastery at their own pace.', color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600' },
              { icon: Heart, title: 'Why We Built This', desc: 'Quality exam prep platforms are expensive. We built ExamPrep AI so cost is never a barrier to learning and growth.', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' },
              { icon: Award, title: 'What We Offer', desc: 'AI exams, proctoring, real-time analytics, flashcards, gamification, certificates, and instructor tools — all free to start.', color: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
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

          {/* ── Creator ── */}
          <div className="max-w-3xl mx-auto">
            <div className="card overflow-hidden p-0">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-8 py-10 flex flex-col sm:flex-row items-center gap-8">
                {/* Profile photo */}
                <div className="shrink-0">
                  <img
                    src="https://media.licdn.com/dms/image/v2/D5603AQFaxyPAi48gLQ/profile-displayphoto-crop_800_800/B56ZkizQFRI8AI-/0/1757225485770?e=1778112000&v=beta&t=EYVY5oRHurjaBmnANG4frMXqqidHeOF-OXsgFAReFZk"
                    alt="Abbas Haider"
                    className="w-28 h-28 rounded-2xl object-cover border-2 border-white/20 shadow-xl"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-28 h-28 rounded-2xl bg-blue-600/20 border-2 border-white/20 items-center justify-center text-3xl font-bold text-white hidden">A</div>
                </div>
                {/* Bio */}
                <div className="text-center sm:text-left">
                  <div className="inline-flex items-center gap-2 bg-white/10 text-white/70 text-xs font-medium px-3 py-1 rounded-full mb-3">
                    <Sparkles size={11} /> Creator & Developer
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">Abbas Haider</h2>
                  <p className="text-white/60 text-sm mb-4">Software Developer · Web Development · Cyber Security</p>
                  <a
                    href="https://www.linkedin.com/in/abbashaider14/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#0077B5] hover:bg-[#006399] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    <Linkedin size={14} /> Connect on LinkedIn
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {/* Story */}
              <div className="px-8 py-8">
                <h3 className="text-lg font-bold text-[var(--color-text)] mb-4">The Story Behind ExamPrep AI</h3>
                <div className="space-y-3 text-sm text-[var(--color-text-muted)] leading-relaxed">
                  <p>
                    Abbas Haider is a software developer with <strong className="text-[var(--color-text)]">4 years of experience</strong> in web development, specializing in building modern full-stack applications. He is currently expanding his expertise into <strong className="text-[var(--color-text)]">Cyber Security</strong> at CRAW Security Institute.
                  </p>
                  <p>
                    He created ExamPrep AI after recognizing that many learners around the world cannot afford expensive platforms to test and improve their knowledge. His goal was simple: build a powerful, free alternative that gives everyone access to the same quality tools that are usually reserved for those who can afford them.
                  </p>
                  <p>
                    ExamPrep AI is the result of that vision — an AI-powered platform where anyone can generate exams, practice, earn certificates, and grow their skills, without spending a single rupee.
                  </p>
                </div>

                {/* Free Pro offer */}
                <div className="mt-6 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl shrink-0">🎁</div>
                    <div>
                      <h4 className="font-bold text-[var(--color-text)] mb-1">Get 3 Months of Pro — Free</h4>
                      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                        Abbas personally offers a complimentary 3-month Pro plan to anyone who can't afford to upgrade. Simply DM him on LinkedIn and he'll activate it for you.
                      </p>
                      <a
                        href="https://www.linkedin.com/in/abbashaider14/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-3 text-[var(--color-primary)] text-sm font-semibold hover:underline"
                      >
                        <Linkedin size={14} /> DM on LinkedIn <ExternalLink size={11} />
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
            <Link to="/signup" className="btn-primary px-8 py-3.5 inline-flex items-center gap-2 rounded-xl font-semibold">
              <Sparkles size={16} /> Get Started Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
