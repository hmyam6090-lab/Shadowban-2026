import { nanoid } from 'nanoid';
import type { PublicGameState, PrivatePlayerState } from '@shadowban/shared';

// Import game-data evidence/crises
import droughtEvidence from '../../../../packages/game-data/evidence/drought.json';
import floodEvidence from '../../../../packages/game-data/evidence/flood.json';
import powerOutageEvidence from '../../../../packages/game-data/evidence/power-outage.json';
import missingChildEvidence from '../../../../packages/game-data/evidence/missing-child.json';
import aiDeepfakeEvidence from '../../../../packages/game-data/evidence/ai-deepfake.json';

const CRISIS_EVIDENCE_MAP: Record<string, any[]> = {
  drought: droughtEvidence as any,
  flood: floodEvidence as any,
  'power-outage': powerOutageEvidence as any,
  'missing-child': missingChildEvidence as any,
  'ai-deepfake': aiDeepfakeEvidence as any
};

type Listener = (payload: any) => void;

class LocalGameManager {
  private listeners: Record<string, Listener[]> = {};
  private games: Record<string, any> = {};
  private timers: Record<string, number | undefined> = {};

  on(event: string, fn: Listener) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(fn);
  }

  off(event: string, fn: Listener) {
    this.listeners[event] = (this.listeners[event] || []).filter((f) => f !== fn);
  }

  emit(event: string, payload: any) {
    (this.listeners[event] || []).forEach((fn) => {
      try { fn(payload); } catch (e) { /* swallow */ }
    });
  }

  createGame(hostName: string, options?: { totalRounds?: number; phaseDurations?: Record<string, number> }) {
    const gameId = nanoid();
    const gameCode = Math.random().toString(36).slice(2, 7).toUpperCase();
    const hostId = nanoid();

    const players = [{ id: hostId, name: hostName, isHost: true, connected: true }];

    const game = {
      gameId,
      gameCode,
      players,
      playerStates: {
        [hostId]: {
          roleId: '',
          hand: [],
          presentedCardIds: [],
          abilityUsed: false,
          privateInspectionResults: [],
          shadowbanned: false,
          phaseReady: false
        }
      },
      currentRound: 1,
      totalRounds: options?.totalRounds ?? 6,
      phase: 'LOBBY',
      // per-phase durations in seconds (defaults)
      phaseDurations: Object.assign({
        LOBBY: 30,
        CRISIS_REVEAL: 20,
        EVIDENCE_PREPARATION: 45,
        DEAL_INFORMATION: 40,
        DISCUSSION: 120,
        VOTING: 30,
        RESOLUTION: 15,
        END: 10
      }, options?.phaseDurations || {}),
      currentCrisisId: undefined,
      publicEvidence: [],
      assetCardCounts: undefined
    } as any;

    this.games[gameId] = game;

    // Emit initial public state
    const publicState: PublicGameState = this.buildPublicState(game);
    const privateState: PrivatePlayerState = this.buildPrivateState(game, hostId);

    return { gameId, gameCode, playerId: hostId, publicState, privateState };
  }

  joinGame(gameCode: string, playerName: string) {
    const game = Object.values(this.games).find((g: any) => g.gameCode === gameCode);
    if (!game) throw new Error('Game not found');

    const playerId = nanoid();
    game.players.push({ id: playerId, name: playerName, isHost: false, connected: true });
    game.playerStates[playerId] = {
      roleId: '',
      hand: [],
      presentedCardIds: [],
      abilityUsed: false,
      privateInspectionResults: [],
      shadowbanned: false,
      phaseReady: false
    };

    return { gameId: game.gameId, playerId };
  }

  startGame(gameId: string) {
    const game = this.games[gameId];
    if (!game) throw new Error('Game not found');

    // For local/hybrid GM mode we do NOT assign roles or deal cards.
    // Instead pick a crisis and start the automated phase timer sequence.
    const crises = Object.keys(CRISIS_EVIDENCE_MAP);
    const crisis = crises[(game.currentRound - 1) % crises.length];
    game.currentCrisisId = crisis;

    // Start at first playable phase (skip LOBBY -> immediately reveal crisis)
    game.phase = 'CRISIS_REVEAL';

    this.emit('game:state', this.buildPublicState(game));
    for (const p of game.players) {
      this.emit('player:private-state', this.buildPrivateState(game, p.id));
    }

    // schedule auto-advance for this phase
    this.schedulePhaseTimer(gameId, game.phase);
  }

  advancePhase(gameId: string) {
    const game = this.games[gameId];
    if (!game) throw new Error('Game not found');
    // clear any existing timer
    this.clearPhaseTimer(gameId);

    // simple phase order (looping). Local mode intentionally avoids dealing/role assignment.
    const order = ['CRISIS_REVEAL', 'EVIDENCE_PREPARATION', 'DEAL_INFORMATION', 'DISCUSSION', 'VOTING', 'RESOLUTION', 'END'];
    const idx = order.indexOf(game.phase);
    let next: string;

    if (idx === -1 || idx === order.length - 1) {
      // loop back to first phase and increment round
      next = order[0];
      game.currentRound = (game.currentRound || 1) + 1;
      if (game.currentRound > (game.totalRounds || 1)) {
        // finish game
        game.phase = 'END';
        this.emit('game:state', this.buildPublicState(game));
        for (const p of game.players) {
          this.emit('player:private-state', this.buildPrivateState(game, p.id));
        }
        return;
      }
    } else {
      next = order[idx + 1];
    }

    game.phase = next;

    // For local mode we do not run full dealing — just present a placeholder publicEvidence if desired
    if (next === 'DEAL_INFORMATION') {
      // put one public evidence id so UI has something to show
      const crisis = game.currentCrisisId;
      const allEvidence = CRISIS_EVIDENCE_MAP[crisis] || [];
      game.publicEvidence = allEvidence.length ? [allEvidence[0].id] : [];
    }

    this.emit('game:state', this.buildPublicState(game));
    for (const p of game.players) {
      this.emit('player:private-state', this.buildPrivateState(game, p.id));
    }

    // schedule next auto-advance
    this.schedulePhaseTimer(gameId, game.phase);
  }

  // Adjust scores for a faction ('SOCIETY' | 'ALGORITHM')
  updateScore(gameId: string, faction: 'SOCIETY' | 'ALGORITHM', delta: number) {
    const game = this.games[gameId];
    if (!game) throw new Error('Game not found');
    game.societyScore = game.societyScore || 0;
    game.algorithmScore = game.algorithmScore || 0;
    if (faction === 'SOCIETY') game.societyScore += delta;
    else game.algorithmScore += delta;
    this.emit('game:state', this.buildPublicState(game));
  }

  private schedulePhaseTimer(gameId: string, phase: string) {
    const game = this.games[gameId];
    if (!game) return;
    const durations = game.phaseDurations || {};
    const seconds = durations[phase] ?? 30;
    const endsAt = Date.now() + seconds * 1000;
    game.phaseEndsAt = endsAt;

    const tid = window.setTimeout(() => {
      try { this.advancePhase(gameId); } catch (e) { /* swallow */ }
    }, seconds * 1000);

    this.timers[gameId] = tid;
  }

  private clearPhaseTimer(gameId: string) {
    const tid = this.timers[gameId];
    if (typeof tid === 'number') {
      clearTimeout(tid);
      this.timers[gameId] = undefined;
    }
  }

  private dealInformation(game: any) {
    const crisis = game.currentCrisisId;
    const allEvidence = CRISIS_EVIDENCE_MAP[crisis] || [];

    // simple distribution: 4 cards per player, random
    const cards = [...allEvidence];
    // shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    const perPlayer = 4;
    let idx = 0;
    for (const p of game.players) {
      const hand = [] as string[];
      for (let c = 0; c < perPlayer && idx < cards.length; c++, idx++) {
        hand.push(cards[idx].id);
      }
      game.playerStates[p.id].hand = hand;
    }

    game.publicEvidence = cards.slice(0, 1).map((c: any) => c.id);
    game.assetCardCounts = { withAsset: allEvidence.length, withoutAsset: 0 };
  }

  private buildPublicState(game: any): PublicGameState {
    return {
      gameId: game.gameId,
      gameCode: game.gameCode,
      hostPlayerId: game.players.find((p: any) => p.isHost)?.id,
      players: game.players.map((p: any) => ({ id: p.id, name: p.name, isHost: p.isHost, connected: p.connected, ready: false })),
      currentRound: game.currentRound,
      totalRounds: game.totalRounds,
      phase: game.phase,
      currentCrisisId: game.currentCrisisId,
      societyScore: game.societyScore || 0,
      algorithmScore: game.algorithmScore || 0,
      phaseEndsAt: game.phaseEndsAt,
      publicEvidence: [...(game.publicEvidence || [])],
      societyWins: 0,
      algorithmWins: 0,
      publicAnnouncements: [],
      assetCardCounts: game.assetCardCounts
    } as PublicGameState;
  }

  private buildPrivateState(game: any, playerId: string): PrivatePlayerState {
    const player = game.players.find((p: any) => p.id === playerId);
    const state = game.playerStates[playerId];

    return {
      gameId: game.gameId,
      gameCode: game.gameCode,
      playerId: player.id,
      playerName: player.name,
      role: { id: state.roleId || '', name: '', faction: 'SOCIETY' },
      faction: 'SOCIETY',
      hand: (state.hand || []).map((id: string) => ({ id, crisisId: game.currentCrisisId || 'unknown', type: 'NOISE', title: '', text: '' } as any)),
      abilityUsed: state.abilityUsed,
      privateInspectionResults: [...state.privateInspectionResults],
      presentedCardIds: [...state.presentedCardIds],
      vote: undefined,
      shadowbanned: state.shadowbanned,
      analystPrediction: undefined,
      protectedFromShadowban: false,
      mutedNextRound: false,
      accountBreached: false,
      lockedCardIds: [...(state.lockedCardIds || [])],
      muted: false,
      phaseReady: state.phaseReady
    } as PrivatePlayerState;
  }
}

export const localGameManager = new LocalGameManager();

export default localGameManager;
