/** Mirrors server FEATURE_LABELS — used when API does not send featureList. */
export const FEATURE_LABELS = {
  aiQuestionGeneration: 'AI Question Generation',
  aiRegeneration: 'AI Regeneration',
  aiFlashcards: 'AI Flashcards',
  aiExplanations: 'AI Explanations',
  mcqExams: 'MCQ Exams',
  descriptiveExams: 'Descriptive Exams',
  mixedExams: 'Mixed Exams',
  codingExams: 'Coding Exams',
  listeningExams: 'Listening Exams',
  certificates: 'Certificates',
  answerReview: 'Answer Review',
  flashcards: 'Flashcards',
  reattempts: 'Reattempts',
  resultVisibility: 'Result Visibility',
  aiProctoring: 'AI Proctoring',
  screenshotMonitoring: 'Screenshot Monitoring',
  resourceUpload: 'Resource Upload',
  aiResourceProcessing: 'AI Resource Processing',
  adminResourcesAccess: 'Admin Resources Access',
};

export const FEATURE_CATEGORIES = {
  exam: {
    label: 'Exam features',
    keys: ['mcqExams', 'descriptiveExams', 'mixedExams', 'codingExams', 'listeningExams', 'reattempts'],
  },
  ai: {
    label: 'AI features',
    keys: ['aiQuestionGeneration', 'aiRegeneration', 'aiFlashcards', 'aiExplanations', 'aiResourceProcessing'],
  },
  security: {
    label: 'Security features',
    keys: ['aiProctoring', 'screenshotMonitoring'],
  },
  reporting: {
    label: 'Reporting features',
    keys: ['certificates', 'answerReview', 'flashcards', 'resultVisibility'],
  },
  resource: {
    label: 'Resource features',
    keys: ['resourceUpload', 'adminResourcesAccess'],
  },
};

const KEY_TO_CATEGORY = Object.fromEntries(
  Object.entries(FEATURE_CATEGORIES).flatMap(([cat, { keys }]) => keys.map((k) => [k, cat])),
);

/** Default display priority (higher = shown first on cards). */
export const DEFAULT_FEATURE_PRIORITY = {
  aiQuestionGeneration: 95,
  aiProctoring: 90,
  codingExams: 88,
  resourceUpload: 85,
  certificates: 82,
  flashcards: 80,
  listeningExams: 75,
  aiResourceProcessing: 70,
  mixedExams: 65,
  mcqExams: 60,
  descriptiveExams: 58,
  answerReview: 55,
  aiRegeneration: 50,
  aiFlashcards: 48,
  aiExplanations: 46,
  screenshotMonitoring: 44,
  reattempts: 42,
  resultVisibility: 40,
  adminResourcesAccess: 35,
};

/** Shown on compact plan cards when no admin override. */
export const DEFAULT_HIGHLIGHTED_KEYS = new Set([
  'aiQuestionGeneration',
  'resourceUpload',
  'certificates',
  'flashcards',
  'aiProctoring',
  'codingExams',
]);

const HIGHLIGHT_SLOT_COUNT = 6;

