/**
 * Centralized SEO configuration for LikhitAI.
 * Extend PAGE_SEO entries for new marketing routes, blogs, or landing pages.
 */

const trimSlash = (url) => String(url || '').replace(/\/+$/, '');

export const SITE = {
  name: 'LikhitAI',
  legalName: 'LikhitAI',
  tagline: 'AI-Powered Exam Generator & Classroom Platform',
  url: trimSlash(import.meta.env.VITE_SITE_URL || 'https://likhitai.com'),
  locale: 'en_IN',
  themeColor: '#0366AC',
  twitterHandle: '@LikhitAI',
  supportEmail: 'support@likhitai.com',
};

export const DEFAULT_SEO = {
  title: 'LikhitAI — AI Exam Generator, Classroom & Proctoring Platform',
  description:
    'LikhitAI helps teachers and schools create AI-powered exams, manage classrooms, run secure assessments with AI proctoring, and track student performance — in minutes.',
  keywords: [
    'LikhitAI',
    'AI exam generator',
    'AI test creation',
    'AI classroom platform',
    'educational assessment SaaS',
    'AI proctoring',
    'online exam platform',
    'MCQ generator',
    'teacher assessment tools',
    'school exam software',
  ].join(', '),
  image: '/og-image.png',
  imageAlt: 'LikhitAI — AI-powered exam and classroom platform',
  robots: 'index, follow',
  type: 'website',
};

/** @typedef {{ title?: string, description?: string, keywords?: string, image?: string, imageAlt?: string, robots?: string, type?: string, noTitleSuffix?: boolean, jsonLd?: object|object[] }} SeoOverrides */

/**
 * @param {string} pathname
 * @returns {Required<typeof DEFAULT_SEO> & SeoOverrides}
 */
export function resolvePageSeo(pathname) {
  const path = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  const match = PAGE_SEO.find((entry) => entry.match(path));
  const base = match?.seo ?? {};
  const robots = match?.robots ?? base.robots ?? DEFAULT_SEO.robots;

  return {
    ...DEFAULT_SEO,
    ...base,
    robots,
  };
}

/**
 * @param {string} path
 * @returns {string}
 */
