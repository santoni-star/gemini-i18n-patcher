import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TARGET_DIR = process.argv[2] || '../gemini-cli';

// Великий словник (витягнуто з вашої версії)
const PHRASES = {
  "  Type your message or @path/to/file": "  Введіть повідомлення або @шлях/до/файлу",
  "  Type your shell command": "  Введіть команду оболонки",
  "  Press 'i' for INSERT mode and 'Esc' for NORMAL mode.": "  Натисніть 'i' для режиму ВСТАВКИ та 'Esc' для НОРМАЛЬНОГО режиму.",
  "Tips for getting started:": "Поради для початку роботи:",
  "1. Ask questions, edit files, or run commands.": "1. Ставте запитання, редагуйте файли або виконуйте команди.",
  "2. Be specific for the best results.": "2. Будьте конкретними для кращого результату.",
  "3. /help for more information.": "3. Введіть /help для додаткової інформації.",
  "Clear the screen and conversation history": "Очистити екран та історію розмови",
  "no sandbox (see /docs)": "без пісочниці (див. /docs)",
  "Language": "Мова",
  "Preferred Editor": "Бажаний редактор",
  "Vim Mode": "Режим Vim",
  "Disable Auto Update": "Вимкнути автооновлення",
  "Show Memory Usage": "Показати пам'ять",
  "Clear screen": "Очистити екран",
  "Copy last response": "Скопіювати відповідь",
  "Help": "Допомога",
  "Settings": "Налаштування",
  "About Gemini CLI": "Про Gemini CLI",
  "Authenticated": "Авторизовано",
  "Not Authenticated": "Не авторизовано",
  "Connecting to Gemini...": "Підключення до Gemini...",
  "Thinking...": "Думаю..."
};

async function run() {
  const absTarget = path.resolve(TARGET_DIR);
  console.log('🚀 TOTAL TRANSLATION ENGINE: ' + absTarget);

  // 1. Вставляємо логіку перекладу в gemini.tsx
  const geminiPath = path.join(absTarget, 'packages/cli/src/gemini.tsx');
  if (fs.existsSync(geminiPath)) {
    let content = fs.readFileSync(geminiPath, 'utf8');
    const tFunc = `\n(globalThis as any).t = (text: string) => {\n  if (!text) return text;\n  const s = (globalThis as any).__GEMINI_CONFIG__?.merged || (globalThis as any).__GEMINI_CONFIG__;
  const l = s?.general?.locale || s?.locale || 'ua';
  if (l === 'en') return text;
  const dict: any = ${JSON.stringify(PHRASES)};
  const clean = text.trim();
  return dict[clean] || dict[text] || text;
};
`;
    content = tFunc + content;
    content = content.replace('const settings = loadSettings();', 'const settings = loadSettings(); (globalThis as any).__GEMINI_CONFIG__ = settings;');
    fs.writeFileSync(geminiPath, content);
  }

  // 2. Патчимо ВСІ UI файли
  const uiDir = path.join(absTarget, 'packages/cli/src/ui');
  const walk = (dir) => {
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) return walk(fullPath);
      if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;

      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      Object.keys(PHRASES).forEach(phrase => {
        if (content.includes(`'${phrase}'`) || content.includes(`"${phrase}"`)) {
          // Заміна на глобальну t()
          content = content.split(`'${phrase}'`).join(`((globalThis as any).t('${phrase}'))`);
          content = content.split(`"${phrase}"`).join(`((globalThis as any).t("${phrase}"))`);
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(fullPath, content);
        // console.log('✅ Patched UI: ' + path.relative(absTarget, fullPath));
      }
    });
  };
  walk(uiDir);

  // 3. Також патчимо Команди
  const cmdDir = path.join(absTarget, 'packages/cli/src/ui/commands');
  if (fs.existsSync(cmdDir)) walk(cmdDir);

  console.log('🎉 DONE! All phrases localized.');
}

run();