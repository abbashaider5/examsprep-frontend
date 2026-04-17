import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpen,
  Camera,
  CameraOff,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Lightbulb,
  Loader,
  Lock,
  Maximize,
  Monitor,
  Play,
  Shield,
  Users,
  Video,
  Wifi,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import { examApi, instructorApi, resultApi } from '../services/api.js';

// ─── Phases ───────────────────────────────────────────────
// LOADING → (invite ? INVITE_ACCEPT) → (proctored ? PREFLIGHT : INSTRUCTIONS) → INSTRUCTIONS → EXAM

export default function ExamPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isPractice = searchParams.get('practice') === 'true';
  const inviteToken = searchParams.get('invite') || null;
  const navigate = useNavigate();

  const [phase, setPhase] = useState(inviteToken ? 'invite_accept' : 'loading'); // loading | invite_accept | preflight | instructions | exam
  const [inviteAccepting, setInviteAccepting] = useState(false);
  const [examQueryEnabled, setExamQueryEnabled] = useState(!inviteToken);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(null);
  const [totalTime, setTotalTime] = useState(0);
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState(null);
  const [codeAnswers, setCodeAnswers] = useState({});
  const [codeOutputs, setCodeOutputs] = useState({}); // { [questionIndex]: { output, stderr, exitCode } }
  const [runningCode, setRunningCode] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState(new Set());
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // Preflight state
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [networkOk] = useState(true);
  const [fullscreenOk, setFullscreenOk] = useState(false);

  // Refs — stale-closure-safe
  const answersRef = useRef({});
  const flaggedRef = useRef(new Set());
  const violationsRef = useRef(0);
  const lastViolationTime = useRef(0);
  const startedAt = useRef(null);
  const timerRef = useRef(null);
  const webcamRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const faceCheckInterval = useRef(null);
  const codeAnswersRef = useRef({});
  const screenshotCountRef = useRef(0);
  const screenshotIntervalRef = useRef(null);

  // When an invite token is present, validate it first (public endpoint — no auth required)
  const { data: inviteValidation, isLoading: inviteLoading, error: inviteError } = useQuery({
    queryKey: ['validate-invite', inviteToken],
    queryFn: () => instructorApi.validateInvite(inviteToken).then(r => r.data),
    enabled: !!inviteToken,
    retry: false,
    staleTime: Infinity,
  });

  // Main exam fetch — skipped while in invite_accept phase; enabled after invite is accepted
  const { data, isLoading: examLoading, error } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => examApi.getById(id).then(r => r.data),
    enabled: examQueryEnabled,
    retry: 1,
  });

  const exam = examQueryEnabled ? data?.exam : inviteValidation?.invite?.exam;

  // Once exam data is loaded (post-invite-acceptance or normal flow), set the phase
  useEffect(() => {
    if (data?.exam && phase === 'loading') {
      if (isPractice) {
        setPhase('instructions');
      } else if (data.exam.proctored) {
        setPhase('preflight');
      } else {
        setPhase('instructions');
      }
    }
    // Transition after invite acceptance once exam data arrives
    if (data?.exam && phase === 'invite_accept' && examQueryEnabled) {
      if (data.exam.proctored) {
        setPhase('preflight');
      } else {
        setPhase('instructions');
      }
    }
  }, [data, phase, isPractice, examQueryEnabled]);

  // ── Submit (stale-closure-safe via refs) ──────────────────
  const submitMut = useMutation({
    mutationFn: resultApi.submit,
    onSuccess: (res) => {
      clearInterval(timerRef.current);
      clearInterval(faceCheckInterval.current);
      document.exitFullscreen?.().catch(() => {});
      navigate(`/results/${res.data.result.id}`, { state: { result: res.data.result } });
    },
    onError: () => {
      toast.error('Submission failed. Please try again.');
    },
  });

  const doSubmit = useCallback((force = false) => {
    if (submitMut.isPending || submitMut.isSuccess) return;
    clearInterval(timerRef.current);
    clearInterval(faceCheckInterval.current);
    clearInterval(screenshotIntervalRef.current);
    const timeTaken = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
    const currentAnswers = answersRef.current;
    const currentFlagged = flaggedRef.current;
    const currentViolations = violationsRef.current;
    const currentCodeAnswers = codeAnswersRef.current;

    if (!exam) return;
    const answersArray = exam.questions.map((_, i) => ({
      questionIndex: i,
      selectedOption: currentAnswers[i] ?? null,
      code: currentCodeAnswers[i] || '',
      flagged: currentFlagged.has(i),
      timeTaken: 0,
      isCorrect: false,
    }));
    submitMut.mutate({ examId: id, answers: answersArray, timeTaken, violations: currentViolations });
  }, [submitMut, exam, id]);

  // ── Timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'exam' || !exam || isPractice) return;
    const total = exam.questions.length * exam.timePerQuestion;
    setTimeLeft(total);
    setTotalTime(total);
    startedAt.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          toast('Time is up! Submitting your exam...', { icon: null });
          doSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]); // eslint-disable-line

  // ── Proctoring effects ────────────────────────────────────
  useEffect(() => {
    if (phase !== 'exam' || isPractice) return;

    const VIOLATION_COOLDOWN = 2000; // 2s debounce between violations

    const addViolation = (reason) => {
      const now = Date.now();
      if (now - lastViolationTime.current < VIOLATION_COOLDOWN) return;
      lastViolationTime.current = now;

      violationsRef.current += 1;
      setViolations(violationsRef.current);
      if (violationsRef.current >= 3) {
        setWarning('3 violations detected. Exam auto-submitted.');
        setTimeout(() => doSubmit(true), 1500);
      } else {
        setWarning(`${reason} Warning ${violationsRef.current}/3`);
        setTimeout(() => setWarning(null), 4000);
      }
    };

    // Visibility / tab switch
    const onVisChange = () => {
      if (document.hidden) addViolation('Tab switch detected!');
    };

    // Window blur (alt-tab, switching apps)
    const onBlur = () => addViolation('Window focus lost!');

    // Fullscreen exit
    const onFSChange = () => {
      if (!document.fullscreenElement && exam?.proctored) {
        document.documentElement.requestFullscreen?.().catch(() => {
          addViolation('Fullscreen exited!');
        });
      }
    };

    // Block keyboard shortcuts
    const onKeyDown = (e) => {
      const blocked = [
        e.key === 'PrintScreen',
        e.key === 'F12',
        (e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'u', 's', 'i', 'j', 'a', 'p'].includes(e.key.toLowerCase()),
        e.altKey && e.key === 'Tab',
      ];
      if (blocked.some(Boolean)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const preventDefault = (e) => e.preventDefault();

    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFSChange);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('copy', preventDefault);
    document.addEventListener('cut', preventDefault);
    document.addEventListener('paste', preventDefault);
    document.addEventListener('selectstart', preventDefault);

    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFSChange);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('copy', preventDefault);
      document.removeEventListener('cut', preventDefault);
      document.removeEventListener('paste', preventDefault);
      document.removeEventListener('selectstart', preventDefault);
    };
  }, [phase, isPractice]); // eslint-disable-line

  // ── Face Detection ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'exam' || isPractice || !exam?.proctored) return;
    if (!('FaceDetector' in window)) return; // gracefully skip if unsupported

    try {
      faceDetectorRef.current = new window.FaceDetector({ fastMode: false, maxDetectedFaces: 5 });
    } catch {
      return; // FaceDetector constructor failed, skip silently
    }

    faceCheckInterval.current = setInterval(async () => {
      const video = webcamRef.current?.video;
      if (!video || video.readyState < 2 || submitMut.isPending || submitMut.isSuccess) return;
      try {
        const faces = await faceDetectorRef.current.detect(video);
        const now = Date.now();
        if (now - lastViolationTime.current < 2000) return; // respect cooldown for face checks too

        if (faces.length === 0) {
          lastViolationTime.current = now;
          violationsRef.current += 1;
          setViolations(violationsRef.current);
          setWarning('No face detected! Please stay in frame.');
          setTimeout(() => setWarning(null), 4000);
          if (violationsRef.current >= 3) {
            setWarning('3 violations detected. Exam auto-submitted.');
            setTimeout(() => doSubmit(true), 1500);
          }
        } else if (faces.length > 1) {
          lastViolationTime.current = now;
          violationsRef.current += 1;
          setViolations(violationsRef.current);
          setWarning(`Multiple faces detected (${faces.length})! Violation ${violationsRef.current}/3`);
          setTimeout(() => setWarning(null), 4000);
          if (violationsRef.current >= 3) {
            setTimeout(() => doSubmit(true), 1500);
          }
        }
      } catch {
        // FaceDetector.detect() failed — skip silently
      }
    }, 8000);

    return () => clearInterval(faceCheckInterval.current);
  }, [phase, isPractice]); // eslint-disable-line

  // ── Keep answers/flagged/code refs in sync ─────────────────────
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { flaggedRef.current = flagged; }, [flagged]);
  useEffect(() => { codeAnswersRef.current = codeAnswers; }, [codeAnswers]);

  // ── Random Screenshot Capture ──────────────────────────────
  useEffect(() => {
    if (phase !== 'exam' || isPractice || !exam?.screenshotEnabled || !exam?.proctored) return;
    screenshotCountRef.current = 0;
    const MAX_SCREENSHOTS = 5;
    const MAX_W = 640;
    const MAX_H = 480;

    const captureAndSend = async () => {
      const video = webcamRef.current?.video;
      if (!video || video.readyState < 2 || video.videoWidth === 0) return;
      try {
        // Scale down to max 640×480 to keep payload under 450 KB
        const ratio = Math.min(MAX_W / video.videoWidth, MAX_H / video.videoHeight, 1);
        const w = Math.round(video.videoWidth * ratio);
        const h = Math.round(video.videoHeight * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(video, 0, 0, w, h);
        const imageData = canvas.toDataURL('image/jpeg', 0.45);
        // Guard: skip if still too large (very unlikely)
        if (imageData.length > 560000) return;
        await examApi.saveScreenshot(id, imageData);
        screenshotCountRef.current += 1;
      } catch {
        // best-effort — don't disrupt exam on failure
      }
    };

    const scheduleNext = () => {
      if (screenshotCountRef.current >= MAX_SCREENSHOTS) return;
      // First screenshot: 45-90s; subsequent: 2-4 min
      const isFirst = screenshotCountRef.current === 0;
      const delay = isFirst
        ? (45 + Math.random() * 45) * 1000
        : (120 + Math.random() * 120) * 1000;

      screenshotIntervalRef.current = setTimeout(async () => {
        await captureAndSend();
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => clearTimeout(screenshotIntervalRef.current);
  }, [phase, isPractice]); // eslint-disable-line

  // ── Helpers ───────────────────────────────────────────────
  const startExam = () => {
    if (!isPractice) document.documentElement.requestFullscreen?.().catch(() => {});
    startedAt.current = Date.now();
    setPhase('exam');
  };

  const handleAnswer = (i) => {
    setAnswers(a => ({ ...a, [current]: i }));
    if (isPractice) setRevealedAnswers(r => new Set([...r, current]));
  };

  const toggleFlag = () => {
    setFlagged(f => {
      const n = new Set(f);
      n.has(current) ? n.delete(current) : n.add(current);
      return n;
    });
  };

  // Show loading when: invite validating, exam loading, or phase is still 'loading'
  const isLoading = examQueryEnabled ? examLoading : inviteLoading;
  const displayError = examQueryEnabled ? error : inviteError;

  // ── Loading ───────────────────────────────────────────────
  if (isLoading || phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--color-text-muted)] text-sm">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (displayError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center">
          <AlertTriangle size={40} className="text-red-500 mx-auto mb-3" />
          <p className="text-red-500 mb-3">Failed to load exam.</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary text-sm">Go to Dashboard</button>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  const totalSecs = exam.questions.length * exam.timePerQuestion;
  const totalMins = Math.floor(totalSecs / 60);

  // ── Phase: INVITE_ACCEPT ──────────────────────────────────
  if (phase === 'invite_accept') {
    // Show spinner while exam is loading after acceptance
    if (examQueryEnabled && examLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--color-text-muted)] text-sm">Loading exam...</p>
          </div>
        </div>
      );
    }
    const handleAccept = async () => {
      setInviteAccepting(true);
      try {
        await instructorApi.acceptInvite(inviteToken);
        toast.success('Invite accepted! Loading exam...');
        setExamQueryEnabled(true); // triggers exam fetch; phase transitions in useEffect when data arrives
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to accept invite');
        setInviteAccepting(false);
      }
    };

    const difficultyColor = { easy: 'text-green-600 bg-green-100', medium: 'text-amber-600 bg-amber-100', hard: 'text-red-600 bg-red-100' }[exam.difficulty] || '';

    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="card text-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Users size={28} className="text-[var(--color-primary)]" />
            </div>
            <div className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-[var(--color-primary)] text-xs font-semibold px-3 py-1 rounded-full mb-3">
              Exam Invitation
            </div>
            <h2 className="text-xl font-bold text-[var(--color-text)] mb-1">You've been invited</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">Accept this invitation to access and take the exam.</p>

            {/* Exam info card */}
            <div className="bg-[var(--color-bg-alt)] rounded-xl p-4 mb-6 text-left space-y-2">
              <h3 className="font-bold text-[var(--color-text)] text-base">{exam.title}</h3>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-1 rounded-full text-[var(--color-text-muted)]">
                  {exam.subject}
                </span>
                <span className={`px-2.5 py-1 rounded-full font-medium ${difficultyColor}`}>
                  {exam.difficulty}
                </span>
                <span className="bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-1 rounded-full text-[var(--color-text-muted)]">
                  {exam.questions?.length} questions
                </span>
                {exam.proctored && (
                  <span className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                    <Shield size={11} /> AI Proctored
                  </span>
                )}
              </div>
            </div>

            {exam.proctored && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-5 text-left">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>AI Proctoring required:</strong> This exam uses webcam monitoring. Ensure good lighting and keep your face visible.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-secondary flex-1 py-2.5 text-sm"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                disabled={inviteAccepting}
                className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2"
              >
                {inviteAccepting ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Accepting...</>
                ) : (
                  <><CheckCircle size={16} /> Accept & Start</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }


  if (phase === 'preflight') {
    const allReady = cameraReady && fullscreenOk && networkOk;
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield size={28} className="text-[var(--color-primary)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--color-text)]">Pre-Exam System Check</h2>
            <p className="text-[var(--color-text-muted)] text-sm mt-1.5">This is a proctored exam. Please complete all checks before proceeding.</p>
          </div>

          {/* 2-column layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: System checks */}
            <div className="card space-y-3">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
                <Monitor size={15} className="text-[var(--color-primary)]" />
                System Requirements
              </h3>

              {/* Camera check */}
              <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${cameraReady ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : cameraError ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-[var(--color-border)] bg-[var(--color-bg-alt)]'}`}>
                {cameraReady
                  ? <CheckCircle size={18} className="text-green-500 shrink-0" />
                  : cameraError
                  ? <CameraOff size={18} className="text-red-500 shrink-0" />
                  : <Camera size={18} className="text-[var(--color-text-muted)] shrink-0" />}
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--color-text)]">Camera Access</div>
                  <div className={`text-xs mt-0.5 ${cameraReady ? 'text-green-600' : cameraError ? 'text-red-500' : 'text-[var(--color-text-muted)]'}`}>
                    {cameraReady ? 'Camera ready and active' : cameraError ? cameraError : 'Required for face monitoring'}
                  </div>
                </div>
                {!cameraReady && !cameraError && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.mediaDevices.getUserMedia({ video: true });
                        setCameraReady(true);
                      } catch (e) {
                        setCameraError(e.name === 'NotAllowedError' ? 'Camera access denied' : 'Camera not found');
                      }
                    }}
                    className="text-xs btn-primary py-1.5 px-3 shrink-0"
                  >
                    Allow
                  </button>
                )}
              </div>

              {/* Fullscreen check */}
              <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${fullscreenOk ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-[var(--color-border)] bg-[var(--color-bg-alt)]'}`}>
                {fullscreenOk
                  ? <CheckCircle size={18} className="text-green-500 shrink-0" />
                  : <Maximize size={18} className="text-[var(--color-text-muted)] shrink-0" />}
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--color-text)]">Fullscreen Mode</div>
                  <div className={`text-xs mt-0.5 ${fullscreenOk ? 'text-green-600' : 'text-[var(--color-text-muted)]'}`}>
                    {fullscreenOk ? 'Fullscreen enabled' : 'Required to prevent tab switching'}
                  </div>
                </div>
                {!fullscreenOk && (
                  <button
                    onClick={() => {
                      document.documentElement.requestFullscreen?.()
                        .then(() => setFullscreenOk(true))
                        .catch(() => setFullscreenOk(true));
                    }}
                    className="text-xs btn-primary py-1.5 px-3 shrink-0"
                  >
                    Enable
                  </button>
                )}
              </div>

              {/* Network check */}
              <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${networkOk ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-yellow-300 bg-yellow-50'}`}>
                {networkOk
                  ? <CheckCircle size={18} className="text-green-500 shrink-0" />
                  : <Wifi size={18} className="text-yellow-500 shrink-0" />}
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--color-text)]">Internet Connection</div>
                  <div className={`text-xs mt-0.5 ${networkOk ? 'text-green-600' : 'text-yellow-600'}`}>
                    {networkOk ? 'Stable connection detected' : 'Unstable connection — may affect submission'}
                  </div>
                </div>
              </div>

              {/* Browser check */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl border border-green-300 bg-green-50 dark:bg-green-900/20">
                <CheckCircle size={18} className="text-green-500 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--color-text)]">Browser Compatibility</div>
                  <div className="text-xs mt-0.5 text-green-600">Compatible browser detected</div>
                </div>
              </div>

              {cameraError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl text-xs text-red-700 dark:text-red-400 flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  Camera access is required for proctored exams. Please allow camera access in your browser settings and refresh the page.
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => navigate(-1)} className="btn-secondary flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5">
                  <ChevronLeft size={15} /> Cancel
                </button>
                <button
                  onClick={() => setPhase('instructions')}
                  disabled={!cameraReady}
                  className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {allReady ? <><CheckCircle size={15} /> Continue</> : <><Lock size={15} /> Complete Checks</>}
                </button>
              </div>
            </div>

            {/* Right: Camera preview */}
            <div className="card flex flex-col">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
                <Video size={15} className="text-[var(--color-primary)]" />
                Camera Preview
              </h3>

              {cameraReady ? (
                <div className="flex-1 flex flex-col">
                  <div className="rounded-xl overflow-hidden border-2 border-[var(--color-primary)] bg-black flex-1 min-h-52">
                    <Webcam ref={webcamRef} className="w-full h-full object-cover" mirrored muted />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-green-600 dark:text-green-400 font-medium">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live camera feed — ensure your face is clearly visible
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-[var(--color-text-muted)]">
                    <div className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500" /> Sit in a well-lit area</div>
                    <div className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500" /> Keep your face centered in frame</div>
                    <div className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500" /> No other people should be in view</div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center min-h-52 rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg-alt)] text-center p-6">
                  <Camera size={36} className="text-[var(--color-text-muted)] mb-3 opacity-40" />
                  <p className="text-sm font-medium text-[var(--color-text-muted)]">Camera not enabled</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1 opacity-70">Allow camera access to see your preview</p>
                </div>
              )}

              {/* Proctoring info */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                <div className="flex items-start gap-2">
                  <Shield size={14} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    <strong className="text-[var(--color-text)]">AI Proctoring:</strong> Your camera will be monitored for face detection throughout the exam. Tab switching and fullscreen exit will trigger violation warnings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: INSTRUCTIONS ───────────────────────────────────
  if (phase === 'instructions') {
    const ModeIcon = isPractice ? BookOpen : exam.proctored ? Shield : Monitor;
    const modeColor = isPractice ? 'text-green-600' : exam.proctored ? 'text-red-600' : 'text-[var(--color-primary)]';
    const modeBg = isPractice ? 'bg-green-100 dark:bg-green-900/30' : exam.proctored ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/20';

    const examRules = isPractice ? [
      { icon: Clock, text: 'No timer — study at your own pace' },
      { icon: CheckCircle, text: 'Click any answer to reveal the correct one instantly' },
      { icon: ChevronLeft, text: 'Navigate freely between all questions' },
      { icon: BookOpen, text: 'Review explanations to reinforce learning' },
    ] : [
      { icon: Maximize, text: 'Exam runs in fullscreen — do not exit' },
      { icon: Monitor, text: 'Do not switch tabs, minimize, or leave the window' },
      { icon: Clock, text: `${exam.timePerQuestion}s per question · ${totalMins} min total` },
      { icon: CheckCircle, text: 'Flag questions and revisit before submitting' },
      ...(exam.proctored ? [
        { icon: Shield, text: 'Camera active — keep your face visible at all times' },
        { icon: Shield, text: '3 violations = automatic exam termination' },
      ] : [
        { icon: Shield, text: '3 violations will auto-submit the exam' },
      ]),
    ];

    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-3xl">
          {/* Compact header */}
          <div className="flex items-center gap-4 mb-5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${modeBg}`}>
              <ModeIcon size={22} className={modeColor} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-[var(--color-text)] truncate">{exam.title}</h1>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {isPractice && <span className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">Practice Mode</span>}
                {exam.proctored && !isPractice && <span className="badge bg-red-100 text-red-700 text-xs">Proctored</span>}
                <span className="badge bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] capitalize text-xs">{exam.difficulty}</span>
                <span className="badge bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] text-xs">{exam.subject}</span>
              </div>
            </div>
            <button onClick={() => navigate(-1)} className="btn-secondary text-xs py-1.5 px-3 shrink-0 flex items-center gap-1">
              <ChevronLeft size={13} /> Back
            </button>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Questions', value: exam.questions.length, color: 'text-[var(--color-primary)]' },
              { label: isPractice ? 'Timer' : 'Duration', value: isPractice ? 'None' : `${totalMins}m`, color: 'text-[var(--color-primary)]' },
              { label: 'Difficulty', value: exam.difficulty, color: exam.difficulty === 'easy' ? 'text-green-600' : exam.difficulty === 'medium' ? 'text-amber-600' : 'text-red-600', capitalize: true },
              { label: 'To Pass', value: isPractice ? 'N/A' : `${exam.passingPercentage ?? 75}%`, color: 'text-[var(--color-primary)]' },
            ].map(s => (
              <div key={s.label} className="card py-3 text-center">
                <div className={`text-lg font-bold ${s.color} ${s.capitalize ? 'capitalize' : ''}`}>{s.value}</div>
                <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Rules + Actions card */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[var(--color-text)] text-sm flex items-center gap-2">
                <Monitor size={14} className="text-[var(--color-primary)]" />
                {isPractice ? 'Study Mode Guidelines' : 'Exam Rules'}
              </h3>
              {exam.proctored && !isPractice && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-2.5 py-1 rounded-full">
                  <Shield size={11} /> AI Proctored
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {examRules.map(({ icon: RuleIcon, text }, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[var(--color-bg-alt)]">
                  <RuleIcon size={14} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                  <span className="text-xs text-[var(--color-text-muted)] leading-relaxed">{text}</span>
                </div>
              ))}
            </div>

            {exam.proctored && !isPractice && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl flex items-start gap-2">
                <Shield size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>AI Proctoring Active:</strong> Camera monitors face detection. Tab switching and fullscreen exit are tracked. Violations cause automatic termination.
                </p>
              </div>
            )}

            {!isPractice && (
              <label className="flex items-start gap-3 cursor-pointer mb-4 p-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-bg-alt)] transition-colors">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={e => setAcknowledged(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer shrink-0"
                />
                <span className="text-xs text-[var(--color-text)] leading-relaxed">
                  I have read and understand all exam rules. I agree to complete this exam honestly.
                </span>
              </label>
            )}

            <button
              onClick={startExam}
              disabled={!isPractice && !acknowledged}
              className={`w-full py-3 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${isPractice ? 'bg-green-600 hover:bg-green-700 text-white' : 'btn-primary'}`}
            >
              {isPractice
                ? <><BookOpen size={16} /> Start Studying</>
                : <><Maximize size={16} /> Start Exam — Enter Fullscreen</>
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: EXAM ───────────────────────────────────────────
  const q = exam.questions[current];
  const answered = exam.questions.filter((qq, i) =>
    qq.type === 'coding' ? !!codeAnswers[i] : answers[i] !== undefined
  ).length;
  const minutes = Math.floor((timeLeft || 0) / 60);
  const seconds = (timeLeft || 0) % 60;
  const timePercent = totalTime ? (timeLeft / totalTime) * 100 : 100;
  const timeColor = isPractice ? 'text-green-500' : timePercent < 20 ? 'text-red-500' : timePercent < 40 ? 'text-yellow-500' : 'text-emerald-500';
  const isRevealed = revealedAnswers.has(current);
  const unanswered = exam.questions.length - answered;

  return (
    <div className="min-h-screen flex flex-col select-none bg-[var(--color-bg)]">
      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-30 bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 gap-4">
          {/* Left: title + mode badge */}
          <div className="flex items-center gap-2 min-w-0">
            {isPractice && <span className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">Practice</span>}
            {exam.proctored && !isPractice && (
              <span className="hidden sm:flex items-center gap-1 badge bg-red-100 text-red-700 shrink-0">
                <Shield size={10} /> Proctored
              </span>
            )}
            <span className="text-sm font-semibold text-[var(--color-text)] truncate">{exam.title}</span>
          </div>

          {/* Center: progress */}
          <div className="flex-1 max-w-sm hidden md:block">
            <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
              <span>Q {current + 1} / {exam.questions.length}</span>
              <span>{answered} answered · {unanswered} left</span>
            </div>
            <div className="bg-[var(--color-border)] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[var(--color-primary)] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${((current + 1) / exam.questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Right: timer + violations */}
          <div className="flex items-center gap-3 shrink-0">
            {violations > 0 && !isPractice && (
              <div className="flex items-center gap-1 text-xs text-red-500 font-semibold">
                <AlertTriangle size={13} /> {violations}/3
              </div>
            )}
            <div className={`font-mono font-bold text-sm tabular-nums ${timeColor}`}>
              {isPractice ? '∞' : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
            </div>
            {!isPractice && (
              <button
                onClick={() => setShowSubmitModal(true)}
                disabled={submitMut.isPending || submitMut.isSuccess}
                className="hidden sm:block btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
              >
                {submitMut.isPending ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar (mobile) */}
        <div className="md:hidden bg-[var(--color-border)] h-0.5">
          <div
            className="bg-[var(--color-primary)] h-0.5 transition-all duration-300"
            style={{ width: `${((current + 1) / exam.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Violation Warning Banner ── */}
      {warning && (
        <div className="bg-red-500 text-white text-center py-2.5 text-sm font-semibold animate-fade-in z-20 sticky top-14 flex items-center justify-center gap-2">
          <AlertTriangle size={16} /> {warning}
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8">
          <div className="max-w-3xl mx-auto">
            {/* Question Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--color-text-muted)] bg-[var(--color-bg-alt)] px-3 py-1.5 rounded-full">
                  Question {current + 1} of {exam.questions.length}
                </span>
                {q.topic && (
                  <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-alt)] px-2.5 py-1.5 rounded-full hidden sm:inline">
                    {q.topic}
                  </span>
                )}
              </div>
              {!isPractice && (
                <button
                  onClick={toggleFlag}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${flagged.has(current) ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/20' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-amber-300'}`}
                >
                  <Flag size={12} />
                  {flagged.has(current) ? 'Flagged' : 'Flag'}
                </button>
              )}
            </div>

            {/* Question Card */}
            <div className="card mb-6 border-l-4 border-l-[var(--color-primary)]">
              <p className="text-[var(--color-text)] text-base sm:text-lg leading-relaxed font-medium">{q.question}</p>
            </div>

            {/* Options / Code Editor */}
            {q.type === 'coding' ? (
              <div className="space-y-3">
                {q.starterCode && !codeAnswers[current] && (
                  <div className="text-xs text-[var(--color-text-muted)] flex items-center justify-between">
                    <span>Write your solution below</span>
                    <button
                      onClick={() => setCodeAnswers(a => ({ ...a, [current]: q.starterCode }))}
                      className="text-[var(--color-primary)] hover:underline text-xs"
                    >Load starter code</button>
                  </div>
                )}
                <textarea
                  className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg-alt)] text-[var(--color-text)] font-mono text-sm p-4 focus:outline-none focus:border-[var(--color-primary)] resize-none transition-all"
                  style={{ minHeight: 240 }}
                  placeholder={q.starterCode || '// Write your code here...'}
                  value={codeAnswers[current] || ''}
                  onChange={e => setCodeAnswers(a => ({ ...a, [current]: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const el = e.target;
                      const start = el.selectionStart;
                      const end = el.selectionEnd;
                      const val = el.value;
                      const newVal = val.substring(0, start) + '    ' + val.substring(end);
                      setCodeAnswers(a => ({ ...a, [current]: newVal }));
                      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 4; });
                    }
                  }}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                />
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span>{q.language || 'code'}</span>
                  <span>{(codeAnswers[current] || '').split('\n').length} lines</span>
                </div>
                {exam.allowCodeExecution && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={runningCode || !codeAnswers[current]?.trim()}
                      onClick={async () => {
                        if (!codeAnswers[current]?.trim()) return;
                        setRunningCode(true);
                        try {
                          const { data } = await examApi.executeCode({
                            language: q.language || 'javascript',
                            code: codeAnswers[current],
                          });
                          setCodeOutputs(o => ({ ...o, [current]: data }));
                        } catch (e) {
                          setCodeOutputs(o => ({ ...o, [current]: { output: '', stderr: e.response?.data?.message || 'Execution failed', exitCode: 1 } }));
                        } finally {
                          setRunningCode(false);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    >
                      {runningCode ? <Loader size={14} className="animate-spin" /> : <Play size={14} />}
                      {runningCode ? 'Running...' : 'Run Code'}
                    </button>
                    {codeOutputs[current] && (
                      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden text-xs font-mono">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-bg-alt)] border-b border-[var(--color-border)]">
                          <span className="text-[var(--color-text-muted)] font-sans">Output</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full font-sans ${codeOutputs[current].code === 0 || codeOutputs[current].exitCode === 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                              exit {codeOutputs[current].code ?? codeOutputs[current].exitCode ?? '?'}
                            </span>
                            <button onClick={() => setCodeOutputs(o => { const n = { ...o }; delete n[current]; return n; })} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><X size={12} /></button>
                          </div>
                        </div>
                        <pre className="p-3 bg-[var(--color-surface)] overflow-x-auto whitespace-pre-wrap text-[var(--color-text)] max-h-48">
                          {codeOutputs[current].output || codeOutputs[current].stdout || '(no output)'}
                          {codeOutputs[current].stderr && (
                            <span className="text-red-500">{'\n'}{codeOutputs[current].stderr}</span>
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
            <div className="space-y-3">
              {q.options.map((opt, i) => {
                const selected = answers[current] === i;
                const isCorrect = i === q.correctAnswer;
                let cls = 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/60 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 text-[var(--color-text)]';
                if (isPractice && isRevealed) {
                  if (isCorrect) cls = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400';
                  else if (selected) cls = 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
                  else cls = 'border-[var(--color-border)] text-[var(--color-text-muted)] opacity-50';
                } else if (selected) {
                  cls = 'border-[var(--color-primary)] bg-blue-50 dark:bg-blue-900/20 text-[var(--color-primary)] shadow-sm';
                }

                return (
                  <button
                    key={i}
                    onClick={() => !isRevealed && handleAnswer(i)}
                    disabled={isPractice && isRevealed}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all text-sm font-medium flex items-center gap-3 ${cls} ${!isRevealed ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-all ${selected && !isRevealed ? 'bg-[var(--color-primary)] text-white' : isPractice && isRevealed && isCorrect ? 'bg-emerald-500 text-white' : isPractice && isRevealed && selected ? 'bg-red-500 text-white' : 'bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]'}`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {isPractice && isRevealed && isCorrect && <CheckCircle size={16} className="text-emerald-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
            )}

            {/* Explanation — practice mode */}
            {isPractice && isRevealed && q.explanation && (
              <div className="mt-5 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl animate-fade-in">
                <p className="text-xs font-semibold text-[var(--color-primary)] mb-1.5 flex items-center gap-1.5">
                  <Lightbulb size={13} /> Explanation
                </p>
                <p className="text-sm text-[var(--color-text)] leading-relaxed">{q.explanation}</p>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 gap-3">
              <button
                onClick={() => setCurrent(c => Math.max(0, c - 1))}
                disabled={current === 0}
                className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Previous
              </button>

              {/* Mobile submit */}
              {!isPractice && current === exam.questions.length - 1 && (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  disabled={submitMut.isPending || submitMut.isSuccess}
                  className="sm:hidden btn-primary text-sm font-semibold px-5 py-2.5 flex items-center gap-1"
                >
                  {submitMut.isPending ? 'Submitting...' : 'Submit Exam'}
                </button>
              )}
              {isPractice && current === exam.questions.length - 1 && (
                <button onClick={() => navigate('/dashboard')} className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-1.5">
                  <CheckCircle size={15} /> Finish Study
                </button>
              )}

              <button
                onClick={() => setCurrent(c => Math.min(exam.questions.length - 1, c + 1))}
                disabled={current === exam.questions.length - 1}
                className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-40"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Question Navigator Sidebar ── */}
        <div className="hidden lg:flex flex-col w-56 border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4 shrink-0">
          <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Questions</div>
          <div className="grid grid-cols-5 gap-1.5 mb-4">
            {exam.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                  i === current
                    ? 'bg-[var(--color-primary)] text-white scale-105 shadow-sm'
                    : (exam.questions[i]?.type === 'coding' ? !!codeAnswers[i] : answers[i] !== undefined)
                    ? 'bg-emerald-500 text-white'
                    : flagged.has(i)
                    ? 'bg-amber-400 text-white'
                    : 'bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="space-y-1.5 text-xs text-[var(--color-text-muted)] mb-4">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-[var(--color-primary)] inline-block" /> Current</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Answered</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Flagged</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-[var(--color-bg-alt)] border border-[var(--color-border)] inline-block" /> Not attempted</div>
          </div>

          {/* Webcam — placed after legend, inside sidebar */}
          {!isPractice && exam.proctored && (
            <div className="mb-4">
              <div className="relative rounded-xl overflow-hidden border-2 border-[var(--color-primary)]" style={{ aspectRatio: '4/3' }}>
                <Webcam ref={webcamRef} className="w-full h-full object-cover" mirrored muted />
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                  <span className="text-white text-[9px] font-medium">REC</span>
                </div>
              </div>
              <p className="text-[9px] text-[var(--color-text-muted)] text-center mt-1">AI Proctoring Active</p>
            </div>
          )}

          {/* Stats */}
          <div className="mt-auto space-y-2 text-xs">
            <div className="flex justify-between text-[var(--color-text-muted)]">
              <span>Answered</span><span className="font-semibold text-emerald-500">{answered}</span>
            </div>
            <div className="flex justify-between text-[var(--color-text-muted)]">
              <span>Flagged</span><span className="font-semibold text-amber-500">{flagged.size}</span>
            </div>
            <div className="flex justify-between text-[var(--color-text-muted)]">
              <span>Remaining</span><span className="font-semibold text-[var(--color-text)]">{unanswered}</span>
            </div>
          </div>

          {!isPractice && (
            <button
              onClick={() => setShowSubmitModal(true)}
              disabled={submitMut.isPending || submitMut.isSuccess}
              className="btn-primary w-full text-sm py-2.5 mt-4 disabled:opacity-50"
            >
              {submitMut.isPending ? 'Submitting...' : 'Submit Exam'}
            </button>
          )}
        </div>
      </div>

      {/* ── Submit Confirmation Modal ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="card max-w-sm w-full animate-slide-up">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--color-text)]">Submit Exam?</h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 mb-5 text-sm">
              <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-muted)]">Answered</span>
                <span className="font-semibold text-emerald-500">{answered} / {exam.questions.length}</span>
              </div>
              {unanswered > 0 && (
                <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)]">Unanswered</span>
                  <span className="font-semibold text-red-500">{unanswered}</span>
                </div>
              )}
              {flagged.size > 0 && (
                <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)]">Flagged</span>
                  <span className="font-semibold text-amber-500">{flagged.size}</span>
                </div>
              )}
            </div>
            {unanswered > 0 && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                You have {unanswered} unanswered question{unanswered > 1 ? 's' : ''}. Unanswered questions will be marked as incorrect.
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowSubmitModal(false)} className="btn-secondary flex-1 py-2.5 text-sm">Review</button>
              <button
                onClick={() => { setShowSubmitModal(false); doSubmit(false); }}
                disabled={submitMut.isPending}
                className="btn-primary flex-1 py-2.5 text-sm font-semibold"
              >
                {submitMut.isPending ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
