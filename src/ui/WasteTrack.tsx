import { wasteTriggersJunkPile } from '../game/actions';
import './WasteTrack.css';

interface WasteTrackProps {
  wasteCount: number;
  pendingJunkPiles: number;
}

const TRACK_SIZE = 12;
const ROW_SIZES = [3, 4, 5];

export function WasteTrack({ wasteCount, pendingJunkPiles }: WasteTrackProps) {
  const rows: number[][] = [];
  let pos = 1;
  for (const size of ROW_SIZES) {
    rows.push(Array.from({ length: size }, () => pos++));
  }

  return (
    <div className="waste-track">
      <h2>Waste</h2>
      <div className="waste-rows">
        {rows.map((row, ri) => (
          <div key={ri} className="waste-row">
            {row.map((pos) => {
              const filled = wasteCount >= pos;
              const hasJunkMarker = wasteTriggersJunkPile(pos) && pos <= 12;
              return (
                <div
                  key={pos}
                  className={`waste-cell ${filled ? 'filled' : ''} ${hasJunkMarker ? 'junk-marker' : ''}`}
                  title={`Waste ${pos}${hasJunkMarker ? ' (Junk Pile!)' : ''}`}
                >
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    {/* Trash can icon */}
                    <rect x="5" y="8" width="14" height="13" rx="1.5"
                      fill={filled ? '#8a7a58' : 'none'}
                      stroke={filled ? '#5a4a30' : '#666'}
                      strokeWidth="1.5"
                    />
                    <rect x="4" y="5" width="16" height="3" rx="1"
                      fill={filled ? '#8a7a58' : 'none'}
                      stroke={filled ? '#5a4a30' : '#666'}
                      strokeWidth="1.5"
                    />
                    <rect x="9" y="3" width="6" height="3" rx="1"
                      fill={filled ? '#8a7a58' : 'none'}
                      stroke={filled ? '#5a4a30' : '#666'}
                      strokeWidth="1.2"
                    />
                  </svg>
                  {hasJunkMarker && (
                    <span className="junk-badge">J</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {wasteCount > TRACK_SIZE && (
        <div className="waste-overflow">+{wasteCount - TRACK_SIZE} extra</div>
      )}
      {pendingJunkPiles > 0 && (
        <div className="waste-pending">
          {pendingJunkPiles} junk pile{pendingJunkPiles !== 1 ? 's' : ''} to place
        </div>
      )}
    </div>
  );
}
