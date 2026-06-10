import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, Loader2, RefreshCw, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { instructorApi } from '../services/api.js';
import Modal from './Modal.jsx';

export default function ExamAccessKeyModal({ exam, onClose }) {
  const qc = useQueryClient();
  const [enrollmentLimit, setEnrollmentLimit] = useState(40);
  const [isActive, setIsActive] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['examAccessKey', exam._id],
    queryFn: () => instructorApi.getExamAccessKey(exam._id).then((r) => r.data),
    enabled: Boolean(exam?._id),
  });

  const keyDoc = data?.accessKey;
  const quota = data?.quota;

  useEffect(() => {
    if (keyDoc) {
      setEnrollmentLimit(keyDoc.enrollmentLimit);
      setIsActive(keyDoc.isActive);
    } else if (quota?.remaining) {
      setEnrollmentLimit(Math.min(40, Math.max(1, quota.remaining)));
    }
  }, [keyDoc, quota?.remaining]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['examAccessKey', exam._id] });
    qc.invalidateQueries({ queryKey: ['instructorAnalytics'] });
    qc.invalidateQueries({ queryKey: ['myExams'] });
    qc.invalidateQueries({ queryKey: ['examAccessKey', exam._id] });
    qc.invalidateQueries({ queryKey: ['myExams'] });
  };

  const saveMut = useMutation({
    mutationFn: (payload) => instructorApi.saveExamAccessKey(exam._id, payload),
    onSuccess: () => {
      toast.success('Access key saved');
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not save access key'),
  });

  const regenerateMut = useMutation({
    mutationFn: () => instructorApi.saveExamAccessKey(exam._id, {
      enrollmentLimit,
      isActive,
      regenerateKey: true,
    }),
    onSuccess: () => {
      toast.success('New access key generated');
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not regenerate key'),
  });

  const deleteMut = useMutation({
    mutationFn: () => instructorApi.deleteExamAccessKey(exam._id),
    onSuccess: () => {
      toast.success('Access key deleted');
      invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not delete key'),
  });

  const copyKey = async () => {
    if (!keyDoc?.accessKey) return;
    try {
      await navigator.clipboard.writeText(keyDoc.accessKey);
      toast.success('Access key copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const maxLimit = keyDoc
    ? (keyDoc.enrolledCount || 0) + (quota?.remaining ?? 0)
    : (quota?.remaining ?? 100);

  const remainingSeats = keyDoc
    ? Math.max(0, (keyDoc.enrollmentLimit || 0) - (keyDoc.enrolledCount || 0))
    : null;

  return (
    <Modal onClose={onClose}>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
              <KeyRound size={18} className="text-[var(--color-primary)]" />
              Exam Access Key
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate">{exam.title}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]">
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-[var(--color-text-muted)]">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label text-xs">Access Key</label>
              <div className="flex items-center gap-2">
                <input
                  className="input font-mono text-sm flex-1 uppercase"
                  readOnly
                  value={keyDoc?.accessKey || 'Not generated yet — save to create'}
                />
                {keyDoc?.accessKey && (
                  <button type="button" onClick={copyKey} className="btn-secondary p-2" title="Copy key">
                    <Copy size={14} />
                  </button>
                )}
              </div>
              {keyDoc?.accessKey && (
                <button
                  type="button"
                  onClick={() => regenerateMut.mutate()}
                  disabled={regenerateMut.isPending || saveMut.isPending}
                  className="mt-2 text-xs text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
                >
                  <RefreshCw size={12} className={regenerateMut.isPending ? 'animate-spin' : ''} />
                  Generate New Key
                </button>
              )}
            </div>

            <div>
              <label className="label text-xs">Maximum Students Allowed</label>
              <input
                type="number"
                min={1}
                max={Math.max(1, maxLimit)}
                className="input"
                value={enrollmentLimit}
                onChange={(e) => setEnrollmentLimit(Math.max(1, Number(e.target.value) || 1))}
              />
              <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                Max {Math.max(1, maxLimit)} based on your remaining student quota
                {quota ? ` (${quota.remaining} remaining)` : ''}
              </p>
            </div>

            <div>
              <label className="label text-xs">Key Status</label>
              <div className="flex gap-2">
                {['active', 'disabled'].map((opt) => {
                  const active = opt === 'active' ? isActive : !isActive;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setIsActive(opt === 'active')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border capitalize transition-all ${active ? 'border-[var(--color-primary)] bg-blue-50 dark:bg-blue-900/20 text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {keyDoc && (
              <div className="p-3 rounded-xl bg-[var(--color-bg-alt)] text-xs space-y-1">
                <p className="font-semibold text-[var(--color-text)]">Access Key Usage</p>
                <p className="text-[var(--color-text-muted)]">
                  Enrolled: <span className="font-semibold text-[var(--color-text)]">{keyDoc.enrolledCount}</span>
                  {' / '}
                  {keyDoc.enrollmentLimit}
                </p>
                <p className="text-[var(--color-text-muted)]">
                  Remaining: <span className="font-semibold text-[var(--color-text)]">{remainingSeats}</span>
                </p>
                <p className="text-[var(--color-text-muted)]">
                  Status: <span className={`font-semibold ${keyDoc.isActive ? 'text-emerald-600' : 'text-amber-600'}`}>{keyDoc.isActive ? 'Active' : 'Disabled'}</span>
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => saveMut.mutate({ enrollmentLimit, isActive, regenerateKey: !keyDoc })}
                disabled={saveMut.isPending || regenerateMut.isPending}
                className="btn-primary text-sm flex-1 min-w-[120px]"
              >
                {saveMut.isPending ? 'Saving…' : 'Save Key'}
              </button>
              {keyDoc && (
                <>
                  <button
                    type="button"
                    onClick={() => saveMut.mutate({ enrollmentLimit, isActive: false })}
                    disabled={saveMut.isPending || !isActive}
                    className="btn-secondary text-sm"
                  >
                    Disable Key
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMut.mutate()}
                    disabled={deleteMut.isPending}
                    className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 inline-flex items-center gap-1"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </>
              )}
              <button type="button" onClick={onClose} className="btn-secondary text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
