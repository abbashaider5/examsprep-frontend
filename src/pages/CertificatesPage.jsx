import { useQuery } from '@tanstack/react-query';
import { Award, Download, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { certificateApi } from '../services/api.js';

export default function CertificatesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => certificateApi.getAll().then(r => r.data),
  });

  const certs = data?.certificates || [];

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 via-emerald-50/50 to-teal-50/30 dark:from-green-900/20 dark:via-emerald-900/10 dark:to-teal-900/5 border border-green-100 dark:border-green-900/30 px-6 py-5 mb-6">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-green-200/30 dark:bg-green-700/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
            <Award size={18} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-[var(--color-text)] leading-tight">My Certificates</h1>
            <p className="text-xs text-[var(--color-text-muted)]">Earned by passing exams with 75% or above</p>
          </div>
        </div>
      </div>

      {certs.length === 0 ? (
        <div className="card text-center py-16">
          <Award size={48} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-30" />
          <p className="text-[var(--color-text-muted)] mb-4">No certificates yet. Pass an exam to earn one!</p>
          <Link to="/create-exam" className="btn-primary text-sm">Create Exam</Link>
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
    </div>
  );
}
