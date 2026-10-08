/**
 * One-off backfill: adds the `nav` and `footer` namespaces to all 10
 * locale message catalogues. The Header and Footer components have used
 * these namespaces for a while; the catalogues simply never had the
 * matching keys, so the dev server logged MISSING_MESSAGE warnings.
 *
 * Idempotent — running it twice is a no-op.
 */
const fs = require('node:fs');
const path = require('node:path');

const MESSAGES = path.resolve(__dirname, '..', 'packages/i18n/src/messages');

const NAV = {
  es: { courses: 'Cursos', practice: 'Practicar', dashboard: 'Panel', login: 'Iniciar sesión', logout: 'Cerrar sesión', register: 'Registrarse' },
  en: { courses: 'Courses', practice: 'Practice', dashboard: 'Dashboard', login: 'Log in', logout: 'Log out', register: 'Sign up' },
  pt: { courses: 'Cursos', practice: 'Praticar', dashboard: 'Painel', login: 'Entrar', logout: 'Sair', register: 'Registrar-se' },
  fr: { courses: 'Cours', practice: 'Pratiquer', dashboard: 'Tableau de bord', login: 'Connexion', logout: 'Déconnexion', register: 'S\'inscrire' },
  de: { courses: 'Kurse', practice: 'Üben', dashboard: 'Übersicht', login: 'Anmelden', logout: 'Abmelden', register: 'Registrieren' },
  it: { courses: 'Corsi', practice: 'Pratica', dashboard: 'Dashboard', login: 'Accedi', logout: 'Esci', register: 'Registrati' },
  pl: { courses: 'Kursy', practice: 'Ćwicz', dashboard: 'Panel', login: 'Zaloguj się', logout: 'Wyloguj się', register: 'Zarejestruj się' },
  zh: { courses: '课程', practice: '练习', dashboard: '仪表板', login: '登录', logout: '退出', register: '注册' },
  ja: { courses: 'コース', practice: '練習', dashboard: 'ダッシュボード', login: 'ログイン', logout: 'ログアウト', register: '登録' },
  ar: { courses: 'الدورات', practice: 'تمرّن', dashboard: 'لوحة التحكم', login: 'تسجيل الدخول', logout: 'تسجيل الخروج', register: 'إنشاء حساب' },
};

const FOOTER = {
  es: { license: 'Licencia MIT', sourceCode: 'Código fuente' },
  en: { license: 'MIT license', sourceCode: 'Source code' },
  pt: { license: 'Licença MIT', sourceCode: 'Código-fonte' },
  fr: { license: 'Licence MIT', sourceCode: 'Code source' },
  de: { license: 'MIT-Lizenz', sourceCode: 'Quellcode' },
  it: { license: 'Licenza MIT', sourceCode: 'Codice sorgente' },
  pl: { license: 'Licencja MIT', sourceCode: 'Kod źródłowy' },
  zh: { license: 'MIT 许可', sourceCode: '源代码' },
  ja: { license: 'MIT ライセンス', sourceCode: 'ソースコード' },
  ar: { license: 'رخصة MIT', sourceCode: 'الشفرة المصدرية' },
};

for (const locale of Object.keys(NAV)) {
  const file = path.join(MESSAGES, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data.nav) data.nav = NAV[locale];
  else Object.assign(data.nav, NAV[locale]);
  if (!data.footer) data.footer = FOOTER[locale];
  else Object.assign(data.footer, FOOTER[locale]);
  // 2-space indent keeps biome's JSON formatter happy.
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`  ✔ ${locale}.json (added nav + footer)`);
}
console.log('Done.');
