import { useQuery } from '@tanstack/react-query';
import { Award, CheckCircle, XCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { certificateApi } from '../services/api.js';

export default function VerifyCertPage() {
  const { certId } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['verifyCert', certId],
    queryFn: () => certificateApi.verify(certId).then(r => r.data),
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" /></div>;

  if (error || !data?.certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <XCircle size={48} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">Certificate Not Found</h2>
          <p className="text-[var(--color-text-muted)]">This certificate ID is invalid or does not exist.</p>
        </div>
      </div>
    );
  }

  const cert = data.certificate;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4 py-10">
      <div className="max-w-lg w-full">
        <div className="card border-2 border-[var(--color-primary)] text-center">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 -mx-6 -mt-6 px-6 pt-8 pb-6 rounded-t-xl mb-6">
            <Award size={48} className="mx-auto mb-2 text-yellow-400" />
            <h1 className="text-2xl font-extrabold text-white">ExamPrep AI</h1>
            <p className="text-blue-200 text-sm">Certificate of Achievement</p>
          </div>

          <div className="mb-6">
            <p className="text-[var(--color-text-muted)] text-sm">This certifies that</p>
            <h2 className="text-2xl font-bold text-[var(--color-text)] my-1">{cert.userName}</h2>
            <p className="text-[var(--color-text-muted)] text-sm">has successfully completed</p>
            <h3 className="text-xl font-bold text-[var(--color-primary)] my-1">{cert.examName}</h3>
            <p className="text-3xl font-extrabold text-[var(--color-text)] my-3">{cert.percentage}%</p>
          </div>

          {cert.proctored && <div className="badge bg-blue-100 text-blue-700 mx-auto mb-4">✓ AI Proctored</div>}

          <div className="text-xs text-[var(--color-text-muted)] space-y-1 mb-6">
            <p>Issued: {new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="font-mono">ID: {cert.certId}</p>
          </div>

          <div className="flex items-center justify-center gap-2 py-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <CheckCircle size={18} className="text-green-500" />
            <span className="text-green-700 dark:text-green-400 font-semibold text-sm">Verified by ExamPrep AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
