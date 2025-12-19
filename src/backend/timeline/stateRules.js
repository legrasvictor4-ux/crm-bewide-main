import dayjs from 'dayjs';

const INTERACTION_TYPES = new Set(['visit', 'call', 'whatsapp', 'email', 'demo', 'deal', 'note']);

const INTEREST_SCORE = {
  high: 15,
  medium: 8,
  low: 2,
};

const BLOCKER_PENALTY = 3;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getInterestLevel = (event = {}) => {
  const interest = event.structured_data?.interest_level || event.structured_data?.intent || event.structured_data?.interest;
  return typeof interest === 'string' ? interest.toLowerCase() : null;
};

const isPositiveInterest = (event) => {
  const level = getInterestLevel(event);
  return level === 'high' || level === 'medium';
};

export function scoreFromEvent(event = {}) {
  const level = getInterestLevel(event);
  const structured = event.structured_data || {};
  let score = INTEREST_SCORE[level] || 0;

  if (event.event_type === 'demo') score += 12;
  if (event.event_type === 'deal') score += 20;
  if (Array.isArray(structured.signals)) {
    score += Math.min(5, structured.signals.length * 2);
  }
  if (Array.isArray(structured.blocking_points) && structured.blocking_points.length > 0) {
    score -= Math.min(10, structured.blocking_points.length * BLOCKER_PENALTY);
  }
  return score;
}

function computeLeadScore(baseScore = 0, events = []) {
  let score = Number.isFinite(baseScore) ? baseScore : 0;
  const sorted = [...events].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const lastTwo = sorted.slice(-2);

  sorted.forEach((event) => {
    score += scoreFromEvent(event);
  });

  if (lastTwo.length === 2 && lastTwo.every(isPositiveInterest)) {
    score += 10;
  }

  const last = sorted[sorted.length - 1];
  if (last?.created_at && dayjs().diff(dayjs(last.created_at), 'day') > 14) {
    score -= 10;
  }

  return clamp(score, 0, 100);
}

function computeClosingProbability(baseProbability = 5, events = []) {
  const sorted = [...events].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const last = sorted[sorted.length - 1];
  if (!last) {
    return clamp(baseProbability, 0, 100);
  }

  const level = getInterestLevel(last);
  let probability = Number.isFinite(baseProbability) ? baseProbability : 5;

  if (level === 'high') probability = Math.max(probability, 70);
  if (level === 'medium') probability = Math.max(probability, 40);
  if (last.event_type === 'demo') probability = Math.max(probability, 60);
  if (last.event_type === 'deal') probability = Math.max(probability, 80);

  const daysSinceLast = dayjs().diff(dayjs(last.created_at), 'day');
  if (daysSinceLast > 30) {
    probability = Math.min(probability, 35);
  }

  return clamp(probability, 0, 100);
}

function computeStatus(account = {}, events = []) {
  const sorted = [...events].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const last = sorted[sorted.length - 1];
  if (!last) return account.current_status || 'new';

  if (last.event_type === 'deal') return 'negotiation';
  if (last.event_type === 'demo') return 'demo';

  const daysSinceLast = last.created_at ? dayjs().diff(dayjs(last.created_at), 'day') : 0;
  if (daysSinceLast > 14) return 'cooling';

  if (INTERACTION_TYPES.has(last.event_type)) {
    return 'engaged';
  }
  return account.current_status || 'engaged';
}

function nextActionAtFromEvent(event) {
  const candidate =
    event?.structured_data?.next_action?.date_suggestion ||
    event?.structured_data?.next_action_at ||
    event?.structured_data?.next_action_date;
  if (!candidate) return null;
  const parsed = dayjs(candidate);
  return parsed.isValid() ? parsed.toISOString() : null;
}

export function deriveAccountState(account = {}, events = []) {
  const sorted = [...events].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const last = sorted[sorted.length - 1];
  const lastInteraction = last?.created_at || account.last_interaction_at || null;

  const lead_score = computeLeadScore(account.lead_score, sorted);
  const closing_probability = computeClosingProbability(account.closing_probability, sorted);
  const current_status = computeStatus(account, sorted);
  const next_action_at = nextActionAtFromEvent(last) || account.next_action_at || null;

  return {
    ...account,
    lead_score,
    closing_probability,
    current_status,
    last_interaction_at: lastInteraction,
    next_action_at,
  };
}
