import { useState } from 'react';

export interface FloatingAbilitiesPanelProps {
  roleName?: string;
  abilityName?: string;
  abilityDescription?: string;
  canUseAbility?: boolean;
  onUseAbility?: () => void;
  disabled?: boolean;
}

export function FloatingAbilitiesPanel({
  roleName,
  abilityName,
  abilityDescription,
  canUseAbility = true,
  onUseAbility,
  disabled = false
}: FloatingAbilitiesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`floating-abilities-panel ${isExpanded ? 'expanded' : ''}`}>
      <button
        type="button"
        className="abilities-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        title={isExpanded ? 'Hide Abilities' : 'Show Abilities'}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
          <path d="M2 17l10 5 10-5"></path>
          <path d="M2 12l10 5 10-5"></path>
        </svg>
      </button>

      {isExpanded && (
        <div className="abilities-content">
          <div className="abilities-header">
            <h4>{roleName || 'No Role'}</h4>
          </div>
          {abilityName && abilityDescription ? (
            <div className="ability-info">
              <p className="ability-name">{abilityName}</p>
              <p className="ability-description">{abilityDescription}</p>
              {onUseAbility && (
                <button
                  type="button"
                  onClick={() => {
                    onUseAbility();
                    setIsExpanded(false);
                  }}
                  disabled={!canUseAbility || disabled}
                  className="ability-btn"
                >
                  Use Ability
                </button>
              )}
            </div>
          ) : (
            <p className="no-ability">No ability available</p>
          )}
        </div>
      )}
    </div>
  );
}
