import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { AlgorithmSetup, Crisis, InformationCard, RoleDefinition } from '@shadowban/shared';

export interface ContentCatalog {
  crises: Crisis[];
  informationCards: InformationCard[];
  roles: RoleDefinition[];
  algorithms: AlgorithmSetup[];
}

let cachedCatalog: ContentCatalog | null = null;

function getRepositoryRoot(): string {
  const candidates = [process.cwd(), path.resolve(process.cwd(), '..', '..')];

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'packages/game-data'))) {
      return candidate;
    }
  }

  return process.cwd();
}

function readJsonFiles<T>(relativeDir: string): T[] {
  const absoluteDir = path.join(getRepositoryRoot(), 'packages/game-data', relativeDir);

  return readdirSync(absoluteDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => {
      const raw = readFileSync(path.join(absoluteDir, entry.name), 'utf8');
      return JSON.parse(raw) as T;
    });
}

export function getContentCatalog(): ContentCatalog {
  if (cachedCatalog) {
    return cachedCatalog;
  }

  cachedCatalog = {
    crises: readJsonFiles<Crisis>('crises'),
    informationCards: readJsonFiles<InformationCard[]>('evidence').flat(),
    roles: readJsonFiles<RoleDefinition>('roles'),
    algorithms: readJsonFiles<AlgorithmSetup>('algorithms')
  };

  return cachedCatalog;
}

export function getCrisisById(crisisId: string): Crisis {
  const crisis = getContentCatalog().crises.find((entry) => entry.id === crisisId);

  if (!crisis) {
    throw new Error(`Unknown crisis: ${crisisId}`);
  }

  return crisis;
}

export function getCrisisForRound(roundNumber: number): Crisis {
  const crises = getContentCatalog().crises;

  if (crises.length === 0) {
    throw new Error('No crises available.');
  }

  // Random crisis selection
  const randomIndex = Math.floor(Math.random() * crises.length);
  const crisis = crises[randomIndex];

  if (!crisis) {
    throw new Error('No crisis available for the requested round.');
  }

  return crisis;
}

export function getRandomCrisis(): Crisis {
  const crises = getContentCatalog().crises;

  if (crises.length === 0) {
    throw new Error('No crises available.');
  }

  const randomIndex = Math.floor(Math.random() * crises.length);
  const crisis = crises[randomIndex];

  if (!crisis) {
    throw new Error('No crisis available.');
  }

  return crisis;
}

export function getAllRoles(): RoleDefinition[] {
  return getContentCatalog().roles;
}

export function getRandomRole(): RoleDefinition {
  const roles = getAllRoles();

  if (roles.length === 0) {
    throw new Error('No roles available.');
  }

  const randomIndex = Math.floor(Math.random() * roles.length);
  const role = roles[randomIndex];

  if (!role) {
    throw new Error('No role available.');
  }

  return role;
}

export function getAlgorithmById(algorithmId?: string): AlgorithmSetup {
  const algorithms = getContentCatalog().algorithms;

  if (!algorithmId) {
    const fallback = algorithms[0];

    if (!fallback) {
      throw new Error('No algorithm setups available.');
    }

    return fallback;
  }

  const algorithm = algorithms.find((entry) => entry.id === algorithmId);

  if (!algorithm) {
    throw new Error(`Unknown algorithm setup: ${algorithmId}`);
  }

  return algorithm;
}

export function getRoleById(roleId: string): RoleDefinition {
  const role = getContentCatalog().roles.find((entry) => entry.id === roleId);

  if (!role) {
    throw new Error(`Unknown role: ${roleId}`);
  }

  return role;
}

export function getEvidenceForCrisis(crisisId: string): InformationCard[] {
  return getContentCatalog().informationCards.filter((entry) => entry.crisisId === crisisId);
}