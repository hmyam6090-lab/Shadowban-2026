import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
let cachedCatalog = null;
function getRepositoryRoot() {
    const candidates = [process.cwd(), path.resolve(process.cwd(), '..', '..')];
    for (const candidate of candidates) {
        if (existsSync(path.join(candidate, 'packages/game-data'))) {
            return candidate;
        }
    }
    return process.cwd();
}
function readJsonFiles(relativeDir) {
    const absoluteDir = path.join(getRepositoryRoot(), 'packages/game-data', relativeDir);
    return readdirSync(absoluteDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => {
        const raw = readFileSync(path.join(absoluteDir, entry.name), 'utf8');
        return JSON.parse(raw);
    });
}
export function getContentCatalog() {
    if (cachedCatalog) {
        return cachedCatalog;
    }
    cachedCatalog = {
        crises: readJsonFiles('crises'),
        informationCards: readJsonFiles('evidence').flat(),
        roles: readJsonFiles('roles'),
        algorithms: readJsonFiles('algorithms')
    };
    return cachedCatalog;
}
export function getCrisisById(crisisId) {
    const crisis = getContentCatalog().crises.find((entry) => entry.id === crisisId);
    if (!crisis) {
        throw new Error(`Unknown crisis: ${crisisId}`);
    }
    return crisis;
}
export function getCrisisForRound(roundNumber) {
    const crises = getContentCatalog().crises;
    if (crises.length === 0) {
        throw new Error('No crises available.');
    }
    const crisisIndex = (roundNumber - 1) % crises.length;
    const crisis = crises[crisisIndex];
    if (!crisis) {
        throw new Error('No crisis available for the requested round.');
    }
    return crisis;
}
export function getAlgorithmById(algorithmId) {
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
export function getRoleById(roleId) {
    const role = getContentCatalog().roles.find((entry) => entry.id === roleId);
    if (!role) {
        throw new Error(`Unknown role: ${roleId}`);
    }
    return role;
}
export function getEvidenceForCrisis(crisisId) {
    return getContentCatalog().informationCards.filter((entry) => entry.crisisId === crisisId);
}
