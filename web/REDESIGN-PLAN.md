# Редизайн в стиле Linear — план

Источник: `linear-design/DESIGN.md`. Файлы: `web/src/style.css`, `web/index.html`.
Данные не трогаем (`/api/banks` уже работает). Не коммитить без согласия.

## Решения
- Шрифты: локальные `InterVariable-100.woff2` + `BerkeleyMono-100.woff2` из `linear-design/fonts/` → копируем в `web/public/fonts/`, подключаем через `@font-face`. Google Fonts (Fraunces, IBM Plex) убираем из `index.html`.
- Бейдж «непроверенный банк»: нейтральный `--text-muted`, отдельного warning-цвета в палитре Linear нет.
- Контейнер `.wrap`: оставляем `max-width: 1040px` (не 1280px) — под текущий контент.
- Тёмная тема (`prefers-color-scheme`, `[data-theme="dark"]`) удаляется полностью — Linear светлая, без тумблера.

## Токены (было → станет)
| Было | Станет |
|---|---|
| `--paper: #f2f4ef` | `--bg: #ffffff` |
| `--paper-raised: #ffffff` | `--surface: #f4f2f4` |
| `--ink: #15231d` | `--text: #080808` |
| `--ink-soft` | `--text-muted: #8b93a1` |
| `--ink-faint` | `--text-faint: #b4bcd0` |
| `--emerald` / `--gold` | `--accent: #7170ff` (+ `--accent-hover: #828fff`) |
| `--up: #1e6f53` | `--up: #27a644` |
| `--down: #a8402a` | `--down: #f34e52` |
| `--line` / `--line-strong` | `--border: rgba(8,8,8,.08)` |

Радиус карточек/таблиц/графика: 6px → 9px везде. `.ridge` (горы в шапке) — удалить.

## Этапы
1. ✅ **Токены и палитра** — `:root`, удаление dark-theme блоков и `.ridge`. Проверено Playwright.
2. ✅ **Типографика** — `@font-face` Inter Variable + Berkeley Mono, вес заголовков 700, дробные размеры (12.5/13.5px) очищены до целых. Проверено Playwright.
3. ✅ **Карточки валют** — `.board`, `.board-cell` (uppercase-коды, паддинг 12/16), `.hero-*`. Border-radius нормализован: 9px контейнеры, 6px контролы. Проверено Playwright.
4. ✅ **Таблица банков** — `.rates-table` фон `--bg`, uppercase-заголовки, паддинг 12/16. Проверено Playwright.
5. ✅ **График** — токены `.chart-*` подхватились автоматически из этапа 1 (accent/border/text-faint), радиус 9px. Проверено Playwright, включая tooltip.
6. ⏳ **Мобильная версия** — breakpoints 640/928px, паддинги по 4px-сетке. Обсуждается отдельно перед стартом.

Проверка каждого этапа — Playwright (worker :8787, web :5173). Не закоммичено — ждём согласия пользователя.
