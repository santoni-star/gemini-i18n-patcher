import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TARGET_DIR = process.argv[2] || '../gemini-cli';

async function run() {
  const absTarget = path.resolve(TARGET_DIR);
  console.log('🚀 STABLE PATCH: ' + absTarget);

  const schemaPath = path.join(absTarget, 'packages/cli/src/config/settingsSchema.ts');
  if (fs.existsSync(schemaPath)) {
    let content = fs.readFileSync(schemaPath, 'utf8');
    content = content.replace('vimMode:', "locale: { type: 'string', enum: ['en', 'ua'], default: 'ua', label: 'Language', category: 'General', showInDialog: true }, vimMode:");
    fs.writeFileSync(schemaPath, content);
  }

  const geminiPath = path.join(absTarget, 'packages/cli/src/gemini.tsx');
  if (fs.existsSync(geminiPath)) {
    let content = fs.readFileSync(geminiPath, 'utf8');
    content = content.replace('const settings = loadSettings();', 'const settings = loadSettings(); (globalThis as any).__GEMINI_CONFIG__ = settings;');
    fs.writeFileSync(geminiPath, content);
  }

  const i18nPath = path.join(absTarget, 'packages/cli/src/i18n.ts');
  const i18nContent = "import { en } from './locales/en.js';\nimport { ua } from './locales/ua.js';\nexport function t(text) { if (!text) return text; const s = (globalThis as any).__GEMINI_CONFIG__?.merged || (globalThis as any).__GEMINI_CONFIG__; const l = s?.general?.locale || s?.locale || 'ua'; if (l === 'en') return text; const clean = text.trim(); return ua[clean] || en[clean] || text; }\nexport const strings = new Proxy({}, { get(_, prop) { return t(prop.toString()); } });";
  fs.writeFileSync(i18nPath, i18nContent);

  // Патчимо ТІЛЬКИ найнадійніші файли
  const filesToPatch = [
    'packages/cli/src/ui/components/InputPrompt.tsx',
    'packages/cli/src/ui/components/Composer.tsx'
  ];

  filesToPatch.forEach(relPath => {
    const fullPath = path.join(absTarget, relPath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('import { t }')) content = "import { t } from '../../i18n.js';\n" + content;
      content = content.replace(/>([^<>{}\n]+)</g, '>{t(`$1`)}<');
      fs.writeFileSync(fullPath, content);
      console.log('✅ Patched: ' + relPath);
    }
  });

  const localesDir = path.join(absTarget, 'packages/cli/src/locales');
  if (!fs.existsSync(localesDir)) fs.mkdirSync(localesDir, { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'assets/ua.ts'), path.join(localesDir, 'ua.ts'));
  fs.copyFileSync(path.join(__dirname, 'assets/en.ts'), path.join(localesDir, 'en.ts'));

  console.log('🎉 SUCCESS!');
}

run();