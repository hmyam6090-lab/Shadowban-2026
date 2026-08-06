import { useEffect, useState } from 'react';

import { GamePhase } from '@shadowban/shared';

import { CrisisCard } from '../components/game/CrisisCard.js';
import { GameHeader } from '../components/game/GameHeader.js';
import { InformationCard } from '../components/game/InformationCard.js';
import { PhaseIndicator } from '../components/game/PhaseIndicator.js';
import { PlayerList } from '../components/game/PlayerList.js';
import { ResponseCard } from '../components/game/ResponseCard.js';
import { ScoreBoard } from '../components/game/ScoreBoard.js';
import { Timer } from '../components/game/Timer.js';
import { socket } from '../socket/socket.js';
import { useAppStore } from '../stores/appStore.js';

const phaseCopy: Record<GamePhase, { title: string; subtitle: string }> = {
  LOBBY: {
    title: 'Lobby',
    subtitle: 'Waiting for the host to start the game.'
  },
  CRISIS_REVEAL: {
    title: 'Crisis Reveal',
    subtitle: 'Read the crisis and prepare the table.'
  },
  EVIDENCE_PREPARATION: {
    title: 'Evidence Preparation',
    subtitle: 'The table is being prepared.'
  },
  DEAL_INFORMATION: {
    title: 'Deal Information',
    subtitle: 'Private cards are being dealt.'
  },
  ROLE_ABILITY: {
    title: 'Role Ability',
    subtitle: 'Hidden abilities can be used now.'
  },
  DISCUSSION: {
    title: 'Discussion',
    subtitle: 'Put the phones down and talk it through.'
  },
  VOTING: {
    title: 'Voting',
    subtitle: 'Vote privately for the best response.'
  },
  RESOLUTION: {
    title: 'Resolution',
    subtitle: 'The round result is being revealed.'
  },
  GAME_END: { title: 'Game End', subtitle: 'The final score is locked.' }
};

