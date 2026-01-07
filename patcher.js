import fs from 'fs';
import path from 'path';

const TARGET_DIR = process.argv[2] || '../gemini-cli';

function patchFile(relativePath, search, replace) {
  const fullPath = path.join(TARGET_DIR, relativePath);
  if (!fs.existsSync(fullPath)) return false;
  let content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(replace)) return true; // Вже запатчено
  content = content.replace(search, replace);
  fs.writeFileSync(fullPath, content);
  return true;
}

async function run() {
  console.log('🛠️  Застосування глибокого патчу локалізації...');

  // 1. Додаємо 'locale' в типи налаштувань
  patchFile(
    'packages/cli/src/config/settings.ts',
    '  readonly model?: string;',
    '  readonly model?: string;\n  readonly locale?: "en" | "ua";'
  );

  // 2. Додаємо 'locale' в схему (щоб з'явилося в налаштуваннях)
  patchFile(
    'packages/cli/src/config/settingsSchema.ts',
    '      model: {',
    '      locale: {\n        type: "string",\n        enum: ["en", "ua"],\n        default: "en",\n        description: "Language / Мова (en, ua)"\n      },\n      model: {'
  );

  // 3. Оновлюємо i18n двигун, щоб він читав налаштування
  const i18nPath = path.join(TARGET_DIR, 'packages/cli/src/i18n.ts');
  const i18nContent = `
import { en } from './locales/en.js';
import { ua } from './locales/ua.js';
import { getSettings } from './config/settings.js';

// Динамічний вибір мови
export const strings = new Proxy({}, {
  get(_, prop) {
    const locale = getSettings()?.locale || 'en';
    const dict = locale === 'ua' ? ua : en;
    return dict[prop] || en[prop];
  }
});
`;
  fs.writeFileSync(i18nPath, i18nContent);

  // 4. Копіюємо файл ua.ts з assets
  const localesDir = path.join(TARGET_DIR, 'packages/cli/src/locales');
  if (!fs.existsSync(localesDir)) fs.mkdirSync(localesDir, { recursive: true });
  
  const assetPath = path.resolve(path.dirname(import.meta.url).replace('file://', ''), 'assets/ua.ts');
  if (fs.existsSync('./assets/ua.ts')) {
    fs.copyFileSync('./assets/ua.ts', path.join(localesDir, 'ua.ts'));
    console.log('✅ Файл ua.ts скопійовано');
  }

  console.log('✅ Патч завершено! Тепер ви можете вибрати мову в налаштуваннях.');
}

run();