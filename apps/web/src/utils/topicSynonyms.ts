/**
 * GitHub repository topic synonym dictionary.
 * Maps developer framework and tool skills to canonical GitHub repository topics.
 */

const FRAMEWORK_TOPIC_MAP: Record<string, string[]> = {
  react: ['react', 'reactjs'],
  'react.js': ['react', 'reactjs'],
  reactjs: ['react', 'reactjs'],
  nextjs: ['nextjs', 'next-js', 'react'],
  'next.js': ['nextjs', 'next-js', 'react'],
  vue: ['vue', 'vuejs'],
  'vue.js': ['vue', 'vuejs'],
  vuejs: ['vue', 'vuejs'],
  nuxt: ['nuxt', 'nuxtjs', 'vue'],
  nuxtjs: ['nuxt', 'nuxtjs', 'vue'],
  angular: ['angular', 'angularjs'],
  svelte: ['svelte', 'sveltekit'],
  sveltekit: ['sveltekit', 'svelte'],
  remix: ['remix', 'remix-run', 'react'],
  fastapi: ['fastapi', 'python'],
  django: ['django', 'python'],
  flask: ['flask', 'python'],
  express: ['express', 'expressjs', 'nodejs'],
  expressjs: ['express', 'expressjs', 'nodejs'],
  nestjs: ['nestjs', 'typescript', 'nodejs'],
  spring: ['spring', 'spring-boot', 'java'],
  'spring boot': ['spring-boot', 'spring', 'java'],
  rails: ['rails', 'ruby-on-rails', 'ruby'],
  'ruby on rails': ['rails', 'ruby-on-rails', 'ruby'],
  laravel: ['laravel', 'php'],
  tailwind: ['tailwind', 'tailwindcss', 'css'],
  tailwindcss: ['tailwindcss', 'tailwind', 'css'],
  docker: ['docker', 'containers'],
  kubernetes: ['kubernetes', 'k8s'],
  graphql: ['graphql', 'api'],
  postgresql: ['postgresql', 'postgres', 'sql'],
  postgres: ['postgresql', 'postgres', 'sql'],
  mongodb: ['mongodb', 'database'],
  redis: ['redis', 'cache'],
  tauri: ['tauri', 'rust'],
  electron: ['electron', 'desktop'],
  gin: ['gin', 'golang', 'go'],
  actix: ['actix', 'actix-web', 'rust'],
  axum: ['axum', 'rust'],
  flutter: ['flutter', 'dart'],
  'react native': ['react-native', 'react', 'mobile'],
};

/**
 * Maps a given framework or tool string to its associated GitHub repository topics.
 * Returns an empty array if no specific mapping exists.
 */
export function mapFrameworkToTopic(framework: string | null | undefined): string[] {
  if (!framework || typeof framework !== 'string') return [];
  const clean = framework.trim().toLowerCase();
  return FRAMEWORK_TOPIC_MAP[clean] || [];
}

/**
 * Returns all topic synonyms for a given skill or framework, falling back to a sanitized
 * topic slug if not explicitly in the dictionary.
 */
export function getTopicSynonyms(skill: string | null | undefined): string[] {
  if (!skill || typeof skill !== 'string') return [];
  const clean = skill.trim().toLowerCase();

  const matched = FRAMEWORK_TOPIC_MAP[clean];
  if (matched && matched.length > 0) {
    return [...matched];
  }

  // Fallback slug
  const fallback = clean.replace(/[^a-z0-9_-]/g, '');
  return fallback ? [fallback] : [];
}

/**
 * Checks whether a topic name is mapped to any known framework.
 */
export function isRecognizedTopic(topic: string | null | undefined): boolean {
  if (!topic || typeof topic !== 'string') return false;
  const clean = topic.trim().toLowerCase();
  return clean in FRAMEWORK_TOPIC_MAP;
}
