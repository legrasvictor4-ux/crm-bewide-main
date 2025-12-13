import dayjs from 'dayjs';

export function computeLeadScore(client = {}) {
  let score = 0;
  if (client.email) score += 10;
  if (client.phone) score += 10;
  if (client.imported_at && dayjs(client.imported_at).isAfter(dayjs().subtract(14, 'day'))) score += 15;
  const meta = client.metadata || {};
  const lat = meta.lat ?? meta.latitude;
  const lng = meta.lng ?? meta.longitude;
  if (typeof lat === 'number' && typeof lng === 'number') score += 20;
  if (client.notes) score += Math.min(10, Math.floor(client.notes.length / 100));
  return Math.min(100, score);
}
