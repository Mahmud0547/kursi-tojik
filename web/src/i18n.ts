// Простая i18n-система без внешних библиотек: словари + функция t().

export type Lang = "tj" | "ru";

const STORAGE_KEY = "lang";

const dict = {
  tj: {
    "header.status.loading": "боркунӣ…",
    "header.status.updated": "навсозӣ шуд {date}",
    "header.status.offline": "пайваст нест",
    "hero.title": "Қурби сомонӣ имрӯз",
    "hero.unit": "TJS барои 1 доллари ИМА",
    "hero.noData": "маълумот нест",
    "converter.title": "Мубодилаи асъор",
    "converter.amountFrom": "Маблағ",
    "converter.amountTo": "Натиҷа",
    "converter.from": "Аз асъор",
    "converter.to": "Ба асъор",
    "converter.swap": "Ҷои асъорҳоро иваз кардан",
    "converter.unavailable": "Мубодилагар дастнорас аст: баъзе аз қурбҳо бор нашуданд.",
    "chart.title": "Таърихи қурб",
    "chart.currencyTabs": "Асъори график",
    "chart.rangeTabs": "Давраи график",
    "chart.range.7": "7 рӯз",
    "chart.range.30": "30 рӯз",
    "chart.range.90": "90 рӯз",
    "chart.loading": "Таърихи қурбро бор мекунем…",
    "chart.error": "Қурби НБТ бор нашуд. Санҷед, ки Cloudflare Worker насб шудааст ва VITE_WORKER_URL дуруст нишон дода шудааст.",
    "banks.title": "Қурбҳои бонкҳои Тоҷикистон",
    "banks.loading": "Қурбҳои бонкҳоро бор мекунем…",
    "banks.error": "Қурбҳо мувақҳатан дастнорасанд",
    "banks.table.bank": "Бонк",
    "banks.table.buy": "харид",
    "banks.table.sell": "фурӯш",
    "banks.note": "Қурбҳои нақдии бонкҳо, навсозӣ шуд {date}",
    "banks.comparator.direction": "Амалиёт",
    "banks.comparator.buy": "Мехоҳам асъор харам",
    "banks.comparator.sell": "Мехоҳам асъор фурӯшам",
    "banks.comparator.currency": "Асъор",
    "banks.comparator.amount": "Маблағ",
    "banks.comparator.hint": "Муқоиса кунед, дар куҷо харид ё фурӯши асъор фоидаовар аст",
    "banks.comparator.best": "Фоидаовартарин",
    "banks.comparator.rate": "Қурб",
    "banks.unverified": "намуна · навсозӣ шуд {date}",
    "transfers.title": "Ҳисобкунаки интиқоли пул",
    "transfers.amount": "Маблағи интиқол",
    "transfers.currency": "Асъори интиқол",
    "transfers.hint": "Коромиссия ва маблағи гирифташаванда — тахминӣ",
    "transfers.best": "Фоидаовартарин",
    "transfers.fee": "Комиссия",
    "transfers.received": "Гиранда мегирад",
    "footer.official": "Қурби расмӣ — Бонки миллии Тоҷикистон",
    "footer.disclaimer": "Қурбҳои бонкҳо ва тарифҳои интиқол дастӣ ворид мешаванд ва метавонанд аз қурбҳои воқеӣ дар филиалҳо фарқ кунанд.",
    "footer.about": "Қурси Тоҷик — агрегатори мустақил ва ғайритиҷоратии қурбҳо. Бо НБТ ё бонку системаҳои дар боло номбаршуда алоқаманд нест.",
    "currency.TJS": "Сомонӣ",
    "currency.USD": "Доллари ИМА",
    "currency.EUR": "Евро",
    "currency.RUB": "Рубли Русия",
    "currency.CNY": "Юани Хитой",
    "currency.KZT": "Тенгеи Қазоқистон",
    "lang.toggle": "RU",
    "theme.toggle": "Иваз кардани мавзӯъ",
  },
  ru: {
    "header.status.loading": "загрузка…",
    "header.status.updated": "обновлено {date}",
    "header.status.offline": "нет соединения",
    "hero.title": "Курс сомони сегодня",
    "hero.unit": "TJS за 1 доллар США",
    "hero.noData": "нет данных",
    "converter.title": "Конвертер валют",
    "converter.amountFrom": "Сумма",
    "converter.amountTo": "Результат",
    "converter.from": "Из валюты",
    "converter.to": "В валюту",
    "converter.swap": "Поменять валюты местами",
    "converter.unavailable": "Конвертер недоступен: часть курсов не загрузилась.",
    "chart.title": "История курса",
    "chart.currencyTabs": "Валюта графика",
    "chart.rangeTabs": "Период графика",
    "chart.range.7": "7 дней",
    "chart.range.30": "30 дней",
    "chart.range.90": "90 дней",
    "chart.loading": "Загружаем историю курса…",
    "chart.error": "Не удалось загрузить курс НБТ. Проверьте, что Cloudflare Worker развёрнут и VITE_WORKER_URL указан верно.",
    "banks.title": "Курсы банков Таджикистана",
    "banks.loading": "Загружаем курсы банков…",
    "banks.error": "Курсы временно недоступны",
    "banks.table.bank": "Банк",
    "banks.table.buy": "покупка",
    "banks.table.sell": "продажа",
    "banks.note": "Наличные курсы банков, обновлено {date}",
    "banks.comparator.direction": "Операция",
    "banks.comparator.buy": "Хочу купить валюту",
    "banks.comparator.sell": "Хочу продать валюту",
    "banks.comparator.currency": "Валюта",
    "banks.comparator.amount": "Сумма",
    "banks.comparator.hint": "Сравните, где выгоднее купить или продать валюту",
    "banks.comparator.best": "Выгоднее всего",
    "banks.comparator.rate": "Курс",
    "banks.unverified": "пример · обновлено {date}",
    "transfers.title": "Калькулятор денежных переводов",
    "transfers.amount": "Сумма перевода",
    "transfers.currency": "Валюта перевода",
    "transfers.hint": "Комиссия и сумма к получению — оценка",
    "transfers.best": "Выгоднее всего",
    "transfers.fee": "Комиссия",
    "transfers.received": "Получатель получит",
    "footer.official": "Официальный курс — Национальный банк Таджикистана",
    "footer.disclaimer": "Курсы банков и тарифы переводов вносятся вручную и могут отличаться от актуальных значений в отделениях.",
    "footer.about": "Курси Точик — независимый некоммерческий агрегатор курсов. Не аффилирован с НБТ или упомянутыми банками и платёжными системами.",
    "currency.TJS": "Сомони",
    "currency.USD": "Доллар США",
    "currency.EUR": "Евро",
    "currency.RUB": "Российский рубль",
    "currency.CNY": "Китайский юань",
    "currency.KZT": "Казахстанский тенге",
    "lang.toggle": "TJ",
    "theme.toggle": "Переключить тему",
  },
} as const satisfies Record<Lang, Record<string, string>>;

export type TranslationKey = keyof (typeof dict)["ru"];

const LOCALES: Record<Lang, string> = { tj: "tg-TJ", ru: "ru-RU" };

let currentLang: Lang = readStoredLang();

function readStoredLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "ru" || stored === "tj" ? stored : "tj";
}

export function getLang(): Lang {
  return currentLang;
}

export function getLocale(): string {
  return LOCALES[currentLang];
}

export function setLang(lang: Lang) {
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang === "tj" ? "tg" : "ru";
}

/** Переводит ключ, подставляя {param} из vars. */
export function t(key: TranslationKey, vars?: Record<string, string>): string {
  let text: string = dict[currentLang][key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replace(`{${name}}`, value);
    }
  }
  return text;
}

/** Название валюты (TJS/USD/EUR/RUB/CNY/KZT) на текущем языке. */
export function currencyLabel(code: string): string {
  return t(`currency.${code}` as TranslationKey);
}

setLang(currentLang);
