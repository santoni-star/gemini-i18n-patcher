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

function localizeCommands(absTarget) {
  const commandsDir = path.join(absTarget, 'packages/cli/src/ui/commands');
  if (!fs.existsSync(commandsDir)) return;

  const files = fs.readdirSync(commandsDir);
  files.forEach(file => {
    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const filePath = path.join(commandsDir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      const descMatch = content.match(/description:\s*['"](.+?)['"]/);
      if (descMatch) {
        const originalText = descMatch[1];
        const commandName = file.replace('Command', '').replace(/\.(ts|tsx)$/, '');
        const i18nKey = `command_${commandName}`;
        if (!content.includes('import { strings }')) {
          content = "import { strings } from '../../i18n.js';\n" + content;
        }
        content = content.replace(/description:\s*['"].+?['"]/, `description: strings.${i18nKey} || '${originalText}'`);
        fs.writeFileSync(filePath, content);
        console.log(`✅ Localized command: ${file}`);
      }
    }
  });
}

async function run() {
  const absTarget = path.resolve(TARGET_DIR);
  console.log(`🚀 Advanced patching: ${absTarget}`);

  patchFile('packages/cli/src/config/settings.ts', 'readonly model?: string;', 'readonly model?: string; locale?: "en" | "ua";');
  patchFile('packages/cli/src/config/settingsSchema.ts', 'vimMode: {', 'locale: { type: "string", enum: ["en", "ua"], default: "en", description: "Language", label: "Language", showInDialog: true }, vimMode: {');
  patchFile('packages/cli/src/config/settingsSchema.ts', "'general.vimMode',", "'general.locale', 'general.vimMode',");
  patchFile('packages/cli/src/gemini.tsx', 'const settings = loadSettings();', 'const settings = loadSettings(); (globalThis as any).__GEMINI_CONFIG__ = settings;');

  const i18nContent = `import { en } from './locales/en.js';\nimport { ua } from './locales/ua.js';\n\nfunction getCurrentLocale() {\n  try {\n    const s = (globalThis as any).__GEMINI_CONFIG__?.merged || (globalThis as any).__GEMINI_CONFIG__;
    return s?.general?.locale || s?.locale || 'en';
  } catch { return 'en'; }
}

export const strings: any = new Proxy({}, {\n  get(_, prop) {\n    const locale = getCurrentLocale();
    const dict: any = locale === 'ua' ? ua : en;
    return dict[prop] || (en as any)[prop] || (prop.toString().startsWith('command_') ? undefined : prop);
  }
});`;
  fs.writeFileSync(path.join(absTarget, 'packages/cli/src/i18n.ts'), i18nContent);

  patchFile('packages/cli/src/ui/components/InputPrompt.tsx', "placeholder = '  Type your message or @path/to/file',", "placeholder = strings.placeholder,");
  patchFile('packages/cli/src/ui/components/InputPrompt.tsx', "import { Text, useStdout } from 'ink';", "import { Text, useStdout } from 'ink';\nimport { strings } from '../../i18n.js';");
  patchFile('packages/cli/src/ui/components/Composer.tsx', "import { useState } from 'react';", "import { useState } from 'react';\nimport { strings } from '../../i18n.js';");
  
  const oldPlaceholder = "placeholder={\n            vimEnabled\n              ? \"  Press 'i' for INSERT mode and 'Esc' for NORMAL mode.\"\n              : uiState.shellModeActive\n                ? '  Type your shell command'\n                : '  Type your message or @path/to/file'\n          }";
  const newPlaceholder = "placeholder={\n            vimEnabled\n              ? strings.placeholderVim\n              : uiState.shellModeActive\n                ? strings.placeholderShell\n                : strings.placeholder\n          }";
  patchFile('packages/cli/src/ui/components/Composer.tsx', oldPlaceholder, newPlaceholder);

  localizeCommands(absTarget);

  const localesDir = path.join(absTarget, 'packages/cli/src/locales');
  if (!fs.existsSync(localesDir)) fs.mkdirSync(localesDir, { recursive: true });
  if (fs.existsSync(path.join(__dirname, 'assets/ua.ts'))) fs.copyFileSync(path.join(__dirname, 'assets/ua.ts'), path.join(localesDir, 'ua.ts'));
  if (fs.existsSync(path.join(__dirname, 'assets/en.ts'))) fs.copyFileSync(path.join(__dirname, 'assets/en.ts'), path.join(localesDir, 'en.ts'));

  console.log('🎉 Done!');
}

run();