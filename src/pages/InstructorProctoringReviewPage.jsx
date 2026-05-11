import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Camera, Shield } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { instructorApi } from '../services/api.js';
import { SCREENSHOT_RETENTION_DAYS, screenshotDaysRemaining } from '../utils/screenshotRetention.js';

export default function InstructorProctoringReviewPage() {
  const { examId, userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['studentExamReport', examId, userId, 'proctoring'],
    queryFn: () => instructorApi.getStudentExamReport(examId, userId).then((r) => r.data),
    enabled: !!examId && !!userId,
  });

  const events = data?.latestResult?.proctoringEvents || [];
  const screenshots = data?.screenshots || [];
  const retentionDays = data?.screenshotRetentionDays ?? SCREENSHOT_RETENTION_DAYS;
  const eventTypes = Array.from(new Set(events.map((e) => e?.type).filter(Boolean)));
  const filteredEvents = useMemo(
    () => (typeFilter === 'all' ? events : events.filter((e) => e?.type === typeFilter)),
    [events, typeFilter],
  );

  const summary = useMemo(() => {
    const warningCount = events.filter((e) => e?.severity === 'warning').length;
    const criticalCount = events.filter((e) => e?.severity === 'critical').length;
    const byType = events.reduce((acc, ev) => {
      const key = ev?.type || 'other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const score = (criticalCount * 3) + warningCount + (byType.fullscreen_exit || 0) + (byType.tab_switch || 0) + (byType.face_missing || 0) + (byType.multiple_faces || 0) + (byType.audio_voice || 0) + (byType.audio_noise || 0);
    const riskLevel = score >= 12 ? 'High Risk' : score >= 6 ? 'Medium Risk' : 'Low Risk';
    return { warningCount, criticalCount, riskLevel };
  }, [events]);

  const goBack = () => {
    const ret = searchParams.get('returnTo');
    if (ret) {
      try {
        const path = decodeURIComponent(ret);
        if (path.startsWith('/') && !path.startsWith('//')) return navigate(path);
      } catch {
        // ignore
      }
    }
    navigate(`/instructor/report/${examId}?view=candidates`);
  };

  if (isLoading) {
    return <div className="px-4 sm:px-6 lg:px-8 py-8"><div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div></div>;
  }

  if (error || !data) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 text-center">
        <AlertCircle size={40} className="mx-auto mb-3 text-red-500" />
        <p className="text-sm text-[var(--color-text-muted)] mb-5">{error?.response?.data?.message || 'Unable to load AI proctoring review.'}</p>
        <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={goBack}>Back</button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button type="button" onClick={goBack} className="p-2 rounded-xl hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[var(--color-text)] truncate">AI Proctoring Review</h1>
          <p className="text-xs text-[var(--color-text-muted)] truncate">{data.student?.name || data.student?.email} · {data.exam?.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          ['Risk', summary.riskLevel],
          ['Warnings', summary.warningCount],
          ['Critical', summary.criticalCount],
          ['Events', events.length],
        ].map(([label, val]) => (
          <div key={label} className="card p-3">
            <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
            <p className="text-sm font-semibold text-[var(--color-text)]">{val}</p>
          </div>
        ))}
      </div>

      <div className="card p-4 mb-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2"><Shield size={14} className="text-[var(--color-primary)]" /> Suspicious Activity Timeline</h3>
          <select className="input text-xs py-1.5 max-w-[220px]" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All event types</option>
            {eventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {filteredEvents.length === 0 && <p className="text-xs text-[var(--color-text-muted)]">No proctoring events recorded.</p>}
          {filteredEvents.slice().reverse().map((ev, idx) => (
            <div key={`${ev.timestamp || idx}-${idx}`} className="rounded-xl border border-[var(--color-border)] p-3 bg-[var(--color-bg-alt)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--color-text)]">{ev.type || 'event'}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">{ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{ev.message}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2 mb-1"><Camera size={14} className="text-[var(--color-primary)]" /> Evidence Screenshots</h3>
        <p className="text-[10px] text-[var(--color-text-muted)] mb-3 leading-relaxed">
          Images are kept for {retentionDays} days only, then removed automatically. Proctoring events and analytics are not deleted.
        </p>
        {!screenshots.length ? (
          <p className="text-xs text-[var(--color-text-muted)]">No screenshots available.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {screenshots.slice(0, 40).map((ss) => {
              const rem = screenshotDaysRemaining(ss.capturedAt, retentionDays);
              return (
                <div key={ss._id} className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg-alt)]">
                  <div className="aspect-[4/3] bg-black">
                    <img src={ss.imageUrl || ss.imageData} alt="evidence" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] font-semibold text-[var(--color-text)]">{ss.eventType?.replace(/_/g, ' ') || 'capture'}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{new Date(ss.capturedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    {rem !== null && (
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
                        {rem <= 0 ? 'Past retention window' : `Auto-deletes in ~${rem} day${rem === 1 ? '' : 's'}`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

