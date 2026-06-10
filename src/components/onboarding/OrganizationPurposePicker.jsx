import { Building2, GraduationCap } from 'lucide-react';

const OPTIONS = [
  {
    value: 'school',
    label: 'School',
    hint: 'Board, class & subject',
    icon: GraduationCap,
  },
  {
    value: 'institute',
    label: 'Institute',
    hint: 'Coaching & competitive prep',
    icon: Building2,
  },
];

export default function OrganizationPurposePicker({
  value,
  onChange,
  title = 'Primary use case',
}) {
  return (
    <div>
      <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map(({ value: v, label, hint, icon: Icon }) => {
          const selected = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`text-left rounded-lg border px-2.5 py-2 transition-colors ${
                selected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/35 bg-[var(--color-surface)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                  selected ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]' : 'bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]'
                }`}>
                  <Icon size={14} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)] leading-tight">{label}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] leading-snug mt-0.5">{hint}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
