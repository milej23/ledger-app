export const CATEGORIES = {
  food:      { label: 'Food',       icon: '🍽', color: '#f97316', keywords: ['food','lunch','dinner','breakfast','restaurant','burger','pizza','sushi','meal','coffee','cafe','tea','drink','beer','wine','ramen','pasta','curry','rice','bread','snack'] },
  groceries: { label: 'Groceries',  icon: '🛒', color: '#84cc16', keywords: ['groceries','grocery','supermarket','walmart','costco','produce','vegetables','fruits','egg','milk','butter','cheese','flour','sugar'] },
  transport: { label: 'Transport',  icon: '🚗', color: '#3b82f6', keywords: ['uber','lyft','taxi','grab','train','metro','subway','gas','fuel','petrol','parking','toll','flight','bus','mrt'] },
  health:    { label: 'Health',     icon: '💊', color: '#ec4899', keywords: ['doctor','pharmacy','medicine','gym','fitness','hospital','clinic','dentist','vitamin','supplement','protein'] },
  shopping:  { label: 'Shopping',   icon: '🛍', color: '#a855f7', keywords: ['shopping','amazon','clothes','shoes','shirt','dress','pants','jacket','bag','mall','nike','adidas','gadget','laptop','phone'] },
  bills:     { label: 'Bills',      icon: '📄', color: '#6b7280', keywords: ['bill','rent','mortgage','electricity','water','internet','insurance','subscription','netflix','spotify','apple','google','amazon prime'] },
  household: { label: 'Household',  icon: '🏠', color: '#f59e0b', keywords: ['cleaning','detergent','furniture','toilet paper','laundry','soap','shampoo','household','repair','hardware'] },
  education: { label: 'Education',  icon: '📚', color: '#06b6d4', keywords: ['tuition','university','college','course','textbook','lesson','workshop','exam','books','school'] },
  income:    { label: 'Income',     icon: '💰', color: '#22c55e', keywords: [] },
  other:     { label: 'Other',      icon: '📌', color: '#94a3b8', keywords: [] },
};

export const INCOME_WORDS = ['received','earned','got paid','salary','wage','paycheck','income','payment','refund','cashback','bonus','deposit','freelance'];

export const CURRENCIES = [
  { code: 'USD', symbol: '$',   name: 'US Dollar',        flag: '🇺🇸' },
  { code: 'EUR', symbol: '€',   name: 'Euro',              flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',   name: 'British Pound',     flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥',   name: 'Japanese Yen',      flag: '🇯🇵' },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar',     flag: '🇹🇼' },
  { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar',   flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CNY', symbol: '¥',   name: 'Chinese Yuan',      flag: '🇨🇳' },
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee',      flag: '🇮🇳' },
  { code: 'KRW', symbol: '₩',   name: 'Korean Won',        flag: '🇰🇷' },
  { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar',  flag: '🇸🇬' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar',  flag: '🇭🇰' },
  { code: 'BRL', symbol: 'R$',  name: 'Brazilian Real',    flag: '🇧🇷' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso',      flag: '🇲🇽' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham',        flag: '🇦🇪' },
];

export function getCatIcon(cat)  { return CATEGORIES[cat]?.icon  || '📌'; }
export function getCatLabel(cat) { return CATEGORIES[cat]?.label || 'Other'; }
export function getCatColor(cat) { return CATEGORIES[cat]?.color || '#94a3b8'; }
