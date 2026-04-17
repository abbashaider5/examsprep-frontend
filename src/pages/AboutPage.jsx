import { BookOpen, Heart, Target, Zap } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-in">
      <div className="text-center mb-14">
        <div className="flex items-center justify-center gap-2 text-[var(--color-primary)] font-bold text-2xl mb-4">
          <BookOpen size={32} /> ExamPrep AI
        </div>
        <h1 className="text-4xl font-extrabold text-[var(--color-text)] mb-4">Built for learners, by learners</h1>
        <p className="text-[var(--color-text-muted)] text-lg max-w-2xl mx-auto leading-relaxed">
          ExamPrep AI is an AI-powered exam preparation platform that helps students and professionals master any subject through intelligent MCQ generation, performance analytics, and verified certification.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
        {[
          { icon: <Zap size={24} />, title: 'Our Mission', desc: 'Democratize quality exam preparation by making AI-generated practice accessible to everyone, anywhere.' },
          { icon: <Target size={24} />, title: 'Our Vision', desc: 'A world where every learner has a personalized AI tutor that identifies gaps and accelerates mastery.' },
          { icon: <Heart size={24} />, title: 'Why We Built This', desc: 'Frustrated by generic practice tests and expensive prep courses, we built a smarter alternative.' },
          { icon: <BookOpen size={24} />, title: 'What We Offer', desc: 'AI-generated MCQs, proctored exams, real-time analytics, certificates, and gamified learning.' },
        ].map(item => (
          <div key={item.title} className="card">
            <div className="text-[var(--color-primary)] mb-3">{item.icon}</div>
            <h3 className="font-bold text-[var(--color-text)] mb-2">{item.title}</h3>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
