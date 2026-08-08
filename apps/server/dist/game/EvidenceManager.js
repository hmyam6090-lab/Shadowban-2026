export class EvidenceManager {
    buildDeck(_crisis, _algorithm) {
        throw new Error('EvidenceManager is not implemented in Phase 1/2.');
    }
    shuffleDeck(cards) {
        return [...cards].sort(() => Math.random() - 0.5);
    }
    deal(_deck, _players) {
        throw new Error('EvidenceManager is not implemented in Phase 1/2.');
    }
    validateCardOwnership(_playerId, _cardId) {
        throw new Error('EvidenceManager is not implemented in Phase 1/2.');
    }
}
