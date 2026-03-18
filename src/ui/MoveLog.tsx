import { LogEntry } from '../game/types';
import './MoveLog.css';

interface MoveLogProps {
  log: LogEntry[];
}

export function MoveLog({ log }: MoveLogProps) {
  return (
    <div className="move-log">
      <h2>Log</h2>
      <ul className="log-list">
        {log.length === 0 && <li className="log-empty">No actions yet.</li>}
        {[...log].reverse().map((entry, i) => (
          <li key={i} className="log-entry">
            {entry.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