export function GameFlowPage() {
  const session = useAppStore((state) => state.session);
  const publicState = useAppStore((state) => state.publicState);
  const privateState = useAppStore((state) => state.privateState);
  const currentCrisis = useAppStore((state) => state.currentCrisis);
  const hasVoted = useAppStore((state) => state.hasVoted);
  const votingResults = useAppStore((state) => state.votingResults);
  const selectedResponseId = useAppStore((state) => state.selectedResponseId);
  const presentedEvidence = useAppStore((state) => state.presentedEvidence);
  const roundAudit = useAppStore((state) => state.roundAudit);
  const clearRoundData = useAppStore((state) => state.clearRoundData);

  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [selectedTargetPlayer, setSelectedTargetPlayer] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    socket.emit('game:join', {
      gameCode: session.gameCode,
      playerId: session.playerId
    });
  }, [session]);

  useEffect(() => {
    // Clear round data when entering a new round
    if (publicState?.phase === GamePhase.CRISIS_REVEAL) {
      clearRoundData();
    }
  }, [publicState?.phase, clearRoundData]);

  const handleVote = (responseId: string) => {
    setSelectedVote(responseId);
    socket.emit('vote:submit', { responseId });
  };

  const handlePresentEvidence = (cardId: string) => {
    socket.emit('evidence:present', { cardId });
  };

  const handleActivateRole = (targetPlayerId?: string) => {
    socket.emit('role:activate', { targetPlayerId });
  };

  if (!publicState) {
    return (
      <section className="card">
        <p className="eyebrow">Game</p>
        <h2>Loading game state...</h2>
      </section>
    );
  }

  const phase = publicState.phase;
  const copy = phaseCopy[phase];
  const crisis = currentCrisis;
  const isHost = session?.playerId === publicState.hostPlayerId;

  return (
    <section className="game-layout">
      <GameHeader
        gameCode={publicState.gameCode}
        round={publicState.currentRound}
        totalRounds={publicState.totalRounds}
        phase={phase}
      />
      <div className="game-topline">
        <PhaseIndicator phase={phase} />
        <Timer endsAt={publicState.phaseEndsAt} />
      </div>

      <div className="game-grid">
        <div className="game-main card">
          <div className="game-main-header">
            <p className="eyebrow">{copy.title}</p>
            <h2>{copy.subtitle}</h2>
          </div>

          {phase === 'CRISIS_REVEAL' && crisis ? (
            <CrisisCard crisis={crisis} />
          ) : null}

          {phase === 'EVIDENCE_PREPARATION' ? (
            <p className="soft-copy">
              The Algorithm is preparing hidden evidence for the round.
            </p>
          ) : null}

          {phase === 'DEAL_INFORMATION' ? (
            <div className="card-stack">
              {privateState?.hand?.map((card) => (
                <InformationCard key={card.id} card={card} accent="private" />
              ))}
            </div>
          ) : null}

          {phase === 'ROLE_ABILITY' ? (
            <div className="role-panel">
              <h3>{privateState?.role.name ?? 'Unassigned Role'}</h3>
              <p>
                {privateState?.role.description ?? 'Awaiting role assignment.'}
              </p>

              {privateState?.role.id === 'government_official' &&
              !privateState.abilityUsed ? (
                <div className="role-ability">
                  <h4>Government Official Ability</h4>
                  <p className="soft-copy">
                    Inspect another player's information card.
                  </p>
                  <div className="player-select">
                    <label htmlFor="target-player">
                      Select a player to inspect:
                    </label>
                    <select
                      id="target-player"
                      onChange={(e) => setSelectedTargetPlayer(e.target.value)}
                      value={selectedTargetPlayer || ''}
                    >
                      <option value="">-- Select a player --</option>
                      {publicState.players
                        .filter((p) => p.id !== session?.playerId)
                        .map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        selectedTargetPlayer &&
                        handleActivateRole(selectedTargetPlayer)
                      }
                      disabled={!selectedTargetPlayer}
                    >
                      Use Ability
                    </button>
                  </div>
                </div>
              ) : null}

              {privateState?.abilityUsed ? (
                <p className="soft-copy">Ability already used this round.</p>
              ) : null}

              {privateState?.privateInspectionResults &&
              privateState.privateInspectionResults.length > 0 ? (
                <div className="inspection-results">
                  <h4>Inspection Results</h4>
                  {privateState.privateInspectionResults.map(
                    (cardId, index) => (
                      <div key={cardId} className="inspection-card">
                        <p className="soft-copy">
                          Card {index + 1}: {cardId}
                        </p>
                      </div>
                    )
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {phase === 'DISCUSSION' ? (
            <div className="discussion-panel">
              <p className="soft-copy">
                Public evidence is visible to everyone. Encourage players to put
                their phones down.
              </p>
              {currentCrisis ? <CrisisCard crisis={currentCrisis} /> : null}

              {privateState?.hand && privateState.hand.length > 0 && (
                <div className="card-stack">
                  <h4>Your Private Cards</h4>
                  <p className="soft-copy">
                    Present evidence to share with the group.
                  </p>
                  {privateState.hand.map((card) => (
                    <div key={card.id} className="card-with-action">
                      <InformationCard card={card} accent="private" />
                      <button
                        type="button"
                        onClick={() => handlePresentEvidence(card.id)}
                        disabled={privateState.presentedCardId === card.id}
                      >
                        {privateState.presentedCardId === card.id
                          ? 'Presented'
                          : 'Present'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {presentedEvidence.length > 0 && (
                <div className="presented-evidence">
                  <h4>Presented Evidence</h4>
                  {presentedEvidence.map((evidence, index) => (
                    <div
                      key={`${evidence.playerId}-${index}`}
                      className="presented-card"
                    >
                      <p className="eyebrow">
                        {publicState.players.find(
                          (p) => p.id === evidence.playerId
                        )?.name || 'Unknown'}
                      </p>
                      <InformationCard card={evidence.card} accent="public" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {phase === 'VOTING' ? (
            <div className="vote-panel">
              <h3>Vote privately for the best response.</h3>
              {hasVoted ? (
                <p className="soft-copy">Your vote has been submitted.</p>
              ) : (
                <p className="soft-copy">Select a response to vote.</p>
              )}
              {crisis?.responses.map((response) => (
                <ResponseCard
                  key={response.id}
                  response={response}
                  selected={selectedVote === response.id}
                  onClick={() => !hasVoted && handleVote(response.id)}
                  disabled={hasVoted}
                />
              ))}
            </div>
          ) : null}

          {phase === 'RESOLUTION' ? (
            <div className="resolution-panel">
              <h3>Round resolved</h3>
              <ScoreBoard
                societyScore={publicState.societyScore}
                algorithmScore={publicState.algorithmScore}
              />

              {votingResults && votingResults.length > 0 && (
                <div className="voting-results">
                  <h4>Voting Results</h4>
                  {votingResults.map((result) => {
                    const response = currentCrisis?.responses.find(
                      (r) => r.id === result.responseId
                    );
                    return (
                      <div key={result.responseId} className="vote-result">
                        <span>{response?.label || result.responseId}:</span>
                        <span className="vote-count">{result.votes} votes</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {roundAudit && (
                <div className="information-audit">
                  <h4>Information Audit</h4>
                  <p className="soft-copy">
                    What information was available vs. what you saw:
                  </p>

                  {roundAudit.playerFeedSummary &&
                    roundAudit.playerFeedSummary.length > 0 && (
                      <div className="player-feeds">
                        <h5>Player Information Feeds</h5>
                        {roundAudit.playerFeedSummary.map((summary) => (
                          <div key={summary.playerId} className="player-feed">
                            <p className="eyebrow">{summary.playerName}</p>
                            <p>Cards seen: {summary.cardsSeen}</p>
                            <p>
                              Supporting correct response:{' '}
                              {summary.supportingCorrect}
                            </p>
                            <p>
                              Supporting incorrect responses:{' '}
                              {summary.supportingIncorrect}
                            </p>
                            <p>Noise cards: {summary.noiseSeen}</p>
                          </div>
                        ))}
                      </div>
                    )}

                  {roundAudit.availableEvidence &&
                    roundAudit.availableEvidence.length > 0 && (
                      <div className="available-evidence">
                        <h5>All Available Evidence</h5>
                        <div className="card-stack">
                          {roundAudit.availableEvidence.map((card) => (
                            <InformationCard
                              key={card.id}
                              card={card}
                              accent="public"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          ) : null}

          {phase === 'GAME_END' ? (
            <div className="resolution-panel">
              <h3>Game complete</h3>
              <ScoreBoard
                societyScore={publicState.societyScore}
                algorithmScore={publicState.algorithmScore}
              />
            </div>
          ) : null}

          {isHost && phase !== 'GAME_END' ? (
            <button type="button" onClick={() => socket.emit('host:advance')}>
              Advance Phase
            </button>
          ) : null}
        </div>

        <aside className="game-side stack">
          <ScoreBoard
            societyScore={publicState.societyScore}
            algorithmScore={publicState.algorithmScore}
          />
          <article className="card">
            <h3>Players</h3>
            <PlayerList
              players={publicState.players}
              hostPlayerId={publicState.hostPlayerId}
            />
          </article>
          {crisis ? (
            <article className="card">
              <h3>Responses</h3>
              <div className="response-list">
                {crisis.responses.map((response) => (
                  <ResponseCard
                    key={response.id}
                    response={response}
                    selected={false}
                  />
                ))}
              </div>
            </article>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
