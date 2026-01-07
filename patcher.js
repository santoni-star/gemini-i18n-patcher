import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_DIR = process.argv[2] || '../gemini-cli';

function patchFile(relativePath, search, replace) {
  const fullPath = path.join(TARGET_DIR, relativePath);
  if (!fs.existsSync(fullPath)) return false;
  let content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(replace)) return true;
  content = content.replace(search, replace);
  fs.writeFileSync(fullPath, content);
  console.log(`✅ Patched ${relativePath}`);
  return true;
}

async function run() {
  const absTarget = path.resolve(TARGET_DIR);
  console.log(`🚀 Deep patching: ${absTarget}`);

  // 1. Settings Schema
  patchFile('packages/cli/src/config/settings.ts', 'readonly model?: string;', 'readonly model?: string; locale?: "en" | "ua";');
  patchFile('packages/cli/src/config/settingsSchema.ts', 'vimMode: {', 'locale: { type: "string", enum: ["en", "ua"], default: "en", description: "Language", label: "Language", showInDialog: true }, vimMode: {');
  patchFile('packages/cli/src/config/settingsSchema.ts', "'general.vimMode',", "'general.locale', 'general.vimMode',");

  // 2. Global state for i18n
  patchFile('packages/cli/src/gemini.tsx', 'const settings = loadSettings();', 'const settings = loadSettings(); (globalThis as any).__GEMINI_CONFIG__ = settings;');

  // 3. Inject i18n module
  const i18nContent = `import { en } from './locales/en.js';
import { ua } from './locales/ua.js';

function getCurrentLocale() {
  try {
    const s = (globalThis as any).__GEMINI_CONFIG__?.merged || (globalThis as any).__GEMINI_CONFIG__;
    return s?.general?.locale || s?.locale || 'en';
  } catch { return 'en'; }
}

export const strings: any = new Proxy({}, {
  get(_, prop) {
    const locale = getCurrentLocale();
    const dict: any = locale === 'ua' ? ua : en;
    return dict[prop] || (en as any)[prop] || prop;
  }
});`;
  fs.writeFileSync(path.join(absTarget, 'packages/cli/src/i18n.ts'), i18nContent);

  // 4. Patch UI Components (Automatic Text Replacement)
  patchFile('packages/cli/src/ui/components/InputPrompt.tsx', 
    "placeholder = '  Type your message or @path/to/file',",