export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${SITE.url}${p}`;
}

/**
 * @param {string} title
 * @param {boolean} [noSuffix]
 */
export function formatDocumentTitle(title, noSuffix = false) {
  const t = String(title || '').trim();
  if (!t) return DEFAULT_SEO.title;
  if (noSuffix || /likhitai/i.test(t)) return t;
  return `${t} | ${SITE.name}`;
}

/**
 * @type {{ match: (path: string) => boolean, robots?: string, seo: SeoOverrides }[]}
 */
export const PAGE_SEO = [
  {
    match: (p) => p === '/',
    seo: {
      title: 'LikhitAI — AI Exam Generator & Smart Classroom Platform',
      description:
        'Create balanced AI-generated exams, manage batches and classrooms, proctor assessments, and track student performance. Built for teachers, schools, and training teams.',
      keywords:
        'AI exam generator, AI classroom platform, AI test creation, online assessments, AI proctoring, school exam software, LikhitAI',
      type: 'website',
    },
  },
  {
    match: (p) => p === '/pricing',
    seo: {
      title: 'Pricing — Plans for Teachers, Schools & Enterprise',
      description:
        'Compare LikhitAI plans for instructors, institutions, and enterprise teams. AI exam generation, proctoring, classroom tools, and scalable assessment capacity.',
      keywords:
        'LikhitAI pricing, AI exam platform plans, school assessment software pricing, enterprise exam SaaS',
    },
  },
  {
    match: (p) => p === '/about',
    seo: {
      title: 'About LikhitAI — AI Education & Assessment Platform',
      description:
        'Learn how LikhitAI empowers educators with AI-powered test creation, classroom management, secure proctoring, and actionable student insights.',
      keywords:
        'about LikhitAI, AI education platform, educational assessment SaaS, AI teaching tools',
    },
  },
  {
    match: (p) => p === '/contact',
    seo: {
      title: 'Contact LikhitAI — Support & Sales',
      description:
        'Get in touch with the LikhitAI team for product support, school onboarding, enterprise demos, and partnership inquiries.',
      keywords: 'contact LikhitAI, exam platform support, school onboarding, enterprise demo',
    },
  },
  {
    match: (p) => p === '/login',
    seo: {
      title: 'Login',
      description:
        'Sign in to your LikhitAI account to create AI exams, manage classrooms, view reports, and run secure assessments.',
      keywords: 'LikhitAI login, teacher login, student exam login',
      robots: 'noindex, follow',
    },
  },
  {
    match: (p) => p === '/signup',
    seo: {
      title: 'Sign Up — Start Free',
      description:
        'Create your free LikhitAI account. Generate AI-powered exams, organize batches, and deliver classroom-ready assessments in minutes.',
      keywords: 'LikhitAI sign up, free AI exam generator, teacher registration',
    },
  },
  {
    match: (p) => p === '/forgot-password',
    seo: {
      title: 'Reset Password',
      description: 'Reset your LikhitAI account password securely.',
      robots: 'noindex, follow',
    },
  },
  {
    match: (p) => p === '/help' || p.startsWith('/help/'),
    seo: {
      title: 'Help Center',
      description:
        'Guides and answers for using LikhitAI — AI exams, resources, proctoring, batches, certificates, and account settings.',
      keywords: 'LikhitAI help, exam platform documentation, teacher guides',
    },
  },
  {
    match: (p) => p === '/privacy',
    seo: {
      title: 'Privacy Policy',
      description: 'How LikhitAI collects, uses, and protects personal data on our AI exam and classroom platform.',
      robots: 'index, follow',
    },
  },
  {
    match: (p) => p === '/terms',
    seo: {
      title: 'Terms of Service',
      description: 'Terms governing use of the LikhitAI AI assessment and classroom platform.',
      robots: 'index, follow',
    },
  },
  {
    match: (p) => p.startsWith('/legal/'),
    seo: {
      title: 'Legal & Policies',
      description: 'LikhitAI legal policies including refunds, cookies, AI proctoring consent, data retention, and acceptable use.',
      robots: 'index, follow',
    },
  },
  {
    match: (p) => p.startsWith('/verify/'),
    seo: {
      title: 'Verify Certificate',
      description: 'Verify the authenticity of a LikhitAI certificate using its unique ID.',
      robots: 'index, follow',
    },
  },
  {
    match: (p) => p === '/dashboard',
    seo: {
      title: 'Dashboard',
      description: 'Your LikhitAI dashboard — exams, study progress, certificates, and classroom activity.',
      robots: 'noindex, nofollow',
    },
  },
  {
    match: (p) => p === '/create-exam',
    seo: {
      title: 'Create AI Exam',
      description:
        'Build AI-powered MCQ, descriptive, mixed, and coding exams from topics or uploaded resources with LikhitAI.',
      keywords: 'create AI exam, AI question generator, topic-based test creation, resource-based exams',
      robots: 'noindex, nofollow',
    },
  },
  {
    match: (p) => p.includes('/edit-questions'),
    seo: {
      title: 'Edit Exam Questions',
      description: 'Review and refine AI-generated exam questions before publishing.',
      robots: 'noindex, nofollow',
    },
  },
  {
    match: (p) => p === '/instructor-dashboard' || p === '/instructor',
    seo: {
      title: 'Instructor Dashboard',
      description: 'Manage AI exams, batches, student reports, and proctoring reviews from your instructor workspace.',
      robots: 'noindex, nofollow',
    },
  },
  {
    match: (p) => p.startsWith('/instructor/'),
    seo: {
      title: 'Instructor Reports & Analytics',
      description: 'Student performance, attempt history, and proctoring insights for your LikhitAI exams.',
      robots: 'noindex, nofollow',
    },
  },
  {
    match: (p) => p === '/groups' || p.startsWith('/groups/') || p === '/batches' || p.startsWith('/batches/'),
    seo: {
      title: 'Classrooms & Batches',
      description: 'Organize students into batches, assign exams, and manage classroom groups on LikhitAI.',
      keywords: 'classroom management, student batches, group exams',
      robots: 'noindex, nofollow',
    },
  },
  {
    match: (p) => p.startsWith('/school/'),
    seo: {
      title: 'School Classes & Students',
      description: 'Manage school classes, rosters, and student access for institutional LikhitAI deployments.',
      robots: 'noindex, nofollow',
    },
  },
  {
    match: (p) => p.startsWith('/enterprise'),
    seo: {
      title: 'Enterprise Console',
      description: 'Enterprise administration for teachers, capacity, and organization-wide LikhitAI settings.',
      robots: 'noindex, nofollow',
    },
  },
  {
    match: (p) => p === '/tests' || p === '/study',
    seo: {
      title: 'My Tests & Practice',
      description: 'Access assigned exams and practice tests on LikhitAI.',
      robots: 'noindex, nofollow',
    },
  },
  {
    match: (p) => p === '/performance',
    seo: {
      title: 'Study Performance',
      description: 'Track your scores, accuracy, and progress across LikhitAI practice tests.',
      robots: 'noindex, nofollow',
    },
  },
  {
    match: (p) => p === '/leaderboard',
    seo: {
      title: 'Leaderboard',
      description: 'See top performers and rankings across LikhitAI practice and exam activity.',
      keywords: 'exam leaderboard, student rankings, LikhitAI scores',
    },
  },
  {
    match: (p) => p === '/certificates',
    seo: {
      title: 'Certificates',
      description: 'View and download your LikhitAI achievement certificates.',
      robots: 'noindex, nofollow',
    },
  },
  {
    match: (p) => p === '/plan',
    seo: {
      title: 'Plan & Billing',
      description: 'Manage your LikhitAI subscription, exam limits, and billing details.',
      robots: 'noindex, nofollow',
    },
  },
  {
    match: (p) => p === '/settings' || p === '/profile',
    seo: {
      title: 'Account Settings',
      description: 'Update your LikhitAI profile and preferences.',
      robots: 'noindex, nofollow',
    },
  },
  {
    match: (p) => p.startsWith('/exam/'),
    seo: {
      title: 'Exam',
      description: 'Take your LikhitAI assessment.',
      robots: 'noindex, nofollow',
    },
  },
  {
    match: (p) => p.startsWith('/results/'),
    seo: {
      title: 'Exam Results',
      description: 'View your LikhitAI exam results and feedback.',
      robots: 'noindex, nofollow',
    },
  },
  {
    match: (p) => p.startsWith('/admin'),
    seo: {
      title: 'Admin',
      description: 'LikhitAI platform administration.',
      robots: 'noindex, nofollow',
    },
  },
  {
    match: (p) => p === '/tickets' || p.startsWith('/notifications/'),
    seo: {
      title: 'Support',
      description: 'LikhitAI support tickets and notifications.',
      robots: 'noindex, nofollow',
    },
  },
  {
    match: (p) => p === '/maintenance',
    seo: {
      title: 'Maintenance',
      description: 'LikhitAI is temporarily undergoing maintenance. Please check back soon.',
      robots: 'noindex, nofollow',
    },
  },
];

/** Default JSON-LD for public marketing pages */
export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.legalName,
    url: SITE.url,
    logo: absoluteUrl('/og-image.png'),
    description: DEFAULT_SEO.description,
    email: SITE.supportEmail,
    sameAs: [],
  };
}

export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: DEFAULT_SEO.description,
    publisher: { '@type': 'Organization', name: SITE.legalName },
  };
}

export function buildSoftwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.name,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    description:
      'AI-powered exam generator and classroom platform for teachers and schools — MCQ, descriptive, coding, proctoring, and analytics.',
    url: SITE.url,
  };
}
