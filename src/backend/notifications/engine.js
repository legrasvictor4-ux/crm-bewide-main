import dayjs from 'dayjs';

const MAX_PER_DAY = 2;
const QUIET_STATUSES = new Set(['won', 'lost']);

const priorityOrder = { P0: 0, P1: 1, P2: 2 };

const within = (date, unit, amount) => dayjs().diff(dayjs(date), unit) <= amount;

const hasUpcoming = (date, hours) => {
  if (!date) return false;
  const delta = dayjs(date).diff(dayjs(), 'hour', true);
  return delta >= 0 && delta <= hours;
};

function lastInteraction(client) {
  return client.last_interaction_at || client.date_updated || client.date_created || null;
}

function meetingCandidates(client) {
  const all = [];
  const primary = client.appointment?.date;
  if (primary) all.push({ date: primary, summary: client.appointment.summary });
  if (Array.isArray(client.additional_appointments)) {
    client.additional_appointments.forEach((appt) => {
      if (appt?.date) all.push({ date: appt.date, summary: appt.summary || appt.objective });
    });
  }
  return all;
}

function buildAction(primary, alt) {
  return [primary, alt].filter(Boolean)[0];
}

export function evaluateNotifications(clients = [], options = {}) {
  const {
    now = new Date(),
    allowCopilot = true,
    quietHours = { start: 21, end: 7.5 }, // 21:00 - 07:30
  } = options;

  const nowHour = dayjs(now).hour() + dayjs(now).minute() / 60;
  const quiet = nowHour >= quietHours.start || nowHour <= quietHours.end;

  const raw = [];

  for (const client of clients) {
    const status = (client.status || '').toLowerCase();
    if (QUIET_STATUSES.has(status)) continue;

    const last = lastInteraction(client);
    const company = client.company || client.primary_contact?.name || 'Lead';

    // Follow-up (P0)
    if (last && dayjs(now).diff(dayjs(last), 'day') >= 7) {
      raw.push({
        lead_id: client.id,
        priority: 'P0',
        category: 'follow_up',
        title: `Relance aujourd'hui – ${company}`,
        body: 'Aucune réponse depuis 7j',
        action: buildAction('Appeler', 'WhatsApp'),
      });
    }

    // Deal risk (P0): inactive 10d+
    if (last && dayjs(now).diff(dayjs(last), 'day') >= 10) {
      raw.push({
        lead_id: client.id,
        priority: 'P0',
        category: 'deal_risk',
        title: `Risque deal – ${company}`,
        body: 'Inactif depuis 10j',
        action: 'Appeler',
      });
    }

    // Post-prospection (P1): no next_action
    const hasNextAction = !!client.next_action_at || !!client.next_action;
    if (!hasNextAction && last && within(last, 'hour', 2)) {
      raw.push({
        lead_id: client.id,
        priority: 'P1',
        category: 'post_prospection',
        title: `Prospection enregistrée – ${company}`,
        body: 'Planifier un suivi ?',
        action: 'Planifier un suivi',
      });
    }

    // Hot lead (P0): high score
    if ((client.lead_score ?? 0) >= 75) {
      raw.push({
        lead_id: client.id,
        priority: 'P0',
        category: 'hot_lead',
        title: `🔥 Lead chaud – ${company}`,
        body: 'Score élevé, agir maintenant',
        action: 'Appeler',
      });
    }

    // Meetings (P0) 24h & 2h reminders
    const meetings = meetingCandidates(client);
    meetings.forEach((m) => {
      if (hasUpcoming(m.date, 2)) {
        raw.push({
          lead_id: client.id,
          priority: 'P0',
          category: 'meeting_2h',
          title: `RDV 2h – ${company}`,
          body: `Statut: ${status || 'NA'}${m.summary ? ` • ${m.summary}` : ''}`,
          action: buildAction('Ouvrir le lead', 'Appeler'),
        });
      } else if (hasUpcoming(m.date, 24)) {
        raw.push({
          lead_id: client.id,
          priority: 'P0',
          category: 'meeting_24h',
          title: `RDV demain – ${company}`,
          body: `Prépare objectif${m.summary ? ` • ${m.summary}` : ''}`,
          action: 'Ouvrir le lead',
        });
      }
    });
  }

  // Dedup by lead_id + category
  const deduped = [];
  const seen = new Set();
  for (const n of raw) {
    const key = `${n.lead_id}:${n.category}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(n);
  }

  // Sort by priority
  deduped.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Cap per day
  let limited = deduped.slice(0, MAX_PER_DAY);

  // If no P0/P1 and allowCopilot, add 1 P2 suggestion
  const hasP0P1 = limited.some((n) => n.priority === 'P0' || n.priority === 'P1');
  if (!hasP0P1 && allowCopilot) {
    limited.push({
      lead_id: null,
      priority: 'P2',
      category: 'copilot',
      title: 'Suggestion: WhatsApp',
      body: 'Meilleur créneau 11h–13h',
      action: 'Programmer',
    });
  }

  // Quiet hours: still return but mark as in_app_only unless meeting <2h
  const final = limited.map((n) => {
    const isMeetingSoon = n.category === 'meeting_2h';
    return {
      ...n,
      delivery: quiet && !isMeetingSoon ? 'in_app_only' : 'push_allowed',
    };
  });

  return final;
}
