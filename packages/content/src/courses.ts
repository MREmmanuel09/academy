/**
 * Static course definitions.
 *
 * These mirror the `MODULE_MAPPING` in the RedLab importer and the
 * 6-arc Sprint L2 structure. We keep them as a single source of
 * truth so the UI doesn't need to hit the filesystem just to render
 * the home page.
 */
import type { CourseDefinition } from './loader.js';

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
  {
    slug: 'english',
    track: 'english',
    title: 'English (Sprint L2)',
    description: 'Inglés con arcos narrativos, roleplays, juegos y SRS.',
    difficulty: 'beginner',
    estimatedHours: 60,
  },
];
