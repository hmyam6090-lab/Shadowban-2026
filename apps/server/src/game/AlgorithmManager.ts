import type { AlgorithmSetup, Crisis, InformationCard } from '@shadowban/shared';

export class AlgorithmManager {
  selectCards(_crisis: Crisis, _algorithm: AlgorithmSetup): InformationCard[] {
    throw new Error('AlgorithmManager is not implemented in Phase 1/2.');
  }
}