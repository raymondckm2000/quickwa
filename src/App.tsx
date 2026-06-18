import { FormEvent, useEffect, useMemo, useState } from 'react';

const HISTORY_KEY = 'quickwa:recent-numbers';
const DEFAULT_MESSAGE = '你好，我想查詢一下服務詳情。';

type RecentNumber = {
  raw: string;
  normalized: string;
  formatted: string;
};

function extractDigits(value: string) {
  return value.replace(/[^\d]/g, '');
}

function normalizeHongKongNumber(value: string) {
  const digits = extractDigits(value);

  if (digits.startsWith('852') && digits.length >= 11) {
    return digits.slice(0, 11);
  }

  if (digits.length >= 8) {
    return `852${digits.slice(-8)}`;
  }

  return digits;
}

function getLocalNumber(normalized: string) {
  return normalized.startsWith('852') ? normalized.slice(3) : normalized;
}

function isValidHongKongNumber(normalized: string) {
  return /^852[2-9]\d{7}$/.test(normalized);
}

function formatPhone(normalized: string) {
  const local = getLocalNumber(normalized);

  if (local.length === 8) {
    return `+852 ${local.slice(0, 4)} ${local.slice(4)}`;
  }

  if (normalized.startsWith('852')) {
    return `+852 ${local}`.trim();
  }

  return local;
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
  const [phoneInput, setPhoneInput] = useState('');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [history, setHistory] = useState<RecentNumber[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const normalizedPhone = useMemo(() => normalizeHongKongNumber(phoneInput), [phoneInput]);
  const formattedPhone = useMemo(() => formatPhone(normalizedPhone), [normalizedPhone]);
  const isValidPhone = isValidHongKongNumber(normalizedPhone);

  const whatsappUrl = useMemo(() => {
    if (!isValidPhone) return '';
    const url = new URL(`https://wa.me/${normalizedPhone}`);
    const trimmedMessage = message.trim();
    if (trimmedMessage) {
      url.searchParams.set('text', trimmedMessage);
    }
    return url.toString();
  }, [isValidPhone, message, normalizedPhone]);

  function rememberNumber(item: RecentNumber) {
    const nextHistory = [item, ...history.filter((historyItem) => historyItem.normalized !== item.normalized)].slice(0, 10);
    setHistory(nextHistory);
    saveHistory(nextHistory);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidPhone || !whatsappUrl) return;

    rememberNumber({
      raw: phoneInput,
      normalized: normalizedPhone,
      formatted: formattedPhone,
    });

    window.location.href = whatsappUrl;
  }

  function handleRecentClick(item: RecentNumber) {
    setPhoneInput(getLocalNumber(item.normalized));
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
          <label className="field-label" htmlFor="phone">
            Phone number
          </label>
          <div className="phone-field">
            <span className="country-code">+852</span>
            <input
              id="phone"
              inputMode="tel"
              autoComplete="tel"
              placeholder="9123 4567"
              value={phoneInput}
              onChange={(event) => setPhoneInput(event.target.value)}
              aria-describedby="phone-preview phone-help"
            />
          </div>
          <p className="helper-text" id="phone-help">
            Paste any Hong Kong number. Spaces, dashes and brackets are cleaned automatically.
          </p>

          <div className={`preview ${isValidPhone ? 'preview-valid' : ''}`} id="phone-preview">
            <span>Preview</span>
            <strong>{formattedPhone || '+852 ____ ____'}</strong>
          </div>

          <label className="field-label" htmlFor="message">
            Message <span>(optional)</span>
          </label>
          <textarea
            id="message"
            rows={3}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="你好，我想查詢一下服務詳情。"
          />

          <button className="primary-button" type="submit" disabled={!isValidPhone}>
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
      </section>
    </main>
  );
}
