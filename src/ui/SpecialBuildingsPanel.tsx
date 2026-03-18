import { GameState, SpecialBuildingCard } from '../game/types';
import { getSpecialBuildingDef, isCardEligible } from '../game/specialBuildings';
import { SpecialBuildingIcon } from './SpecialBuildingIcon';
import './SpecialBuildingsPanel.css';

interface SpecialBuildingsPanelProps {
  state: GameState;
  onSelectCard: (cardIndex: number) => void;
  onCancel: () => void;
}

function formatRequirements(required: string[]): string {
  const counts = new Map<string, number>();
  for (const r of required) {
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => {
      const label = name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return count > 1 ? `${count}× ${label}` : label;
    })
    .join(', ');
}

export function SpecialBuildingsPanel({
  state,
  onSelectCard,
  onCancel,
}: SpecialBuildingsPanelProps) {
  const { specialBuildingCards, phase } = state;
  if (specialBuildingCards.length === 0) return null;

  const isSelectingSpecial = phase === 'selecting_special';
  const isPlacingSpecial = phase === 'placing_special';

  return (
    <div className="special-buildings-panel">
      <h3 className="special-buildings-title">Special Buildings</h3>

      {isPlacingSpecial && (
        <p className="special-hint">Select an empty hex to place the special building.</p>
      )}

      <div className="special-cards">
        {specialBuildingCards.map((card: SpecialBuildingCard, i: number) => {
          const def = getSpecialBuildingDef(card.defId);
          if (!def) return null;

          const eligible = isCardEligible(state, card);
          const selectable = isSelectingSpecial && eligible;

          let cls = 'special-card';
          if (card.built) cls += ' special-card-built';
          else if (eligible) cls += ' special-card-eligible';

          return (
            <div
              key={card.defId}
              className={`${cls} ${selectable ? 'special-card-selectable' : ''}`}
              onClick={selectable ? () => onSelectCard(i) : undefined}
            >
              <div className="special-card-header">
                <svg className="special-card-icon" width="24" height="24" viewBox="-12 -12 24 24">
                  <SpecialBuildingIcon defId={card.defId} cx={0} cy={0} />
                </svg>
                <span className="special-card-name">{def.name}</span>
                {card.built && <span className="special-card-badge">Built</span>}
                {!card.built && eligible && <span className="special-card-badge eligible-badge">Ready</span>}
              </div>
              <div className="special-card-req">
                Requires: {formatRequirements(def.requiredBuildings)}
              </div>
              <div className="special-card-effect">{def.effectDescription}</div>
            </div>
          );
        })}
      </div>

      {(isSelectingSpecial || isPlacingSpecial) && (
        <button className="btn btn-cancel special-cancel" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
}
