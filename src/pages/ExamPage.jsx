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
  Chrome,
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
import * as faceapi from 'face-api.js';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import toast from 'react-hot-toast';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import { examApi, instructorApi, resultApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';
import { getDashboardPath } from '../utils/dashboardPath.js';

// ─── Phases ───────────────────────────────────────────────
// LOADING → (invite ? INVITE_ACCEPT) → (proctored ? PREFLIGHT : INSTRUCTIONS) → INSTRUCTIONS → EXAM

export default function ExamPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
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
  const [proctoringEvents, setProctoringEvents] = useState([]);
  const [codeAnswers, setCodeAnswers] = useState({});
  const [textAnswers, setTextAnswers] = useState({});
  const [codeOutputs, setCodeOutputs] = useState({}); // { [questionIndex]: { output, stderr, exitCode } }
  const [runningCode, setRunningCode] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState(new Set());
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // Preflight state
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState(null);
  const [networkOk, setNetworkOk] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [fullscreenOk, setFullscreenOk] = useState(false);

  // Live network status (used in preflight)
  useEffect(() => {
    const update = () => setNetworkOk(typeof navigator !== 'undefined' ? navigator.onLine : true);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // Refs — stale-closure-safe
  const answersRef = useRef({});
  const flaggedRef = useRef(new Set());
  const violationsRef = useRef(0);
  const lastViolationTime = useRef(0);
  const lastViolationByTypeRef = useRef({});
  const startedAt = useRef(null);
  const timerRef = useRef(null);
  const webcamRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const faceCheckInterval = useRef(null);
  const codeAnswersRef = useRef({});
  const textAnswersRef = useRef({});
  const screenshotCountRef = useRef(0);
  const screenshotIntervalRef = useRef(null);
  const proctoringEventsRef = useRef([]);
  const qTimeAccumRef = useRef({});
  const qSegmentStartRef = useRef(null);
  const lastQuestionIdxRef = useRef(0);
  const phaseWasExamRef = useRef(false);
  const audioMonitorIntervalRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const faceApiReadyRef = useRef(false);
  const cocoModelRef = useRef(null);
  const objectCheckIntervalRef = useRef(null);
  const fullscreenRestoreTimerRef = useRef(null);
  const examShellRef = useRef(null);
  const [needsFullscreenReturn, setNeedsFullscreenReturn] = useState(false);

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
    queryKey: ['exam', id, isPractice ? 'practice' : 'live'],
    queryFn: () =>
      examApi
        .getById(id, isPractice ? { params: { practice: 'true' } } : {})
        .then(r => r.data),
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
    const currentTextAnswers = textAnswersRef.current;
    const currentProctoringEvents = proctoringEventsRef.current;

    if (!exam) return;
    // Flush active question segment into accumulators
    if (phaseWasExamRef.current && qSegmentStartRef.current != null && exam.questions?.length) {
      const now = Date.now();
      const dt = Math.round((now - qSegmentStartRef.current) / 1000);
      const li = lastQuestionIdxRef.current;
      if (dt > 0 && li >= 0 && exam.questions[li]) {
        qTimeAccumRef.current[li] = (qTimeAccumRef.current[li] || 0) + dt;
      }
      qSegmentStartRef.current = null;
    }
    const answersArray = exam.questions.map((_, i) => ({
      questionIndex: i,
      selectedOption: currentAnswers[i] ?? null,
      code: currentCodeAnswers[i] || '',
      textAnswer: currentTextAnswers[i] || '',
      flagged: currentFlagged.has(i),
      timeTaken: Math.max(0, Math.round(Number(qTimeAccumRef.current[i]) || 0)),
      isCorrect: false,
    }));
    submitMut.mutate({ examId: id, answers: answersArray, timeTaken, violations: currentViolations, proctoringEvents: currentProctoringEvents });
  }, [submitMut, exam, id, phase]);

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

  const pushProctoringEvent = useCallback((event) => {
    const payload = {
      type: event.type || 'violation',
      severity: event.severity || 'warning',
      source: event.source || 'client',
      message: event.message || 'Proctoring event',
      timestamp: new Date().toISOString(),
    };
    setProctoringEvents(prev => [...prev.slice(-499), payload]);
  }, []);

  const raiseViolation = useCallback((reason, meta = {}) => {
    const now = Date.now();
    const typeKey = meta.type || 'violation';
    const cooldown = meta.cooldownMs ?? 1200;
    const lastByType = lastViolationByTypeRef.current[typeKey] || 0;
    if (now - lastByType < cooldown) return;
    lastViolationByTypeRef.current[typeKey] = now;

    const shouldCount = meta.count !== false;
    if (shouldCount) {
      violationsRef.current += 1;
      setViolations(violationsRef.current);
    }
    pushProctoringEvent({
      type: meta.type || 'violation',
      source: meta.source || 'runtime',
      severity: shouldCount
        ? (violationsRef.current >= 3 ? 'critical' : violationsRef.current === 2 ? 'warning' : 'info')
        : (meta.severity || 'info'),
      message: reason,
    });

    if (shouldCount && violationsRef.current >= 3) {
      setWarning(`${reason} — 3 violations reached. Auto-submitting…`);
      setTimeout(() => doSubmit(true), 1200);
    } else if (shouldCount && violationsRef.current === 2) {
      setWarning(`${reason} FINAL WARNING — next violation will auto-submit.`);
      setTimeout(() => setWarning(null), 5000);
    } else if (shouldCount) {
      setWarning(`${reason} Violation 1/3 — 2 more will auto-submit.`);
      setTimeout(() => setWarning(null), 3500);
    } else {
      setWarning(reason);
      setTimeout(() => setWarning(null), 2500);
    }
  }, [doSubmit, pushProctoringEvent]);

  // ── Proctoring effects ────────────────────────────────────
  useEffect(() => {
    if (phase !== 'exam' || isPractice) return;

    // Visibility / tab switch
    const onVisChange = () => {
      if (document.hidden) raiseViolation('Tab switch detected!', { type: 'tab_switch', source: 'visibility' });
    };

    // Window blur (alt-tab, switching apps)
    const onBlur = () => raiseViolation('Window focus lost!', { type: 'window_blur', source: 'window' });

    const onFSChange = () => {
      if (!exam?.proctored) return;
      if (document.fullscreenElement) {
        if (fullscreenRestoreTimerRef.current) {
          clearTimeout(fullscreenRestoreTimerRef.current);
          fullscreenRestoreTimerRef.current = null;
        }
        setNeedsFullscreenReturn(false);
        setWarning(null);
        return;
      }
      if (fullscreenRestoreTimerRef.current) {
        clearTimeout(fullscreenRestoreTimerRef.current);
        fullscreenRestoreTimerRef.current = null;
      }
      pushProctoringEvent({
        type: 'fullscreen_exit',
        source: 'fullscreen',
        severity: 'warning',
        message: 'Exited fullscreen during exam',
      });
      setNeedsFullscreenReturn(true);
      setWarning('Fullscreen is required during this exam. Use “Return to fullscreen” to continue.');
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
      if (fullscreenRestoreTimerRef.current) {
        clearTimeout(fullscreenRestoreTimerRef.current);
        fullscreenRestoreTimerRef.current = null;
      }
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
  }, [phase, isPractice, exam?.proctored, raiseViolation, pushProctoringEvent]);

  useEffect(() => {
    if (phase !== 'exam' || isPractice) return undefined;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const el = examShellRef.current;
      if (!el) {
        requestAnimationFrame(run);
        return;
      }
      el.requestFullscreen?.().catch(() => {});
    };
    const id = requestAnimationFrame(() => requestAnimationFrame(run));
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [phase, isPractice]);

  // ── Camera / Face Monitoring ──────────────────────────────
  useEffect(() => {
    if (phase !== 'exam' || isPractice || !exam?.proctored) return;

    let trackRef = null;
    let onEndedRef = null;
    // Faster cadence so warnings feel immediate.
    const tickMs = 300;
    const graceMs = 900;
    const graceUntil = Date.now() + graceMs;

    let noFaceMs = 0;
    let multiFaceMs = 0;
    let darkMs = 0;
    let noVideoMs = 0;
    let mounted = true;

    // Helper: sample average brightness of the center 40×40 pixels of the video frame
    const getFrameBrightness = (video) => {
      try {
        const c = document.createElement('canvas');
        c.width = 40; c.height = 40;
        const ctx = c.getContext('2d');
        const sx = Math.max(0, (video.videoWidth / 2) - 20);
        const sy = Math.max(0, (video.videoHeight / 2) - 20);
        ctx.drawImage(video, sx, sy, 40, 40, 0, 0, 40, 40);
        const d = ctx.getImageData(0, 0, 40, 40).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
        return sum / (d.length / 4); // 0–255
      } catch { return 128; }
    };

    // ── 1. Stream track monitoring: detect camera closed / revoked ──
    const attachTrackListener = () => {
      const stream = webcamRef.current?.stream || webcamRef.current?.video?.srcObject;
      const track = stream?.getVideoTracks()?.[0];
      if (!track) return false;
      onEndedRef = () => raiseViolation('Camera was closed!', { type: 'camera_closed', source: 'camera', cooldownMs: 800 });
      track.addEventListener('ended', onEndedRef);
      trackRef = track;
      return true;
    };

    if (!attachTrackListener()) {
      let retries = 0;
      const retryId = setInterval(() => {
        if (attachTrackListener() || retries++ > 10) clearInterval(retryId);
      }, 500);
    }

    // ── 2. Initialize face-api.js (TinyFaceDetector) ──
    const initFaceApi = async () => {
      try {
        // Warm up TF backend (helps reduce first-detect lag)
        await tf.ready();
        await tf.setBackend('webgl').catch(() => {});
        await tf.ready();

        const modelUrl = '/models/face-api';
        await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
        faceApiReadyRef.current = true;
      } catch {
        faceApiReadyRef.current = false;
      }
    };

    // Fallback: FaceDetector (Chrome only) if face-api fails
    if ('FaceDetector' in window) {
      try { faceDetectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 }); }
      catch { faceDetectorRef.current = null; }
    }

    initFaceApi();

    // ── 3. Face checks with stability + tolerance ──
    faceCheckInterval.current = setInterval(async () => {
      if (!mounted) return;
      if (submitMut.isPending || submitMut.isSuccess) return;
      if (Date.now() < graceUntil) return;

      // Track state check
      const video = webcamRef.current?.video;
      const stream = webcamRef.current?.stream || video?.srcObject;
      const track = stream?.getVideoTracks?.()?.[0];
      const streamActive = !!stream && (stream.active !== false);
      const trackEnded = !!track && track.readyState === 'ended';
      const trackMuted = !!track && track.muted === true;
      const trackDisabled = !!track && track.enabled === false;

      if (!stream || !track || !streamActive || trackEnded || trackMuted || trackDisabled) {
        noVideoMs += tickMs;
        // Soft prompt quickly so user knows camera is not active
        if (noVideoMs >= 600) {
          raiseViolation('Camera feed not active. Please turn on the camera.', { type: 'camera_inactive_warn', source: 'camera', count: false, cooldownMs: 2000 });
        }
        // Count as violation if it stays off
        if (noVideoMs >= 1500) {
          raiseViolation('Camera was closed or blocked.', { type: 'camera_closed', source: 'camera', cooldownMs: 2500 });
          noVideoMs = 0;
        }
        return;
      }

      // Ensure we have actual frames (some browsers keep a stream but stop delivering frames)
      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        noVideoMs += tickMs;
        if (noVideoMs >= 600) {
          raiseViolation('Camera feed not active. Please turn on the camera.', { type: 'camera_inactive_warn', source: 'camera', count: false, cooldownMs: 2000 });
        }
        if (noVideoMs >= 1500) {
          raiseViolation('Camera was closed or blocked.', { type: 'camera_closed', source: 'camera', cooldownMs: 2500 });
          noVideoMs = 0;
        }
        return;
      }
      noVideoMs = 0;

      // Camera blocked check (very dark frame)
      const brightness = getFrameBrightness(video);
      if (brightness < 5) darkMs += tickMs;
      else darkMs = 0;
      if (darkMs >= 900) {
        // warn first, then count if persists much longer
        raiseViolation('Camera appears very dark/covered. Improve lighting or uncover the camera.', { type: 'camera_blocked_warn', source: 'camera', count: false, cooldownMs: 3000 });
      }
      if (darkMs >= 2400) {
        raiseViolation('Camera appears to be covered for a long duration.', { type: 'camera_blocked', source: 'camera', cooldownMs: 4500 });
        darkMs = 0;
        return;
      }

      // Primary: face-api.js TinyFaceDetector
      if (faceApiReadyRef.current) {
        try {
          // More stable settings to reduce false negatives in Chrome
          const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
          const faces = await faceapi.detectAllFaces(video, opts);
          if (!mounted || submitMut.isPending || submitMut.isSuccess) return;

          if (!faces || faces.length === 0) {
            noFaceMs += tickMs;
            multiFaceMs = 0;

            // Soft warning after short continuous miss
            if (noFaceMs >= 600) {
              raiseViolation('Face not detected. Please keep your face clearly visible.', { type: 'no_face_warn', source: 'face-api', count: false, cooldownMs: 2500 });
            }
            // Count only if it persists longer (prevents false positives terminating exams)
            if (noFaceMs >= 1500) {
              raiseViolation('Face missing for too long. Keep your face visible at all times.', { type: 'no_face', source: 'face-api', cooldownMs: 4500 });
              noFaceMs = 0;
            }
          } else if (faces.length > 1) {
            noFaceMs = 0;
            multiFaceMs += tickMs;
            if (multiFaceMs >= 600) {
              raiseViolation(`Multiple faces detected (${faces.length}). Ensure only you are in frame.`, { type: 'multiple_faces_warn', source: 'face-api', count: false, cooldownMs: 2500 });
            }
            if (multiFaceMs >= 1200) {
              raiseViolation(`Multiple faces detected (${faces.length}). Only the candidate must be visible.`, { type: 'multiple_faces', source: 'face-api', cooldownMs: 4500 });
              multiFaceMs = 0;
            }
          } else {
            noFaceMs = 0;
            multiFaceMs = 0;
          }
          return;
        } catch {
          // fall through to FaceDetector
        }
      }

      // Fallback: Chrome FaceDetector
      if (faceDetectorRef.current) {
        faceDetectorRef.current.detect(video).then((faces) => {
          if (!mounted || submitMut.isPending || submitMut.isSuccess) return;
          if (!faces || faces.length === 0) {
            noFaceMs += tickMs;
            multiFaceMs = 0;
            if (noFaceMs >= 600) {
              raiseViolation('Face not detected. Please keep your face clearly visible.', { type: 'no_face_warn', source: 'face_detector', count: false, cooldownMs: 2500 });
            }
            if (noFaceMs >= 1500) {
              raiseViolation('Face missing for too long. Keep your face visible at all times.', { type: 'no_face', source: 'face_detector', cooldownMs: 4500 });
              noFaceMs = 0;
            }
          } else if (faces.length > 1) {
            noFaceMs = 0;
            multiFaceMs += tickMs;
            if (multiFaceMs >= 600) {
              raiseViolation(`Multiple faces detected (${faces.length}). Ensure only you are in frame.`, { type: 'multiple_faces_warn', source: 'face_detector', count: false, cooldownMs: 2500 });
            }
            if (multiFaceMs >= 1200) {
              raiseViolation(`Multiple faces detected (${faces.length}). Only the candidate must be visible.`, { type: 'multiple_faces', source: 'face_detector', cooldownMs: 4500 });
              multiFaceMs = 0;
            }
          } else {
            noFaceMs = 0;
            multiFaceMs = 0;
          }
        }).catch(() => {});
      }
    }, tickMs);

    // ── 4. Object detection (coco-ssd) every ~1.2s ──
    const initCoco = async () => {
      try {
        await tf.ready();
        await tf.setBackend('webgl').catch(() => {});
        await tf.ready();
        cocoModelRef.current = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      } catch {
        cocoModelRef.current = null;
      }
    };
    initCoco();

    let phoneStreak = 0;
    let laptopStreak = 0;
    let bookStreak = 0;
    let objNoVideoMs = 0;

    objectCheckIntervalRef.current = setInterval(async () => {
      if (!mounted) return;
      if (submitMut.isPending || submitMut.isSuccess) return;
      const model = cocoModelRef.current;
      const video = webcamRef.current?.video;
      const stream = webcamRef.current?.stream || video?.srcObject;
      const track = stream?.getVideoTracks?.()?.[0];

      if (!model) return;
      if (!stream || !track || track.readyState === 'ended' || track.muted === true || track.enabled === false || !video || video.readyState < 2 || video.videoWidth === 0) {
        objNoVideoMs += 1200;
        if (objNoVideoMs >= 2400) {
          raiseViolation('Camera feed not active, object detection paused.', { type: 'object_detection_paused', source: 'coco-ssd', count: false, cooldownMs: 3000 });
          objNoVideoMs = 0;
        }
        return;
      }
      objNoVideoMs = 0;

      try {
        const preds = await model.detect(video);
        if (!mounted || submitMut.isPending || submitMut.isSuccess) return;
        const top = (cls) => preds.find(p => p.class === cls && (p.score || 0) >= 0.5);

        const hasPhone = !!top('cell phone');
        const hasLaptop = !!(top('laptop') || top('tv') || top('monitor'));
        const hasBook = !!top('book');

        phoneStreak = hasPhone ? phoneStreak + 1 : 0;
        laptopStreak = hasLaptop ? laptopStreak + 1 : 0;
        bookStreak = hasBook ? bookStreak + 1 : 0;

        if (phoneStreak === 1) {
          raiseViolation('Possible mobile phone detected. Ensure no phone is in frame.', { type: 'phone_warn', source: 'coco-ssd', count: false, cooldownMs: 2500 });
        } else if (phoneStreak >= 2) {
          raiseViolation('Mobile phone detected in frame. Please remove it immediately.', { type: 'phone', source: 'coco-ssd', cooldownMs: 4500 });
          phoneStreak = 0;
        }

        if (laptopStreak === 1) {
          raiseViolation('Possible laptop/secondary screen detected. Ensure only the exam screen is visible.', { type: 'laptop_warn', source: 'coco-ssd', count: false, cooldownMs: 2500 });
        } else if (laptopStreak >= 2) {
          raiseViolation('Laptop/secondary screen detected. Only the exam screen is allowed.', { type: 'laptop', source: 'coco-ssd', cooldownMs: 4500 });
          laptopStreak = 0;
        }

        if (bookStreak === 1) {
          raiseViolation('Possible book/study material detected. Ensure your desk is clear.', { type: 'study_material_warn', source: 'coco-ssd', count: false, cooldownMs: 2500 });
        } else if (bookStreak >= 2) {
          raiseViolation('Book/study material detected. Remove it from your desk area.', { type: 'study_material', source: 'coco-ssd', cooldownMs: 4500 });
          bookStreak = 0;
        }
      } catch {
        // ignore per tick
      }
    }, 1200);

    return () => {
      mounted = false;
      clearInterval(faceCheckInterval.current);
      clearInterval(objectCheckIntervalRef.current);
      if (trackRef && onEndedRef) trackRef.removeEventListener('ended', onEndedRef);
    };
  }, [phase, isPractice, exam?.proctored, raiseViolation, submitMut.isPending, submitMut.isSuccess]); // eslint-disable-line

  // ── Audio Monitoring (real-time) ───────────────────────────
  useEffect(() => {
    if (phase !== 'exam' || isPractice || !exam?.proctored) return;
    let mounted = true;
    let speechLikeStreak = 0;
    let noiseStreak = 0;

    const initAudio = async () => {
      try {
        // Prefer stream granted during preflight (avoids mid-exam permission prompts)
        const stream = audioStreamRef.current || await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        audioStreamRef.current = stream;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        audioContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.3;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.fftSize);
        audioMonitorIntervalRef.current = setInterval(() => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteTimeDomainData(data);
          let sumSq = 0;
          let crossings = 0;
          for (let i = 1; i < data.length; i++) {
            const n = (data[i] - 128) / 128;
            const p = (data[i - 1] - 128) / 128;
            sumSq += n * n;
            if ((p >= 0 && n < 0) || (p < 0 && n >= 0)) crossings++;
          }
          const rms = Math.sqrt(sumSq / data.length);
          const zcr = crossings / data.length;

          if (rms > 0.18) {
            noiseStreak += 1;
            if (noiseStreak === 2) {
              raiseViolation('High background noise detected. Please move to a quieter place.', { type: 'audio_noise_warn', source: 'microphone', count: false, cooldownMs: 3000 });
            }
            if (noiseStreak >= 4) {
              raiseViolation('Excessive background noise detected on microphone.', { type: 'audio_noise', source: 'microphone', cooldownMs: 4500 });
              noiseStreak = 0;
            }
          } else {
            noiseStreak = 0;
          }

          // Heuristic: sustained high RMS + dense zero-crossings often indicates active speech around candidate
          if (rms > 0.12 && zcr > 0.18) {
            speechLikeStreak += 1;
            if (speechLikeStreak === 2) {
              raiseViolation('Possible nearby conversation detected. Please ensure a quiet environment.', { type: 'audio_voice_warn', source: 'microphone', count: false, cooldownMs: 3000 });
            }
            if (speechLikeStreak >= 4) {
              raiseViolation('Suspicious human voice activity detected near candidate.', { type: 'audio_voice', source: 'microphone', cooldownMs: 4500 });
              speechLikeStreak = 0;
            }
          } else {
            speechLikeStreak = 0;
          }
        }, 400);
      } catch {
        pushProctoringEvent({
          type: 'audio_monitor_unavailable',
          severity: 'info',
          source: 'microphone',
          message: 'Microphone access unavailable during exam.',
        });
      }
    };

    initAudio();
    return () => {
      mounted = false;
      clearInterval(audioMonitorIntervalRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      analyserRef.current = null;
      audioStreamRef.current = null;
      audioContextRef.current = null;
    };
  }, [phase, isPractice, exam?.proctored, raiseViolation, pushProctoringEvent]);

  // ── Per-question time (seconds on each question index) ─────────
  useEffect(() => {
    if (phase !== 'exam' || !exam) {
      phaseWasExamRef.current = false;
      return;
    }
    const now = Date.now();
    if (!phaseWasExamRef.current) {
      phaseWasExamRef.current = true;
      qTimeAccumRef.current = {};
      qSegmentStartRef.current = now;
      lastQuestionIdxRef.current = current;
      return;
    }
    const dt = Math.round((now - qSegmentStartRef.current) / 1000);
    const li = lastQuestionIdxRef.current;
    if (dt > 0 && li >= 0 && exam.questions?.[li]) {
      qTimeAccumRef.current[li] = (qTimeAccumRef.current[li] || 0) + dt;
    }
    qSegmentStartRef.current = now;
    lastQuestionIdxRef.current = current;
  }, [current, phase, exam]);

  // ── Keep answers/flagged/code refs in sync ─────────────────────
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { flaggedRef.current = flagged; }, [flagged]);
  useEffect(() => { codeAnswersRef.current = codeAnswers; }, [codeAnswers]);
  useEffect(() => { textAnswersRef.current = textAnswers; }, [textAnswers]);
  useEffect(() => { proctoringEventsRef.current = proctoringEvents; }, [proctoringEvents]);

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
  const requestExamFullscreen = useCallback(() => {
    const el = examShellRef.current || document.documentElement;
    el.requestFullscreen?.().catch(() => {
      setWarning('Could not enter fullscreen. Click “Return to fullscreen” again.');
    });
  }, []);

  const startExam = () => {
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
          <button onClick={() => navigate(getDashboardPath(user?.role))} className="btn-primary text-sm">Go to Dashboard</button>
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
                onClick={() => navigate(getDashboardPath(user?.role))}
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
    const allReady = cameraReady && micReady && fullscreenOk && networkOk;
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
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-alt)] text-xs text-[var(--color-text-muted)]">
              <Chrome size={14} className="text-[var(--color-primary)]" />
              Recommended browser: <span className="font-semibold text-[var(--color-text)]">Google Chrome</span>
            </div>
          </div>

          {/* Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: System checks (compact like previous UI) */}
            <div className="card space-y-2.5">
              <h3 className="text-xs font-semibold text-[var(--color-text)] mb-2 flex items-center gap-2">
                <Monitor size={14} className="text-[var(--color-primary)]" />
                System Requirements
              </h3>

              {/* Camera check */}
              <div className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                cameraReady ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                : cameraError ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                : 'border-[var(--color-border)] bg-[var(--color-bg-alt)]'
              }`}>
                {cameraReady
                  ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                  : cameraError
                  ? <CameraOff size={16} className="text-red-500 shrink-0" />
                  : <Camera size={16} className="text-[var(--color-text-muted)] shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[var(--color-text)]">Camera</div>
                  <div className={`text-[11px] mt-0.5 leading-snug ${
                    cameraReady ? 'text-green-600' : cameraError ? 'text-red-500' : 'text-[var(--color-text-muted)]'
                  }`}>
                    {cameraReady ? 'Allowed (face monitoring enabled)' : cameraError ? cameraError : 'Allow for face monitoring'}
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
                    className="text-[11px] btn-primary py-1.5 px-3 shrink-0"
                  >
                    Allow
                  </button>
                )}
              </div>

              {/* Microphone check */}
              <div className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                micReady ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                : micError ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                : 'border-[var(--color-border)] bg-[var(--color-bg-alt)]'
              }`}>
                {micReady
                  ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                  : micError
                  ? <AlertTriangle size={16} className="text-red-500 shrink-0" />
                  : <Users size={16} className="text-[var(--color-text-muted)] shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[var(--color-text)]">Microphone</div>
                  <div className={`text-[11px] mt-0.5 leading-snug ${
                    micReady ? 'text-green-600' : micError ? 'text-red-500' : 'text-[var(--color-text-muted)]'
                  }`}>
                    {micReady ? 'Allowed (audio monitoring enabled)' : micError ? micError : 'Allow for audio monitoring'}
                  </div>
                </div>
                {!micReady && !micError && (
                  <button
                    onClick={async () => {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                        audioStreamRef.current = stream;
                        setMicReady(true);
                      } catch (e) {
                        setMicError(e.name === 'NotAllowedError' ? 'Microphone access denied' : 'Microphone not available');
                      }
                    }}
                    className="text-[11px] btn-primary py-1.5 px-3 shrink-0"
                  >
                    Allow
                  </button>
                )}
              </div>

              {/* Fullscreen check */}
              <div className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                fullscreenOk ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-[var(--color-border)] bg-[var(--color-bg-alt)]'
              }`}>
                {fullscreenOk
                  ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                  : <Maximize size={16} className="text-[var(--color-text-muted)] shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[var(--color-text)]">Fullscreen</div>
                  <div className={`text-[11px] mt-0.5 leading-snug ${fullscreenOk ? 'text-green-600' : 'text-[var(--color-text-muted)]'}`}>
                    {fullscreenOk ? 'Enabled' : 'Enable to prevent switching'}
                  </div>
                </div>
                {!fullscreenOk && (
                  <button
                    onClick={() => {
                      document.documentElement.requestFullscreen?.()
                        .then(() => setFullscreenOk(true))
                        .catch(() => setFullscreenOk(true));
                    }}
                    className="text-[11px] btn-primary py-1.5 px-3 shrink-0"
                  >
                    Enable
                  </button>
                )}
              </div>

              {/* Internet check */}
              <div className={`flex items-center gap-2.5 p-3 rounded-xl border ${
                networkOk ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20'
              }`}>
                {networkOk
                  ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                  : <Wifi size={16} className="text-yellow-600 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[var(--color-text)]">Internet</div>
                  <div className={`text-[11px] mt-0.5 leading-snug ${networkOk ? 'text-green-600' : 'text-yellow-700 dark:text-yellow-300'}`}>
                    {networkOk ? 'Connected' : 'Offline — reconnect before starting'}
                  </div>
                </div>
              </div>

              {(cameraError || micError) && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl text-[11px] text-red-700 dark:text-red-400 flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    Permissions are required for proctored exams. Allow them in browser settings and refresh the page.
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1.5">
                <button onClick={() => navigate(-1)} className="btn-secondary flex-1 py-2 text-xs flex items-center justify-center gap-1.5">
                  <ChevronLeft size={14} /> Cancel
                </button>
                <button
                  onClick={() => setPhase('instructions')}
                  disabled={!allReady}
                  className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle size={14} /> Continue
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
                    <strong className="text-[var(--color-text)]">AI Proctoring:</strong> Camera and microphone are monitored in real-time (face visibility, extra person/device/material, suspicious audio, tab switching, fullscreen exit).
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
    qq.type === 'coding' ? !!codeAnswers[i] :
    qq.type === 'descriptive' ? !!(textAnswers[i]?.trim()) :
    answers[i] !== undefined
  ).length;
  const minutes = Math.floor((timeLeft || 0) / 60);
  const seconds = (timeLeft || 0) % 60;
  const timePercent = totalTime ? (timeLeft / totalTime) * 100 : 100;
  const timeColor = isPractice ? 'text-green-500' : timePercent < 20 ? 'text-red-500' : timePercent < 40 ? 'text-yellow-500' : 'text-emerald-500';
  const isRevealed = revealedAnswers.has(current);
  const unanswered = exam.questions.length - answered;

  return (
    <div ref={examShellRef} className="min-h-screen flex flex-col select-none bg-[var(--color-bg)]">
      {needsFullscreenReturn && exam.proctored && !isPractice && !document.fullscreenElement && (
        <div className="shrink-0 z-40 flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/25 border-b border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-900 dark:text-amber-100 font-medium">Fullscreen is required for this proctored exam.</p>
          <button
            type="button"
            onClick={() => {
              setWarning(null);
              requestExamFullscreen();
            }}
            className="btn-primary text-xs py-1.5 px-3 shrink-0"
          >
            Return to fullscreen
          </button>
        </div>
      )}
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
        <div className={`text-white text-center py-2.5 text-sm font-semibold animate-fade-in z-20 sticky top-14 flex items-center justify-center gap-2 ${
          violations >= 3 ? 'bg-red-600' : violations === 2 ? 'bg-orange-500' : 'bg-amber-500'
        }`}>
          <AlertTriangle size={16} />
          <span>{warning}</span>
          {violations >= 3 && (
            <span className="text-xs ml-1 opacity-90 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white animate-ping inline-block" /> Auto-submitting…
            </span>
          )}
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

            {/* Options / Code Editor / Descriptive */}
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
            ) : q.type === 'descriptive' ? (
              <div className="space-y-3">
                <div className="p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-xl text-xs text-teal-700 dark:text-teal-300 flex items-start gap-2">
                  <span>✍</span>
                  <span>Write a detailed answer below. Your response will be evaluated by AI based on accuracy, completeness, and clarity.</span>
                </div>
                <textarea
                  className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm p-4 focus:outline-none focus:border-[var(--color-primary)] resize-y transition-all leading-relaxed"
                  style={{ minHeight: 200 }}
                  placeholder="Write your answer here..."
                  value={textAnswers[current] || ''}
                  onChange={e => setTextAnswers(a => ({ ...a, [current]: e.target.value }))}
                />
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span>{(textAnswers[current] || '').split(/\s+/).filter(Boolean).length} words</span>
                  {(textAnswers[current] || '').length > 0 && (
                    <span className="text-teal-600 dark:text-teal-400">Answer saved</span>
                  )}
                </div>
                {q.keyPoints?.length > 0 && (
                  <div className="p-3 bg-[var(--color-bg-alt)] rounded-xl">
                    <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">Key concepts to address:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {q.keyPoints.map((kp, ki) => (
                        <span key={ki} className="text-xs bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">{kp}</span>
                      ))}
                    </div>
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
                <button onClick={() => navigate(getDashboardPath(user?.role))} className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-1.5">
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
                    : (exam.questions[i]?.type === 'coding' ? !!codeAnswers[i] : exam.questions[i]?.type === 'descriptive' ? !!(textAnswers[i]?.trim()) : answers[i] !== undefined)
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

          {/* Live proctoring camera (requested placement: below "Not attempted") */}
          {!isPractice && exam.proctored && (
            <div className="mb-4">
              <div className="relative rounded-xl overflow-hidden border-2 border-[var(--color-primary)] bg-black" style={{ aspectRatio: '4/3' }}>
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

      {/* Always-mounted proctoring camera (mobile + fallback, keeps video available for detection) */}
      {!isPractice && exam.proctored && (
        <div className="fixed bottom-4 right-4 z-40 w-36 sm:w-40 lg:hidden">
          <div className="relative rounded-xl overflow-hidden border-2 border-[var(--color-primary)] bg-black shadow-lg">
            <div className="aspect-[4/3]">
              <Webcam ref={webcamRef} className="w-full h-full object-cover" mirrored muted />
            </div>
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
              <span className="text-white text-[9px] font-medium">REC</span>
            </div>
            <div className="absolute bottom-1.5 left-1.5 right-1.5 text-[9px] text-white/90 bg-black/40 rounded px-1.5 py-0.5 text-center">
              Proctoring
            </div>
          </div>
        </div>
      )}

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
