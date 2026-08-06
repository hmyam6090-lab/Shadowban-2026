import { z } from 'zod';

import { Faction, GamePhase, InformationType } from '../types';

export const responseSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional()
});

export const crisisSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  responses: z.tuple([responseSchema, responseSchema, responseSchema]),
  correctResponseId: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)),
  noiseIds: z.array(z.string().min(1))
});

export const informationCardSchema = z
  .object({
    id: z.string().min(1),
    crisisId: z.string().min(1),
    type: z.nativeEnum(InformationType),
    title: z.string().min(1),
    text: z.string().min(1),
    supportsResponseId: z.string().min(1).optional()
  })
  .superRefine((card, ctx) => {
    if (card.type === InformationType.NOISE && card.supportsResponseId !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Noise cards must not include supportsResponseId'
      });
    }

    if (card.type === InformationType.EVIDENCE && card.supportsResponseId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Evidence cards must include supportsResponseId'
      });
    }
  });

export const algorithmSetupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  distribution: z.object({
    response1: z.number().int().nonnegative(),
    response2: z.number().int().nonnegative(),
    response3: z.number().int().nonnegative(),
    noise: z.number().int().nonnegative()
  })
});

export const roleDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  faction: z.nativeEnum(Faction),
  description: z.string().min(1)
});

export const playerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  socketId: z.string().min(1),
  isHost: z.boolean(),
  connected: z.boolean(),
  ready: z.boolean()
});

export const playerGameStateSchema = z.object({
  playerId: z.string().min(1),
  roleId: z.string().min(1),
  hand: z.array(z.string().min(1)),
  presentedCardId: z.string().min(1).optional(),
  abilityUsed: z.boolean(),
  vote: z.string().min(1).optional(),
  privateInspectionResults: z.array(z.string().min(1))
});

export const gamePhaseSchema = z.nativeEnum(GamePhase);