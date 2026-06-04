import { GraduationCap, Sparkles } from 'lucide-react';

export default function AccountTypePicker({ value, onChange, title = 'Who are you creating this account for?' }) {
  return (
    <div>
      <p className="text-sm font-medium text-[var(--color-text)] mb-2">{title}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange('student')}
          className={`text-left rounded-2xl border-2 p-4 transition-all ${
            value === 'student'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40 bg-[var(--color-surface)]'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              value === 'student' ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]' : 'bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]'
            }`}>
              <GraduationCap size={20} />
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text)]">Student</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">Take exams and join classrooms</p>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onChange('instructor')}
          className={`text-left rounded-2xl border-2 p-4 transition-all ${
            value === 'instructor'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40 bg-[var(--color-surface)]'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              value === 'instructor' ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]' : 'bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]'
            }`}>
              <Sparkles size={20} />
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text)]">Instructor</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">Create exams, manage students, and use AI tools</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
