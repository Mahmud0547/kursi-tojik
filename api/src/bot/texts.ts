/** Bot replies in Tajik, Russian and English. Placeholders look like {name}. */

import type { BotLang } from "../db";

export const texts = {
  tj: {
    start:
      "Салом! Ман қурби расмии сомониро аз Бонки миллии Тоҷикистон нишон медиҳам.\n\n" +
      "Нависед:\n• <b>100 usd</b> — ба сомонӣ табдил медиҳам\n• <b>100 usd eur</b> — аз як асъор ба дигар\n" +
      "• /rate — қурбҳои имрӯза\n• /banks usd — қурби беҳтарини бонкҳо\n• /subscribe — ҳар саҳар соати 9:00 қурбро мефиристам\n• /lang — забон",
    rateTitle: "Қурби расмии Бонки миллии Тоҷикистон, {date}",
    convertSource: "Бо қурби расмии Бонки миллӣ, {date}. Бонкҳо метавонанд бо қурби дигар иваз кунанд.",
    banksTitle: "Қурби нақдии бонкҳо барои {code}",
    banksSellTo: "Агар {code} фурӯшед, беҳтарин: {bank} — {rate}",
    banksBuyFrom: "Агар {code} харед, беҳтарин: {bank} — {rate}",
    banksSource: "Маълумот аз nbt.tj, навсозӣ {updated}",
    banksUnknown: "Қурби бонкҳо танҳо барои USD, EUR ва RUB нашр мешавад. Масалан: /banks usd",
    noData: "Ҳоло маълумот нест. Лутфан баъдтар кӯшиш кунед.",
    unknownCurrency: "Ин асъорро намешиносам. Масалан: 100 usd, 50 eur, 1000 rub",
    badAmount: "Маблағро нафаҳмидам. Масалан: 100 usd",
    subscribed: "Хуб! Ҳар рӯз соати 9:00 (вақти Душанбе) қурбро мефиристам. Бекор кардан: /unsubscribe",
    unsubscribed: "Обуна бекор шуд.",
    langChoose: "Забонро интихоб кунед: /lang tj · /lang ru · /lang en",
    langSet: "Забон: тоҷикӣ.",
    help: "Нафаҳмидам. Нависед /start барои рӯйхати фармонҳо.",
    digestTitle: "Қурби имрӯза, {date}",
  },
  ru: {
    start:
      "Здравствуйте! Я показываю официальный курс сомони от Национального банка Таджикистана.\n\n" +
      "Напишите:\n• <b>100 usd</b> — переведу в сомони\n• <b>100 usd eur</b> — из одной валюты в другую\n" +
      "• /rate — курсы на сегодня\n• /banks usd — лучшие курсы банков\n• /subscribe — присылать курс каждое утро в 9:00\n• /lang — язык",
    rateTitle: "Официальный курс Национального банка Таджикистана, {date}",
    convertSource: "По официальному курсу Нацбанка на {date}. В банках курс может отличаться.",
    banksTitle: "Наличный курс банков для {code}",
    banksSellTo: "Продать {code} выгоднее всего: {bank} — {rate}",
    banksBuyFrom: "Купить {code} выгоднее всего: {bank} — {rate}",
    banksSource: "Данные с nbt.tj, обновлено {updated}",
    banksUnknown: "Курсы банков публикуются только для USD, EUR и RUB. Например: /banks usd",
    noData: "Сейчас данных нет. Попробуйте позже.",
    unknownCurrency: "Не знаю такую валюту. Например: 100 usd, 50 eur, 1000 rub",
    badAmount: "Не понял сумму. Например: 100 usd",
    subscribed: "Готово! Буду присылать курс каждый день в 9:00 по Душанбе. Отписаться: /unsubscribe",
    unsubscribed: "Подписка отменена.",
    langChoose: "Выберите язык: /lang tj · /lang ru · /lang en",
    langSet: "Язык: русский.",
    help: "Не понял. Напишите /start, чтобы увидеть команды.",
    digestTitle: "Курс на сегодня, {date}",
  },
  en: {
    start:
      "Hello! I show the official Tajik somoni rates from the National Bank of Tajikistan.\n\n" +
      "Send:\n• <b>100 usd</b> — I convert it to somoni\n• <b>100 usd eur</b> — from one currency to another\n" +
      "• /rate — today's rates\n• /banks usd — best bank rates\n• /subscribe — the rate every morning at 9:00\n• /lang — language",
    rateTitle: "Official rates of the National Bank of Tajikistan, {date}",
    convertSource: "At the official National Bank rate for {date}. Banks may use a different rate.",
    banksTitle: "Bank cash rates for {code}",
    banksSellTo: "Best place to sell {code}: {bank} — {rate}",
    banksBuyFrom: "Best place to buy {code}: {bank} — {rate}",
    banksSource: "Data from nbt.tj, updated {updated}",
    banksUnknown: "Bank rates are published for USD, EUR and RUB only. For example: /banks usd",
    noData: "No data right now. Please try again later.",
    unknownCurrency: "I don't know this currency. For example: 100 usd, 50 eur, 1000 rub",
    badAmount: "I couldn't read the amount. For example: 100 usd",
    subscribed: "Done! I'll send the rate every day at 9:00 Dushanbe time. Stop: /unsubscribe",
    unsubscribed: "Unsubscribed.",
    langChoose: "Choose a language: /lang tj · /lang ru · /lang en",
    langSet: "Language: English.",
    help: "I didn't get that. Send /start to see the commands.",
    digestTitle: "Today's rates, {date}",
  },
} satisfies Record<BotLang, Record<string, string>>;

export type TextKey = keyof (typeof texts)["en"];

export function say(lang: BotLang, key: TextKey, vars: Record<string, string> = {}): string {
  return texts[lang][key].replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
}

/** Telegram language_code → bot language. Tajik is the default. */
export function langFromTelegram(code: string | undefined): BotLang {
  if (code?.startsWith("ru")) return "ru";
  if (code?.startsWith("en")) return "en";
  return "tj";
}

/** 9.2201 → "9,2201" (tj, ru) or "9.2201" (en). */
export function number(value: number, lang: BotLang, digits = 4): string {
  const text = value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: digits, useGrouping: true }).replace(/,/g, " ");
  return lang === "en" ? text.replace(/ /g, ",") : text.replace(".", ",");
}

/** "2026-10-01" → "01.10.2026". */
export function dmy(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}
