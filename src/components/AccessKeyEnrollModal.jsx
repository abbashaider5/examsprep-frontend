import { useMutation } from '@tanstack/react-query';
import { BookOpen, Clock, Hash, Loader2, User, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { instructorApi } from '../services/api.js';
import Modal from './Modal.jsx';
import VerifiedName from './VerifiedName.jsx';

function fmtCardDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AccessKeyEnrollModal({ preview, onClose, onEnrolled }) {
  const enrollMut = useMutation({
    mutationFn: () => instructorApi.enrollViaAccessKey(preview.accessKey),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Successfully enrolled in exam.');
      onEnrolled?.(res.data);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not enroll with this key'),
  });

  const exam = preview?.exam;
  const instructorName = preview?.instructor?.name || preview?.instructorName || 'Instructor';
  const instructorVerified = !!(preview?.instructor?.isVerified ?? preview?.instructorVerified);
  const instructorAboutMe = (preview?.instructor?.aboutMe || preview?.instructorAboutMe || '').trim();

  return (
    <Modal onClose={onClose}>
      <div className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md p-6">
        {enrollMut.isPending && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-[var(--color-surface)]/95 backdrop-blur-sm">
            <Loader2 size={32} className="animate-spin text-[var(--color-primary)] mb-3" />
            <p className="text-sm font-semibold text-[var(--color-text)]">Enrolling you in the exam…</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Please wait a moment.</p>
          </div>
        )}

        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-[var(--color-text)]">Confirm enrollment</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Review the exam details before joining.</p>
          </div>
          <button type="button" onClick={onClose} disabled={enrollMut.isPending} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] disabled:opacity-50">
            <X size={16} />
          </button>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/40 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
              <BookOpen size={18} className="text-[var(--color-primary)]" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[var(--color-text)] leading-snug">{exam?.title}</p>
              {exam?.subject && (
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{exam.subject}</p>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div className="sm:col-span-2">
              <dt className="text-[var(--color-text-muted)] flex items-center gap-1"><User size={11} /> Instructor</dt>
              <dd className="mt-0.5">
                <VerifiedName
                  name={instructorName}
                  verified={instructorVerified}
                  nameClassName="font-medium text-[var(--color-text)]"
                  iconSize={15}
                  showLabel={instructorVerified}
                />
                {instructorAboutMe && (
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 leading-relaxed whitespace-pre-wrap">
                    {instructorAboutMe}
                  </p>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)] flex items-center gap-1"><Hash size={11} /> Total questions</dt>
              <dd className="font-medium text-[var(--color-text)] mt-0.5">{exam?.questionCount ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)] flex items-center gap-1"><Clock size={11} /> Duration</dt>
              <dd className="font-medium text-[var(--color-text)] mt-0.5">~{exam?.durationMinutes ?? '—'} min</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Exam type</dt>
              <dd className="font-medium text-[var(--color-text)] mt-0.5">{exam?.examTypeLabel || exam?.examType || '—'}</dd>
            </div>
            {exam?.expiryDate && (
              <div className="sm:col-span-2">
                <dt className="text-[var(--color-text-muted)]">Available until</dt>
                <dd className="font-medium text-[var(--color-text)] mt-0.5">{fmtCardDate(exam.expiryDate)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={enrollMut.isPending}
            className="btn-secondary flex-1 text-sm py-2.5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => enrollMut.mutate()}
            disabled={enrollMut.isPending}
            className="btn-primary flex-1 text-sm py-2.5 disabled:opacity-50"
          >
            Enroll
          </button>
        </div>
      </div>
    </Modal>
  );
}
