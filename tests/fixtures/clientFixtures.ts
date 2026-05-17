export const VALID_CLIENT_PAYLOAD = {
  last_name: 'Jean Dupont',
  status: 'prospect' as const,
};

export const MINIMAL_CLIENT = {
  last_name: 'Minimal Client',
  status: 'prospect' as const,
};

export const VOICE_PARSE_RESULT = {
  name: 'Le Comptoir',
  status: 'prospect',
  statut_opportunite: 'chaud',
  phone: '+33612345678',
  email: 'contact@comptoir.fr',
  postal_code: '75011',
  canal_acquisition: 'terrain',
  notes: 'Prospection vocale',
};

export const PHANTOM_PAYLOAD = {
  last_name: 'Ghost Test',
  status: 'prospect',
  city: 'Paris',
  ville: 'Lyon',
  unknown_field: 'value',
};

export const TRANSCRIPT_SAMPLE = "Restaurant Chez Paul, Lyon 3ème, intéressé, rappeler vendredi";

export const EXISTING_CLIENTS = [
  { id: '1', last_name: 'Chez Paul', phone: '0612345678', company: 'Chez Paul', contact: 'paul@test.fr' },
  { id: '2', last_name: 'Brasserie Lyon', phone: '0698765432', company: 'Brasserie Lyon', contact: 'contact@brasserie.fr' },
];