export function featureLabel(key) {
  return FEATURE_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

export function featureCategory(key) {
  return KEY_TO_CATEGORY[key] || 'exam';
}

function metaForKey(planRecord, key) {
  const settings = planRecord?.featureSettings?.[key] || planRecord?.featureMeta?.[key] || {};
  const priority = Number.isFinite(Number(settings.priority))
    ? Number(settings.priority)
    : (Number.isFinite(Number(planRecord?.featurePriority?.[key]))
      ? Number(planRecord.featurePriority[key])
      : DEFAULT_FEATURE_PRIORITY[key] ?? 50);
  const highlighted = settings.highlighted === true
    || settings.isHighlighted === true
    || (Array.isArray(planRecord?.highlightedFeatures) && planRecord.highlightedFeatures.includes(key))
    || DEFAULT_HIGHLIGHTED_KEYS.has(key);
  return { priority, highlighted, category: settings.category || featureCategory(key) };
}

/** @param {Record<string, boolean>|null|undefined} features */
export function featuresToList(features, planRecord = null) {
  if (!features || typeof features !== 'object') return [];
  return Object.entries(features).map(([key, enabled]) => {
    const meta = metaForKey(planRecord, key);
    return {
      key,
      label: featureLabel(key),
      enabled: enabled !== false,
      category: meta.category,
      priority: meta.priority,
      highlighted: meta.highlighted,
    };
  });
}

/**
 * Client-side guard: only plans strictly above current sortOrder (matches server).
 */
export function filterPlansAboveSortOrder(plans, currentPlan, currentSortOrder) {
  const currentCode = String(currentPlan?.code || '').toLowerCase();
  const order = currentPlan != null
    ? Number(currentPlan.sortOrder ?? 0)
    : Number(currentSortOrder ?? -1);
  return [...(plans || [])]
    .filter((p) => {
      if (!p?.code) return false;
      if (currentCode && String(p.code).toLowerCase() === currentCode) return false;
      return Number(p.sortOrder ?? 0) > order;
    })
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
}

/** Prefer API featureList; enrich with plan record meta when present. */
export function resolveFeatureList(subData, planRecord) {
  let list = [];
  if (subData?.featureList?.length) {
    list = subData.featureList.map((f) => ({
      ...f,
      category: f.category || featureCategory(f.key),
      priority: f.priority ?? DEFAULT_FEATURE_PRIORITY[f.key] ?? 50,
      highlighted: f.highlighted ?? DEFAULT_HIGHLIGHTED_KEYS.has(f.key),
    }));
  } else if (planRecord?.features) {
    list = featuresToList(planRecord.features, planRecord);
  } else if (subData?.planFeatures) {
    list = featuresToList(subData.planFeatures, planRecord);
  }
  return list;
}

/** Limit bullets always shown first on cards. */
export function planLimitHighlights(limits) {
  if (!limits) return [];
  const rows = [];
  if (limits.examsPerMonth != null) {
    rows.push({ key: '_exams', label: `${limits.examsPerMonth} AI Exams / Month`, priority: 1000, isLimit: true });
  }
  if (limits.questionsPerExam != null) {
    rows.push({ key: '_questions', label: `${limits.questionsPerExam} Questions / Exam`, priority: 999, isLimit: true });
  }
  if (limits.studentsAllowed > 0) {
    rows.push({ key: '_students', label: `${limits.studentsAllowed} Students`, priority: 998, isLimit: true });
  }
  return rows;
}

/**
 * Compact card content: limits + top highlighted features + overflow count.
 */
export function getPlanCardPreview(planRecord, limitsOverride = null) {
  const limits = limitsOverride || planRecord?.limits || {};
  const limitRows = planLimitHighlights(limits);
  const allFeatures = resolveFeatureList({ planFeatures: planRecord?.features }, planRecord)
    .filter((f) => f.enabled)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  const featureSlots = Math.max(0, HIGHLIGHT_SLOT_COUNT - limitRows.length);
  const highlighted = allFeatures.filter((f) => f.highlighted).slice(0, featureSlots);
  const shownKeys = new Set([...limitRows.map((r) => r.key), ...highlighted.map((f) => f.key)]);
  const hiddenCount = allFeatures.filter((f) => !shownKeys.has(f.key)).length;

  return {
    bullets: [
      ...limitRows.map((r) => ({ type: 'limit', label: r.label })),
      ...highlighted.map((f) => ({ type: 'feature', label: f.label, key: f.key })),
    ],
    hiddenFeatureCount: hiddenCount,
    allFeatures,
    limits,
  };
}

/** Group features for full modal. */
export function groupFeaturesByCategory(featureList) {
  const enabled = featureList.filter((f) => f.enabled);
  const groups = Object.entries(FEATURE_CATEGORIES).map(([id, { label, keys }]) => {
    const items = enabled.filter((f) => keys.includes(f.key));
    return { id, label, items };
  }).filter((g) => g.items.length > 0);

  const categorized = new Set(Object.values(FEATURE_CATEGORIES).flatMap((c) => c.keys));
  const other = enabled.filter((f) => !categorized.has(f.key));
  if (other.length) groups.push({ id: 'other', label: 'Other features', items: other });
  return groups;
}

/** Upgrade deltas vs current plan (limits + newly enabled features). */
export function computeUpgradeDeltas(currentPlan, targetPlan) {
  const deltas = [];
  const cl = currentPlan?.limits || {};
  const tl = targetPlan?.limits || {};

  if (Number(tl.examsPerMonth) > Number(cl.examsPerMonth)) {
    deltas.push({
      type: 'limit',
      label: `+${Number(tl.examsPerMonth) - Number(cl.examsPerMonth)} AI Exams / Month`,
    });
  }
  if (Number(tl.questionsPerExam) > Number(cl.questionsPerExam)) {
    deltas.push({
      type: 'limit',
      label: `+${Number(tl.questionsPerExam) - Number(cl.questionsPerExam)} Questions / Exam`,
    });
  }
  if (Number(tl.studentsAllowed) > Number(cl.studentsAllowed)) {
    deltas.push({
      type: 'limit',
      label: `+${Number(tl.studentsAllowed) - Number(cl.studentsAllowed)} Students`,
    });
  }

  const currentFeatures = resolveFeatureList({ planFeatures: currentPlan?.features }, currentPlan)
    .filter((f) => f.enabled)
    .map((f) => f.key);
  const currentSet = new Set(currentFeatures);
  const targetFeatures = resolveFeatureList({ planFeatures: targetPlan?.features }, targetPlan)
    .filter((f) => f.enabled && !currentSet.has(f.key))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  for (const f of targetFeatures) {
    deltas.push({ type: 'feature', label: f.label });
  }

  return deltas;
}
