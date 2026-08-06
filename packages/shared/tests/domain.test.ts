import { describe, expect, it } from 'vitest';

import {
  AlgorithmSetup,
  Crisis,
  Faction,
  GamePhase,
  InformationCard,
  InformationType,
  RoleDefinition,
  crisisSchema,
  informationCardSchema,
  roleDefinitionSchema
} from '../src';

const crisis: Crisis = {
  id: 'flood',
  name: 'Flood',
  description: 'Heavy rainfall has caused severe flooding throughout the region.',
  responses: [
    { id: 'evacuate', label: 'Evacuate' },
    { id: 'investigate', label: 'Investigate' },
    { id: 'no-action', label: 'No Immediate Action' }
  ],
  correctResponseId: 'evacuate',
  evidenceIds: ['flood-hospital', 'flood-river'],
  noiseIds: ['flood-social']
};

const evidenceCard: InformationCard = {
  id: 'flood-hospital',
  crisisId: 'flood',
  type: InformationType.EVIDENCE,
  title: 'Hospital Capacity',
  text: 'Hospital reaches 92% capacity.',
  supportsResponseId: 'evacuate'
};

const noiseCard: InformationCard = {
  id: 'flood-social',
  crisisId: 'flood',
  type: InformationType.NOISE,
  title: 'Social Media',
  text: 'Celebrity tweets about flooding.'
};

const role: RoleDefinition = {
  id: 'researcher',
  name: 'Researcher',
  faction: Faction.SOCIETY,
  description: 'Collects and interprets evidence.'
};

const algorithm: AlgorithmSetup = {
  id: 'fear-sells',
  name: 'Fear Sells',
  description: 'Prefers alarming evidence and spreads noise.',
  distribution: {
    response1: 8,
    response2: 5,
    response3: 3,
    noise: 8
  }
};

describe('shared domain contracts', () => {
  it('keeps crises to exactly three responses', () => {
    expect(crisis.responses).toHaveLength(3);
    expect(crisisSchema.parse(crisis)).toEqual(crisis);
  });

  it('requires evidence cards to carry a supported response and noise cards to omit it', () => {
    expect(informationCardSchema.parse(evidenceCard)).toEqual(evidenceCard);
    expect(informationCardSchema.parse(noiseCard)).toEqual(noiseCard);
  });

  it('keeps role definitions and faction values stable', () => {
    expect(roleDefinitionSchema.parse(role)).toEqual(role);
    expect(role.faction).toBe(Faction.SOCIETY);
  });

  it('exposes game phase values for runtime flow', () => {
    expect(GamePhase.DISCUSSION).toBe('DISCUSSION');
    expect(GamePhase.GAME_END).toBe('GAME_END');
  });

  it('preserves algorithm distributions without mutating the truth', () => {
    expect(algorithm.distribution).toEqual({
      response1: 8,
      response2: 5,
      response3: 3,
      noise: 8
    });
  });
});