import { CATEGORIES, INCOME_WORDS } from './categories';

export const MAX_AMOUNT = 10_000_000;

function safeMath(expr) {
  const clean = expr.replace(/\s/g, '');
  if (!/^\d+(?:\.\d+)?(?:[+\-*/]\d+(?:\.\d+)?)*$/.test(clean)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function('"use strict"; return (' + clean + ')')();
    return isFinite(result) && result > 0 && result < MAX_AMOUNT ? result : null;
  } catch {
    return null;
  }
}

export function parse(text) {
  const lower = text.toLowerCase();
  const isIncome = INCOME_WORDS.some(w => lower.includes(w));

  const amountRx  = /\$\s?(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s?\$|(\d+(?:[.,]\d+)?)\s?(?:dollars?|usd|bucks?)/i;
  const mathRx    = /\b(\d+(?:\.\d+)?(?:\s*[+\-*/]\s*\d+(?:\.\d+)?)+)\b/;
  const fallbackRx = /\b(\d+(?:\.\d+)?)\b/g;

  let amount = null;
  let mathExpr = null;
  let plainNumStr = null;

  const amMatch = text.match(amountRx);
  if (amMatch) {
    amount = parseFloat((amMatch[1] || amMatch[2] || amMatch[3]).replace(',', '.'));
    if (amount >= MAX_AMOUNT) return { tooLarge: true };
  } else {
    const mMatch = text.match(mathRx);
    if (mMatch) {
      const result = safeMath(mMatch[1]);
      if (result !== null) { amount = result; mathExpr = mMatch[1]; }
    }
    if (amount === null) {
      const nums = [];
      let m;
      while ((m = fallbackRx.exec(text)) !== null) {
        const n = parseFloat(m[1]);
        if (n > 0 && n < MAX_AMOUNT) nums.push({ n, str: m[1] });
      }
      if (nums.length) {
        const best = nums.reduce((a, b) => (b.n > a.n ? b : a));
        amount = best.n;
        plainNumStr = best.str;
      } else if ((text.match(/\d+(?:\.\d+)?/g) || []).some(n => parseFloat(n) >= MAX_AMOUNT)) {
        return { tooLarge: true };
      }
    }
  }

  if (!amount) return null;

  let cat = 'other';
  for (const [key, data] of Object.entries(CATEGORIES)) {
    if (key === 'income' || key === 'other') continue;
    if (data.keywords.some(k => {
      const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp('(?<![\\w])' + esc + '(?![\\w])', 'i').test(lower);
    })) { cat = key; break; }
  }
  if (isIncome) cat = 'income';

  let desc = text
    .replace(amountRx, '')
    .replace(mathExpr ? new RegExp(mathExpr.replace(/[+\-*.\/]/g, c => '\\' + c)) : /(?:)/, '')
    .replace(plainNumStr ? new RegExp('\\b' + plainNumStr.replace(/\./g, '\\.') + '\\b') : /(?:)/, '')
    .replace(/\b(spent|bought|paid|purchased|got|received|earned|for|on|a|an|the|some)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();

  if (!desc || desc.length < 2) desc = cat === 'income' ? 'Income' : 'Expense';
  desc = desc.charAt(0).toUpperCase() + desc.slice(1);

  return { amount, cat, desc, isIncome };
}
