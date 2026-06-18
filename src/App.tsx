import { FormEvent, useEffect, useMemo, useState } from 'react';

const HISTORY_KEY = 'quickwa:recent-numbers';
const DEFAULT_MESSAGE = 'Hi, I would like to ask about your service.';

type Country = {
  name: string;
  code: string;
  localExample: string;
};

type RecentNumber = {
  raw: string;
  normalized: string;
  formatted: string;
  countryCode: string;
};

const COUNTRIES: Country[] = [
  { name: 'Hong Kong', code: '852', localExample: '9123 4567' },
  { name: 'Macau', code: '853', localExample: '6123 4567' },
  { name: 'China', code: '86', localExample: '138 0013 8000' },
  { name: 'Taiwan', code: '886', localExample: '912 345 678' },
  { name: 'Singapore', code: '65', localExample: '8123 4567' },
  { name: 'Malaysia', code: '60', localExample: '12 345 6789' },
  { name: 'Thailand', code: '66', localExample: '81 234 5678' },
  { name: 'Japan', code: '81', localExample: '90 1234 5678' },
  { name: 'South Korea', code: '82', localExample: '10 1234 5678' },
  { name: 'Philippines', code: '63', localExample: '917 123 4567' },
  { name: 'Indonesia', code: '62', localExample: '812 3456 7890' },
  { name: 'Vietnam', code: '84', localExample: '91 234 5678' },
  { name: 'India', code: '91', localExample: '98765 43210' },
  { name: 'United Arab Emirates', code: '971', localExample: '50 123 4567' },
  { name: 'United Kingdom', code: '44', localExample: '7400 123456' },
  { name: 'United States / Canada', code: '1', localExample: '415 555 2671' },
  { name: 'Australia', code: '61', localExample: '412 345 678' },
  { name: 'New Zealand', code: '64', localExample: '21 123 4567' },
  { name: 'France', code: '33', localExample: '6 12 34 56 78' },
  { name: 'Germany', code: '49', localExample: '151 23456789' },
  { name: 'Italy', code: '39', localExample: '312 345 6789' },
  { name: 'Spain', code: '34', localExample: '612 34 56 78' },
  { name: 'Netherlands', code: '31', localExample: '6 12345678' },
  { name: 'Switzerland', code: '41', localExample: '78 123 45 67' },
  { name: 'Brazil', code: '55', localExample: '11 91234 5678' },
  { name: 'Mexico', code: '52', localExample: '55 1234 5678' },
  { name: 'South Africa', code: '27', localExample: '82 123 4567' },
];

function extractDigits(value: string) {
  return value.replace(/[^\d]/g, '');
}

function normalizePhone(value: string, countryCode: string) {
  const digits = extractDigits(value);

  if (!digits) return '';

  if (value.trim().startsWith('+')) {
    return digits.slice(0, 15);
  }

  if (digits.startsWith(countryCode) && digits.length > countryCode.length + 3) {
    return digits.slice(0, 15);
  }

  return `${countryCode}${digits}`.slice(0, 15);
}

function getLocalNumber(normalized: string, countryCode: string) {
  return normalized.startsWith(countryCode) ? normalized.slice(countryCode.length) : normalized;
}

function isValidPhone(normalized: string) {
  return /^\d{7,15}$/.test(normalized);
}

function formatPhone(normalized: string, countryCode: string) {
  if (!normalized) return '';

  const local = getLocalNumber(normalized, countryCode);
  const groupedLocal = local.replace(/(\d{4})(?=\d)/g, '$1 ');

  if (normalized.startsWith(countryCode)) {
    return `+${countryCode} ${groupedLocal}`.trim();
  }

  return `+${normalized}`;
}

