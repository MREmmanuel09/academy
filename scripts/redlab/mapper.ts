/**
 * RedLab v6 → Academy content mapping.
 *
 * RedLab uses `module` strings ("fundamentos", "capa-red", "devops",
 * "python-fundamentals", etc.) and a single flat `lessons` array.
 * Academy groups lessons into **courses** (the top-level navigation
 * entry) and **units** (modules within a course).
 *
 * This module owns that mapping. The importer applies it.
 */

export type RedLabModule =
  | 'fundamentos'
  | 'capa-red'
  | 'capa-transporte'
  | 'capa-aplicacion'
  | 'switching-routing'
  | 'wireless'
  | 'seguridad'
  | 'herramientas'
  | 'devops'
  | 'python-fundamentals'
  | 'python-devops'
  | 'python-automation'
  | 'data-fundamentals'
  | 'sql'
  | 'data-analysis'
  | 'bigdata';

export interface CourseUnitMapping {
  /** Academy course slug. */
  course: string;
  /** Academy course track. */
  track: 'devops' | 'data' | 'english' | 'networking' | 'cloud';
  /** Academy unit slug (lower-case, kebab). */
  unit: string;
  /** Academy unit title (Spanish). */
  unitTitle: string;
  /** Order within the course (0-based). */
  order: number;
}

/**
 * Map from RedLab `module` to a list of (course, unit) targets. Some
 * RedLab modules are split across multiple Academy units (e.g.
 * "devops" is one module in RedLab but spawns linux+git+docker+... in
 * Academy).
 */
export const MODULE_MAPPING: Record<RedLabModule, readonly CourseUnitMapping[]> = {
  // Networking course (RedLab v6 modules 1-9).
  fundamentos: [{ course: 'networking', track: 'networking', unit: 'fundamentos', unitTitle: 'Fundamentos de Redes', order: 0 }],
  'capa-red': [{ course: 'networking', track: 'networking', unit: 'capa-red', unitTitle: 'Capa de Red', order: 1 }],
  'capa-transporte': [{ course: 'networking', track: 'networking', unit: 'capa-transporte', unitTitle: 'Capa de Transporte', order: 2 }],
  'capa-aplicacion': [{ course: 'networking', track: 'networking', unit: 'capa-aplicacion', unitTitle: 'Capa de Aplicación', order: 3 }],
  'switching-routing': [{ course: 'networking', track: 'networking', unit: 'switching-routing', unitTitle: 'Switching & Routing', order: 4 }],
  wireless: [{ course: 'networking', track: 'networking', unit: 'wireless', unitTitle: 'Wireless', order: 5 }],
  seguridad: [{ course: 'networking', track: 'networking', unit: 'seguridad', unitTitle: 'Seguridad', order: 6 }],

  // DevOps course (RedLab "devops" module → linux+git+docker+k8s+...).
  herramientas: [
    { course: 'devops', track: 'devops', unit: 'linux', unitTitle: 'Linux', order: 0 },
    { course: 'devops', track: 'devops', unit: 'git', unitTitle: 'Git', order: 1 },
  ],
  devops: [
    { course: 'devops', track: 'devops', unit: 'docker', unitTitle: 'Docker', order: 2 },
    { course: 'devops', track: 'devops', unit: 'kubernetes', unitTitle: 'Kubernetes', order: 3 },
    { course: 'devops', track: 'devops', unit: 'cicd', unitTitle: 'CI/CD', order: 4 },
    { course: 'devops', track: 'devops', unit: 'iac', unitTitle: 'Infrastructure as Code', order: 5 },
    { course: 'devops', track: 'devops', unit: 'monitoring', unitTitle: 'Monitoring & SRE', order: 6 },
    { course: 'devops', track: 'devops', unit: 'advanced', unitTitle: 'Advanced (GitOps, Service Mesh, DevSecOps)', order: 7 },
    { course: 'devops', track: 'cloud', unit: 'multicloud', unitTitle: 'Multi-Cloud (AWS/GCP/Azure)', order: 8 },
  ],

  // Python DevOps course.
  'python-fundamentals': [{ course: 'python', track: 'devops', unit: 'fundamentals', unitTitle: 'Python Fundamentals', order: 0 }],
  'python-devops': [{ course: 'python', track: 'devops', unit: 'devops', unitTitle: 'Python for DevOps', order: 1 }],
  'python-automation': [{ course: 'python', track: 'devops', unit: 'automation', unitTitle: 'Python Automation', order: 2 }],

  // Data Analytics course.
  'data-fundamentals': [{ course: 'data', track: 'data', unit: 'fundamentals', unitTitle: 'Data Fundamentals', order: 0 }],
  sql: [{ course: 'data', track: 'data', unit: 'sql', unitTitle: 'SQL', order: 1 }],
  'data-analysis': [{ course: 'data', track: 'data', unit: 'analysis', unitTitle: 'Data Analysis', order: 2 }],

  // Big Data course.
  bigdata: [{ course: 'bigdata', track: 'data', unit: 'bigdata', unitTitle: 'Big Data', order: 0 }],
};

/** Course definitions. One row per Academy course. */
export interface CourseDefinition {
  slug: string;
  track: 'devops' | 'data' | 'english' | 'networking' | 'cloud';
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
}

export const COURSES: readonly CourseDefinition[] = [
  {
    slug: 'networking',
    track: 'networking',
    title: 'Redes y Fundamentos',
    description: 'De OSI/TCP-IP a routing, switching, wireless y seguridad.',
    difficulty: 'beginner',
    estimatedHours: 30,
  },
  {
    slug: 'devops',
    track: 'devops',
    title: 'DevOps & Cloud',
    description: 'Linux, Git, Docker, Kubernetes, CI/CD, IaC, monitoring, SRE.',
    difficulty: 'intermediate',
    estimatedHours: 50,
  },
  {
    slug: 'python',
    track: 'devops',
    title: 'Python para DevOps',
    description: 'Fundamentos, boto3, automation.',
    difficulty: 'intermediate',
    estimatedHours: 30,
  },
  {
    slug: 'data',
    track: 'data',
    title: 'Data Analytics',
    description: 'SQL, Pandas, análisis de datos.',
    difficulty: 'intermediate',
    estimatedHours: 30,
  },
  {
    slug: 'bigdata',
    track: 'data',
    title: 'Big Data',
    description: 'Spark, Hadoop, pipelines distribuidos.',
    difficulty: 'advanced',
    estimatedHours: 20,
  },
];
