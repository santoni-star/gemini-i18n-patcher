
import fs from 'fs';
import path from 'path';

// За замовчуванням шукаємо оригінальний gemini-cli від Google
const TARGET_DIR = process.argv[2] || '../gemini-cli';

function patchFile(relativePath, search, replace) {
  const fullPath = path.join(TARGET_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  Файл не знайдено: ${relativePath}`);
    return false;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(replace)) {
    console.log(`ℹ️  Файл ${relativePath} вже має патч.`);
    return true;
  }
  content = content.replace(search, replace);
  fs.writeFileSync(fullPath, content);
  console.log(`✅ Патч застосовано до ${relativePath}`);
  return true;
}

async function run() {
  console.log(`🚀 Починаємо локалізацію оригінальної Gemini CLI у: ${TARGET_DIR}`);

  if (!fs.existsSync(TARGET_DIR)) {
    console.error(`❌ Помилка: Директорія ${TARGET_DIR} не знайдена. Клонуйте її: git clone https://github.com/google-gemini/gemini-cli.git`);
    process.exit(1);
  }

  // 1. Додаємо 'locale' в типи налаштувань
  patchFile(
    'packages/cli/src/config/settings.ts',
    '  readonly model?: string;',
    '  readonly model?: string;\n  readonly locale?: "en" | "ua";'
  );

  // 2. Додаємо 'locale' в JSON-схему (щоб з'явилося в /settings)
  patchFile(
    'packages/cli/src/config/settingsSchema.ts',
    '      model: {',
    '      locale: {\n        type: "string",\n        enum: ["en", "ua"],\n        default: "en",\n        description: "Language / Мова (en, ua)"\n      },\n      model: {'
  );

  // 3. Робимо i18n динамічним
  const i18nPath = path.join(TARGET_DIR, 'packages/cli/src/i18n.ts');
  const i18nContent = `
import { en } from './locales/en.js';
import { ua } from './locales/ua.js';
import { getSettings } from './config/settings.js';

// Динамічний проксі для вибору мови на льоту
export const strings: any = new Proxy({}, {
  get(_, prop) {
    const locale = getSettings()?.locale || 'en';
    const dict: any = locale === 'ua' ? ua : en;
    return dict[prop] || (en as any)[prop];
  }
});
`;
  fs.writeFileSync(i18nPath, i18nContent);
  console.log('✅ Оновлено i18n двигун (динамічне перемикання)');

  // 4. Копіюємо UA активи
  const localesDir = path.join(TARGET_DIR, 'packages/cli/src/locales');
  if (!fs.existsSync(localesDir)) fs.mkdirSync(localesDir, { recursive: true });
  
  if (fs.existsSync('./assets/ua.ts')) {
    fs.copyFileSync('./assets/ua.ts', path.join(localesDir, 'ua.ts'));
    console.log('✅ Файл ua.ts успішно ін\'єктовано');
  }

  console.log('\n🎉 ГОТОВО! Тепер виконайте:');
  console.log(`cd ${TARGET_DIR} && npm install && npm run bundle && sudo npm install -g .`);
  console.log('\nПісля запуску встановіть мову: /settings set locale ua');
}

run();