function loadHistory(): RecentNumber[] {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as RecentNumber[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(items: RecentNumber[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

export default function App() {
  const [countryCode, setCountryCode] = useState('852');
  const [phoneInput, setPhoneInput] = useState('');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [history, setHistory] = useState<RecentNumber[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const selectedCountry = COUNTRIES.find((country) => country.code === countryCode) ?? COUNTRIES[0];
  const normalizedPhone = useMemo(() => normalizePhone(phoneInput, countryCode), [countryCode, phoneInput]);
  const formattedPhone = useMemo(() => formatPhone(normalizedPhone, countryCode), [countryCode, normalizedPhone]);
  const isPhoneReady = isValidPhone(normalizedPhone);

  const whatsappUrl = useMemo(() => {
    if (!isPhoneReady) return '';
    const url = new URL(`https://wa.me/${normalizedPhone}`);
    const trimmedMessage = message.trim();
    if (trimmedMessage) {
      url.searchParams.set('text', trimmedMessage);
    }
    return url.toString();
  }, [isPhoneReady, message, normalizedPhone]);

  function rememberNumber(item: RecentNumber) {
    const nextHistory = [item, ...history.filter((historyItem) => historyItem.normalized !== item.normalized)].slice(0, 10);
    setHistory(nextHistory);
    saveHistory(nextHistory);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isPhoneReady || !whatsappUrl) return;

    rememberNumber({
      raw: phoneInput,
      normalized: normalizedPhone,
      formatted: formattedPhone,
      countryCode,
    });

    window.location.href = whatsappUrl;
  }

  function handleRecentClick(item: RecentNumber) {
    setCountryCode(item.countryCode || '852');
    setPhoneInput(getLocalNumber(item.normalized, item.countryCode || '852'));
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  return (
    <main className="app-shell">
      <section className="card" aria-labelledby="page-title">
        <div className="brand-row">
          <div className="brand-mark">WA</div>
          <div>
            <p className="eyebrow">QuickWA</p>
            <h1 id="page-title">Start WhatsApp without saving contacts</h1>
          </div>
        </div>

        <form className="quick-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="country">
            Country / region code
          </label>
          <select
            id="country"
            className="country-select"
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
          >
            {COUNTRIES.map((country) => (
              <option key={`${country.code}-${country.name}`} value={country.code}>
                {country.name} (+{country.code})
              </option>
            ))}
          </select>

          <label className="field-label" htmlFor="phone">
            Phone number
          </label>
          <div className="phone-field">
            <span className="country-code">+{countryCode}</span>
            <input
              id="phone"
              inputMode="tel"
              autoComplete="tel"
              placeholder={selectedCountry.localExample}
              value={phoneInput}
              onChange={(event) => setPhoneInput(event.target.value)}
              aria-describedby="phone-preview phone-help"
            />
          </div>
          <p className="helper-text" id="phone-help">
            Choose the country code, then paste or type the number. Spaces, dashes and brackets are cleaned automatically.
          </p>

          <div className={`preview ${isPhoneReady ? 'preview-valid' : ''}`} id="phone-preview">
            <span>Preview</span>
            <strong>{formattedPhone || `+${countryCode} ____`}</strong>
          </div>

          <label className="field-label" htmlFor="message">
            Message <span>(optional)</span>
          </label>
          <textarea
            id="message"
            rows={3}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Hi, I would like to ask about your service."
          />

          <button className="primary-button" type="submit" disabled={!isPhoneReady}>
            Open WhatsApp
          </button>
        </form>

        {history.length > 0 && (
          <section className="history-section" aria-labelledby="history-title">
            <div className="history-header">
              <h2 id="history-title">Recent</h2>
              <button type="button" className="text-button" onClick={clearHistory}>
                Clear
              </button>
            </div>
            <div className="history-list">
              {history.map((item) => (
                <button
                  type="button"
                  className="history-item"
                  key={item.normalized}
                  onClick={() => handleRecentClick(item)}
                >
                  {item.formatted}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="seo-section" aria-labelledby="seo-title">
          <h2 id="seo-title">Quick WhatsApp chat link generator</h2>
          <p>
            QuickWA helps you open a WhatsApp conversation with any international phone number without saving it to your contacts first.
          </p>
          <p>
            Select a country code, enter the phone number, add an optional message, and create a direct WhatsApp chat link instantly.
          </p>
        </section>
      </section>
    </main>
  );
}
