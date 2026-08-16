# Role Abilities Specifications

This document outlines the complete specifications for all role abilities in Shadowban 2026.

## Overview

Each role has a unique ability that can be used once per round (unless otherwise specified). Abilities have timing restrictions based on game phases and produce various effects visible to all players or specific targets.

## Role Ability Specifications

### 1. Government Official (Society)

**Ability Name:** Card Spy  
**Timing:** After info cards are dealt and during DISCUSSION phase  
**Usage:** Once per round  
**Mechanics:**
- Select a target player
- View one of their information cards (selected via card index)
- Card is revealed to the Government Official only
- Uses a minigame UI with card fan animation

**Server Implementation:**
- Action: `spy_card`
- Payload: `{ targetId: string, cardIndex: number }`
- Returns: Card data from target's hand
- Mark ability as used after successful spy

**Client UI:**
- Card fan display with card backs
- Click to flip and reveal selected card
- Show card title, text, and image

---

### 2. Journalist (Society)

**Ability Name:** Question  
**Timing:** Before DISCUSSION (primed announcement) or during DISCUSSION (instant)  
**Usage:** Once per round  
**Mechanics:**
- Select a target player and a response
- Ask the player about evidence supporting that response
- Before DISCUSSION: Creates a primed announcement (chat + 3s UI overlay)
- During DISCUSSION: Instant chat announcement to all players

**Server Implementation:**
- Action: `ask_question`
- Payload: `{ targetId: string, responseId: string }`
- Broadcasts announcement to all players via `publicAnnouncements`
- Announcement type: `'journalist'`
- Message format: "{RoleName} asked {PlayerName} about their evidence."

**Client UI:**
- Target player selector
- Response selector
- Primed announcement overlay component (3s display)
- Chat message with announcement

---

### 3. Analyst (Society)

**Ability Name:** Vote Lock  
**Timing:** Before VOTING phase  
**Usage:** Once per round  
**Mechanics:**
- Select a response to lock vote onto
- Vote is automatically submitted for that response during VOTING
- After voting reveal: grants immunity OR shadowbans a card
  - If locked vote matches correct response: immunity from shadowban
  - If locked vote matches incorrect response: shadowban cards with matching tags

**Server Implementation:**
- Action: `lock_vote`
- Payload: `{ responseId: string }`
- Stores locked vote in `playerState.lockedVote`
- During voting resolution, apply immunity/shadowban effect based on result

**Client UI:**
- Response selector
- Display locked vote status
- Show immunity/shadowban result after reveal

---

### 4. Investigator (Society)

**Ability Name:** Crosscheck  
**Timing:** Any phase  
**Usage:** Once per round  
**Mechanics:**
- Select two players to investigate
- Reveals whether they are on the same side (both Society or both Algorithm)
- Result shown only to Investigator

**Server Implementation:**
- Action: `crosscheck`
- Payload: `{ targetIds: string[] }` (array of 2 player IDs)
- Compares faction of both players' roles
- Returns: `'SAME SIDE'` or `'DIFFERENT SIDES'`
- Result sent only to Investigator

**Client UI:**
- Two-player selector
- Display crosscheck result
- Visual indication of same/different sides

---

### 5. Hacker (Algorithm)

**Ability Name:** Account Breach  
**Timing:** Any phase  
**Usage:** Once per round  
**Mechanics:**
- Select a target player
- Reveals their role
- Uses breach animation UI
- Result shown only to Hacker

**Server Implementation:**
- Action: `breach`
- Payload: `{ targetId: string }`
- Returns target player's role name
- Result sent only to Hacker

**Client UI:**
- Target player selector
- Breach animation (progress bar)
- Display revealed role with role card image

---

### 6. Algorithm (Algorithm)

**Ability Name:** Algorithm Selection  
**Timing:** EVIDENCE_PREPARATION phase (at crisis reveal)  
**Usage:** Once per round  
**Mechanics:**
- Select one of five algorithm cards
- Each algorithm has different card distribution (boosts certain responses, filters others)
- Selected algorithm shadowbans cards with matching tags
- Shadowbanned cards show red X overlay and cannot be presented

**Server Implementation:**
- Action: `select_algorithm`
- Payload: `{ algorithmId: string }`
- Stores in `gameState.selectedAlgorithm`
- Broadcasts to all players
- Applies shadowban to cards with matching tags

**Client UI:**
- Algorithm card selector (5 cards)
- Display algorithm name, description, boost/filter effects
- Show selected algorithm to all players

---

### 7. Echo Chamber (Algorithm)

**Ability Name:** Closed Circuit  
**Timing:** After info cards dealt or during DISCUSSION  
**Usage:** Once per round  
**Mechanics:**
- Select two players to allow speaking
- All other players are muted for 30 seconds
- Chat input disabled for non-selected players
- Timer displayed showing remaining mute time
- Announcement broadcast to all players

