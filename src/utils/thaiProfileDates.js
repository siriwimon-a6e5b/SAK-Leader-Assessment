export function formatBuddhistYear(value) {
  const year = Number(String(value ?? '').trim());
  if (!Number.isInteger(year) || year < 1900 || year > 2999) return '—';
  return `พ.ศ. ${year < 2400 ? year + 543 : year}`;
}

function parseProfileDate(value) {
  const text = String(value ?? '').trim();
  if (!text || text === '-') return null;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  const local = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!iso && !local) return null;
  let year = Number(iso ? iso[1] : local[3]);
  const month = Number(iso ? iso[2] : local[2]);
  const day = Number(iso ? iso[3] : local[1]);
  if (year >= 2400) year -= 543;
  if (year < 1900) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function formatThaiProfileDate(value) {
  if (/^\d{4}$/.test(String(value ?? '').trim())) return formatBuddhistYear(value);
  const date = parseProfileDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    day: 'numeric', month: 'long', year: 'numeric', era: 'short', timeZone: 'UTC',
  }).format(date);
}

export function formatThaiProfileDateShort(value) {
  if (/^\d{4}$/.test(String(value ?? '').trim())) return formatBuddhistYear(value);
  const date = parseProfileDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(date);
}

export function formatThaiRound(value) {
  return String(value || '—').replace(/\b(?:19|20|21)\d{2}\b/g, (year) => String(Number(year) + 543));
}

export function formatWorkTenure(value, now = new Date()) {
  const start = parseProfileDate(value);
  if (!start || Number.isNaN(now.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(now);
  const read = (type) => Number(parts.find((part) => part.type === type).value);
  const year = read('year'), month = read('month'), day = read('day');
  if (start.getTime() > Date.UTC(year, month - 1, day)) return 'ยังไม่เริ่มงาน';
  let months = (year - start.getUTCFullYear()) * 12 + month - 1 - start.getUTCMonth();
  const anniversaryDay = Math.min(start.getUTCDate(), new Date(Date.UTC(year, month, 0)).getUTCDate());
  if (day < anniversaryDay) months -= 1;
  if (months === 0) return 'น้อยกว่า 1 เดือน';
  return `${Math.floor(months / 12)} ปี ${months % 12} เดือน`;
}
