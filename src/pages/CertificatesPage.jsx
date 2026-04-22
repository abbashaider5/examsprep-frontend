import { useQuery } from '@tanstack/react-query';
import { Award, BookOpen, Download, ExternalLink, GraduationCap, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { certificateApi, instructorApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

function scoreColor(v) {
  return v >= 70 ? 'text-emerald-600 dark:text-emerald-400' : v >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
}

export default function CertificatesPage() {
  const { user } = useAuthStore();
  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';
  const [tab, setTab] = useState('mine');
  const [studentSearch, setStudentSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => certificateApi.getAll().then(r => r.data),
  });

  const { data: analyticsData, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['instructorAnalyticsDetailed'],
    queryFn: () => instructorApi.getDetailedAnalytics().then(r => r.data),
    enabled: isInstructor,
    staleTime: 2 * 60 * 1000,
  });

  const certs = data?.certificates || [];
  const examStats = analyticsData?.examStats || [];
  const studentPerformance = analyticsData?.studentPerformance || [];

  // Build student certificate list from analytics — one entry per passed exam attempt
  const studentCerts = [];
  studentPerformance.forEach(sp => {
    sp.exams.forEach(e => {
      if (!e.passed) return;
      const exam = examStats.find(ex => ex._id?.toString() === e.examId?.toString());
      if (!exam) return;
      studentCerts.push({
        _key: `${sp.user._id}_${e.examId}_${e.date}`,
        student: sp.user,
        examId: e.examId,
        examTitle: exam.title,
        subject: exam.subject,
        score: e.score,
        date: e.date,
      });
    });
  });
  studentCerts.sort((a, b) => new Date(b.date) - new Date(a.date));

  const filteredStudentCerts = studentCerts.filter(c => {
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return c.student.name?.toLowerCase().includes(q) || c.student.email?.toLowerCase().includes(q) || c.examTitle?.toLowerCase().includes(q);
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 px-6 py-6 mb-6 shadow-lg">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 left-0 w-36 h-36 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Award size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white leading-tight">Certificates</h1>
            <p className="text-sm text-teal-100 mt-0.5">
              {isInstructor
                ? `${certs.length} earned · ${studentCerts.length} issued to students`
                : `${certs.length} certificate${certs.length !== 1 ? 's' : ''} earned`}
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar — instructors only */}
      {isInstructor && (
        <div className="flex gap-1 border-b border-[var(--color-border)] mb-6">
          {[
            { id: 'mine', label: 'My Certificates', icon: Award, count: certs.length },
            { id: 'students', label: 'Student Certificates', icon: Users, count: studentCerts.length },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <t.icon size={14} /> {t.label}
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]' : 'bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── My Certificates ── */}
      {(!isInstructor || tab === 'mine') && (
        <>
          {certs.length === 0 ? (
            <div className="card text-center py-16">
              <Award size={48} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-30" />
              <p className="text-[var(--color-text-muted)]">No certificates yet. Pass an exam to earn one!</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">Complete a test with a passing score and generate your certificate.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {certs.map(cert => (
                <div key={cert._id} className="card hover:shadow-md transition-shadow border-l-4 border-[var(--color-primary)]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-2xl">🏆</div>
                    <div className="flex flex-col items-end gap-1">
                      {cert.proctored && <span className="badge bg-blue-100 text-blue-700">AI Proctored</span>}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`${window.location.origin}/verify/${cert.certId}`)}`}
                        alt="Verify QR"
                        className="w-16 h-16 rounded border border-[var(--color-border)]"
                      />
                      <span className="text-xs text-[var(--color-text-muted)]">Scan to verify</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-[var(--color-text)] mb-1">{cert.examName}</h3>
                  <p className="text-2xl font-extrabold text-[var(--color-primary)] mb-1">{cert.percentage}%</p>
                  <p className="text-xs text-[var(--color-text-muted)] mb-4">
                    Issued {new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] font-mono mb-4 truncate">ID: {cert.certId}</p>
                  <div className="flex gap-2">
                    <a href={`/api/certificates/download/${cert.certId}`} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1" target="_blank" rel="noreferrer">
                      <Download size={12} /> Download
                    </a>
                    <Link to={`/verify/${cert.certId}`} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                      <ExternalLink size={12} /> Verify
                    </Link>
                    <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin + '/verify/' + cert.certId)}`} target="_blank" rel="noreferrer" className="btn-secondary text-xs py-1.5 px-3">LinkedIn</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Student Certificates (instructor only) ── */}
      {isInstructor && tab === 'students' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
            <input
              type="text"
              placeholder="Search by student name, email, or test title…"
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              className="input w-full text-sm py-2"
            />
          </div>

          {loadingAnalytics ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
          ) : filteredStudentCerts.length === 0 ? (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl text-center py-16">
              <GraduationCap size={40} className="mx-auto mb-4 text-[var(--color-border)]" />
              <p className="font-semibold text-[var(--color-text)] mb-1">
                {studentCerts.length === 0 ? 'No student certificates yet' : 'No results match your search'}
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {studentCerts.length === 0
                  ? 'When students pass your tests, their certificates will appear here.'
                  : 'Try a different search term.'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-[var(--color-text-muted)] px-1">
                Showing <strong className="text-[var(--color-primary)]">{filteredStudentCerts.length}</strong> passed attempt{filteredStudentCerts.length !== 1 ? 's' : ''}
                {studentSearch && ` matching "${studentSearch}"`}
              </p>
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-alt)]/50">
                        {['Student', 'Test', 'Subject', 'Score', 'Date', 'Report'].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[var(--color-text-muted)] whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {filteredStudentCerts.map(c => (
                        <tr key={c._key} className="hover:bg-[var(--color-bg-alt)]/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                {c.student.name?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-[var(--color-text)] truncate text-xs">{c.student.name}</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] truncate">{c.student.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <BookOpen size={12} className="text-[var(--color-text-muted)] shrink-0" />
                              <span className="font-medium text-[var(--color-text)] max-w-[160px] truncate text-xs">{c.examTitle}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-[var(--color-text-muted)]">{c.subject || '—'}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${c.score >= 70 ? 'bg-emerald-500' : c.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${c.score}%` }} />
                              </div>
                              <span className={`text-xs font-bold ${scoreColor(c.score)}`}>{c.score}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                            {new Date(c.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4">
                            <Link
                              to={`/instructor/report/${c.examId}`}
                              className="text-[10px] text-[var(--color-primary)] hover:underline flex items-center gap-1"
                            >
                              View <ExternalLink size={10} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
