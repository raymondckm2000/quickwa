import { FormEvent, useEffect, useMemo, useState } from 'react';

const HISTORY_KEY = 'quickwa:recent-numbers';
const DEFAULT_MESSAGE = 'Hi, I would like to ask about your service.';
const FALLBACK_COUNTRY_CODE = '1';

type Country = {
  name: string;
  code: string;
  iso2: string;
  localExample: string;
};

type RecentNumber = {
  raw: string;
  normalized: string;
  formatted: string;
  countryCode: string;
};

type GeoResponse = {
  country_code?: string;
};

const COUNTRIES: Country[] = [
  { name: 'Hong Kong', code: '852', iso2: 'HK', localExample: 'XXXX XXXX' },
  { name: 'Macau', code: '853', iso2: 'MO', localExample: 'XXXX XXXX' },
  { name: 'China', code: '86', iso2: 'CN', localExample: 'XXX XXXX XXXX' },
  { name: 'Taiwan', code: '886', iso2: 'TW', localExample: 'XXX XXX XXX' },
  { name: 'Singapore', code: '65', iso2: 'SG', localExample: 'XXXX XXXX' },
  { name: 'Malaysia', code: '60', iso2: 'MY', localExample: 'XX XXX XXXX' },
  { name: 'Thailand', code: '66', iso2: 'TH', localExample: 'XX XXX XXXX' },
  { name: 'Japan', code: '81', iso2: 'JP', localExample: 'XX XXXX XXXX' },
  { name: 'South Korea', code: '82', iso2: 'KR', localExample: 'XX XXXX XXXX' },
  { name: 'Philippines', code: '63', iso2: 'PH', localExample: 'XXX XXX XXXX' },
  { name: 'Indonesia', code: '62', iso2: 'ID', localExample: 'XXX XXXX XXXX' },
  { name: 'Vietnam', code: '84', iso2: 'VN', localExample: 'XX XXX XXXX' },
  { name: 'India', code: '91', iso2: 'IN', localExample: 'XXXXX XXXXX' },
  { name: 'United Arab Emirates', code: '971', iso2: 'AE', localExample: 'XX XXX XXXX' },
  { name: 'United Kingdom', code: '44', iso2: 'GB', localExample: 'XXXX XXXXXX' },
  { name: 'United States / Canada', code: '1', iso2: 'US', localExample: 'XXX XXX XXXX' },
  { name: 'Australia', code: '61', iso2: 'AU', localExample: 'XXX XXX XXX' },
  { name: 'New Zealand', code: '64', iso2: 'NZ', localExample: 'XX XXX XXXX' },
  { name: 'France', code: '33', iso2: 'FR', localExample: 'X XX XX XX XX' },
  { name: 'Germany', code: '49', iso2: 'DE', localExample: 'XXX XXXXXXXX' },
  { name: 'Italy', code: '39', iso2: 'IT', localExample: 'XXX XXX XXXX' },
  { name: 'Spain', code: '34', iso2: 'ES', localExample: 'XXX XX XX XX' },
  { name: 'Netherlands', code: '31', iso2: 'NL', localExample: 'X XXXXXXXX' },
  { name: 'Switzerland', code: '41', iso2: 'CH', localExample: 'XX XXX XX XX' },
  { name: 'Brazil', code: '55', iso2: 'BR', localExample: 'XX XXXXX XXXX' },
  { name: 'Mexico', code: '52', iso2: 'MX', localExample: 'XX XXXX XXXX' },
  { name: 'South Africa', code: '27', iso2: 'ZA', localExample: 'XX XXX XXXX' },
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

function findCountryByIso2(iso2: string) {
  return COUNTRIES.find((country) => country.iso2 === iso2.toUpperCase());
}

export default function App() {
  const [countryCode, setCountryCode] = useState(FALLBACK_COUNTRY_CODE);
  const [phoneInput, setPhoneInput] = useState('');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [history, setHistory] = useState<RecentNumber[]>([]);
  const [locationStatus, setLocationStatus] = useState('Detecting your country code...');

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function detectCountryCode() {
      try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error('Unable to detect location');

        const data = (await response.json()) as GeoResponse;
        const detectedCountry = data.country_code ? findCountryByIso2(data.country_code) : undefined;

        if (!isMounted) return;

        if (detectedCountry) {
          setCountryCode(detectedCountry.code);
          setLocationStatus(`Auto-detected: ${detectedCountry.name} (+${detectedCountry.code})`);
        } else {
          setLocationStatus('Country not detected. Please choose your country code.');
        }
      } catch {
        if (isMounted) {
          setLocationStatus('Country not detected. Please choose your country code.');
        }
      }
    }

    detectCountryCode();

    return () => {
      isMounted = false;
    };
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

  function handleCountryChange(nextCountryCode: string) {
    setCountryCode(nextCountryCode);
    const selected = COUNTRIES.find((country) => country.code === nextCountryCode);
    if (selected) {
      setLocationStatus(`Selected: ${selected.name} (+${selected.code})`);
    }
  }

  function handleRecentClick(item: RecentNumber) {
    setCountryCode(item.countryCode || FALLBACK_COUNTRY_CODE);
    setPhoneInput(getLocalNumber(item.normalized, item.countryCode || FALLBACK_COUNTRY_CODE));
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
            onChange={(event) => handleCountryChange(event.target.value)}
          >
            {COUNTRIES.map((country) => (
              <option key={`${country.code}-${country.name}`} value={country.code}>
                {country.name} (+{country.code})
              </option>
            ))}
          </select>
          <p className="helper-text location-status">{locationStatus}</p>

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
            We try to detect your country code from your IP address. You can still change it manually.
          </p>

          <div className={`preview ${isPhoneReady ? 'preview-valid' : ''}`} id="phone-preview">
            <span>Preview</span>
            <strong>{formattedPhone || `+${countryCode} ${selectedCountry.localExample}`}</strong>
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