**Server Implementation:**
- Action: `closed_circuit`
- Payload: `{ targetIds: string[] }` (array of 2 player IDs)
- Sets `gameState.echoChamberActive = true`
- Sets `gameState.echoChamberAllowedPlayers = targetIds`
- Sets `gameState.echoChamberEndsAt = Date.now() + 30000`
- Broadcasts announcement to all players
- Announcement type: `'echo_chamber'`
- Message format: "CLOSED CIRCUIT: Only {Player1} and {Player2} may speak for 30 seconds."

**Client UI:**
- Two-player selector
- Circular timer component (30s countdown)
- Chat input disabled for muted players
- Announcement overlay

---

### 8. Influencer (Algorithm)

**Ability Name:** Mute  
**Timing:** When shadowbanned  
**Usage:** Once per round (only when shadowbanned)  
**Mechanics:**
- Select a player to mute
- Muted player cannot use chat next round
- Mute is client-side (disables chat input)
- Effect lasts for one round

**Server Implementation:**
- Action: `mute`
- Payload: `{ targetId: string }`
- Stores in `gameState.influencerMutedPlayerId`
- During next round setup, apply mute to target player
- Result sent to Influencer only

**Client UI:**
- Target player selector
- Display muted player name
- Show mute status in next round

---

## Game Phase Flow

The game phases in order:
1. **LOBBY** - Players join and ready up
2. **CRISIS_REVEAL** - Crisis card shown to all
3. **EVIDENCE_PREPARATION** - Algorithm selects algorithm card
4. **DEAL_INFORMATION** - Players receive info cards
5. **DISCUSSION** - Players discuss, present evidence, use abilities
6. **VOTING** - Players vote on responses
7. **RESOLUTION** - Results revealed, scores updated
8. **SHADOWBAN** - Players vote to shadowban someone
9. **GAME_END** - Winner declared

## Server-Side State Management

### GameState Additions
```typescript
interface GameState {
  // ... existing fields
  selectedAlgorithm?: string;           // Algorithm role selection
  echoChamberActive?: boolean;           // Echo Chamber mute active
  echoChamberAllowedPlayers?: string[];  // Players allowed to speak
  echoChamberEndsAt?: number;           // When mute ends
  influencerMutedPlayerId?: string;     // Player muted by Influencer
}
```

### PlayerGameState Additions
```typescript
interface PlayerGameState {
  // ... existing fields
  lockedVote?: string;  // Analyst's locked vote
}
```

### PublicAnnouncement Types
```typescript
type AnnouncementType = 'journalist_claim' | 'ability_used' | 'system' | 'journalist' | 'echo_chamber';
```

## Socket Events

### Client to Server
- `role:action` - Generic ability action handler
  - Payload: `{ action: string, targetId?: string, targetIds?: string[], cardIndex?: number, responseId?: string, algorithmId?: string }`

### Server to Client
- `ability:result` - Ability execution result
  - Payload: `{ playerId: string, roleId: string, abilityName: string, result: string, details?: any }`
- `chat:message` - Chat messages (including card embeds)
  - Payload: `{ playerId: string, playerName: string, playerAvatar?: string, message: string, timestamp: number, cardId?: string, cardImage?: string }`

## Role Assignment Balance

- Algorithm roles: ~1/3 of players (minimum 1)
- Society roles: ~2/3 of players
- Society always outnumbers Algorithm
- Roles are randomly assigned within each faction pool

## Implementation Status

### Completed
- ✅ Server-side `role:action` handler
- ✅ All ability action handlers
- ✅ Type definitions for new state fields
- ✅ Role assignment balance
- ✅ Info card chat embeds
- ✅ Ability used state tracking
- ✅ Algorithm timing moved to EVIDENCE_PREPARATION

### Remaining Client-Side Work
- ⏳ Echo Chamber timer display and chat mute enforcement
- ⏳ Influencer mute enforcement in next round
- ⏳ Algorithm shadowban overlay on cards
- ⏳ Analyst immunity/shadowban result display
- ⏳ Government Official card spy minigame
- ⏳ Journalist primed announcement overlay
- ⏳ Investigator crosscheck result display
- ⏳ Hacker breach animation
- ⏳ Ability result display in UI

### Remaining Server-Side Work
- ⏳ Echo Chamber timer expiration handling
- ⏳ Influencer mute application in round setup
- ⏳ Algorithm shadowban tag matching
- ⏳ Analyst immunity/shadowban application after voting
- ⏳ Ability usage reset between rounds
- ⏳ Echo Chamber state reset between rounds

## Testing Checklist

- [ ] Each ability can be activated at correct timing
- [ ] Each ability cannot be activated at incorrect timing
- [ ] Ability button shows "USED" after activation
- [ ] Ability button resets between rounds
- [ ] Government Official can spy on target's card
- [ ] Journalist announcements appear in chat and overlay
- [ ] Analyst vote lock works and applies immunity/shadowban
- [ ] Investigator crosscheck shows correct side info
- [ ] Hacker breach reveals correct role
- [ ] Algorithm selection shadowbans correct cards
- [ ] Echo Chamber mutes non-selected players for 30s
- [ ] Influencer mute disables chat next round
- [ ] Role assignment is balanced (Society > Algorithm)
- [ ] Info cards appear as embeds in chat when presented
- [ ] All announcements broadcast to all players
- [ ] Private results only sent to ability user
