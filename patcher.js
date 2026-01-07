
import fs from 'fs';
import path from 'path';

const TARGET_DIR = process.argv[2] || '../gemini-ua';
const LOCALES_DIR = './locales';

async function patch() {
  console.log(`🚀 Починаємо патчити ${TARGET_DIR}...`);

  if (!fs.existsSync(TARGET_DIR)) {
    console.error('❌ Помилка: Цільова директорія не знайдена.');
    process.exit(1);
  }

  // 1. Копіюємо локалі
  const targetLocalesPath = path.join(TARGET_DIR, 'packages/cli/src/locales');
  if (!fs.existsSync(targetLocalesPath)) {
    fs.mkdirSync(targetLocalesPath, { recursive: true });
  }

  const locales = fs.readdirSync(LOCALES_DIR);
  for (const file of locales) {
    fs.copyFileSync(path.join(LOCALES_DIR, file), path.join(targetLocalesPath, file));
    console.log(`✅ Скопійовано ${file}`);
  }

  // 2. Ін'єкція i18n двигуна
  const i18nPath = path.join(TARGET_DIR, 'packages/cli/src/i18n.ts');
  const i18nContent = `
import { ua } from './locales/ua.js';
// Тут буде логіка вибору мови з налаштувань
export const strings = ua; 
`;
  fs.writeFileSync(i18nPath, i18nContent);
  console.log('✅ Оновлено i18n.ts');

  console.log('🎉 Патч успішно застосовано!');
}

patch();
