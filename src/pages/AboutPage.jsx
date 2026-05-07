import { Award, BarChart2, BookOpen, Brain, ShieldCheck, Sparkles, Target, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <div className="bg-[var(--color-bg)] animate-fade-in">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-radial from-teal-100/60 via-cyan-50/20 to-transparent dark:from-teal-900/15 dark:to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
              <BookOpen size={13} /> About LikhitAI
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--color-text)] mb-5 tracking-tight leading-tight">
              Built for instructors,<br />
              <span className="text-[var(--color-primary)]">designed for outcomes</span>
            </h1>
            <p className="text-[var(--color-text-muted)] text-lg max-w-2xl mx-auto leading-relaxed">
              LikhitAI is a modern assessment and analytics platform built for instructors, trainers, and organizations. We simplify test creation using AI, help you scale evaluation, and give you deep insights into student performance.
            </p>
          </div>

          {/* Mission cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
            {[
              { icon: Zap, title: 'Our Mission', desc: 'Empower instructors and organizations with AI-powered tools to create better assessments and improve student outcomes at scale.', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600' },
              { icon: Target, title: 'Our Vision', desc: 'A world where every instructor has real data about every student — and the tools to act on it before it\'s too late.', color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600' },
              { icon: Brain, title: 'Why We Built It', desc: 'Assessment tools are expensive, fragmented, and hard to use. We built LikhitAI to be the single platform instructors actually need.', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
              { icon: Award, title: 'What We Offer', desc: 'AI exam generation, proctoring, batch management, performance analytics, AI recommendations, and verified certificates — in one place.', color: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
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

          {/* ── What the platform enables ── */}
          <div className="max-w-3xl mx-auto mb-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-3">What LikhitAI enables for you</h2>
              <p className="text-[var(--color-text-muted)] text-sm">We focus on the outcomes that matter to instructors, trainers, and HR teams.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Sparkles, title: 'Simplify test creation using AI', desc: 'Generate high-quality MCQ and coding questions on any topic in under 10 seconds. No question bank required.', color: 'text-teal-600' },
                { icon: Users, title: 'Scale evaluation effortlessly', desc: 'Manage batches, send bulk invites, and run assessments for hundreds of students with the same effort as ten.', color: 'text-blue-600' },
                { icon: BarChart2, title: 'Deep insights into student performance', desc: 'Per-student analytics, topic-wise accuracy, score trends, and AI-generated recommendations on what to improve.', color: 'text-indigo-600' },
                { icon: ShieldCheck, title: 'Ensure exam integrity with proctoring', desc: 'Webcam monitoring, tab tracking, random photo capture, and violation logs — all controlled by you per exam.', color: 'text-red-600' },
              ].map(item => (
                <div key={item.title} className="flex gap-4 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-colors">
                  <item.icon size={20} className={`${item.color} shrink-0 mt-0.5`} />
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--color-text)] mb-1">{item.title}</h3>
                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

       

          {/* CTA */}
          <div className="text-center mt-16">
            <p className="text-[var(--color-text-muted)] mb-4">Ready to start managing your students better?</p>
            <Link to="/signup?role=instructor" className="btn-primary px-8 py-3.5 inline-flex items-center gap-2 rounded-xl font-semibold shadow-lg shadow-teal-500/15">
              <Sparkles size={16} /> Get Started as Instructor
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
