import './RulesReference.css';

export function RulesReference() {
  return (
    <div className="rules-reference">
      <h3 className="rules-title">Rules Reference</h3>

      <div className="rules-section">
        <h4 className="rules-section-title">Waste</h4>
        <ul className="rules-list">
          <li>Placing a <strong>Factory</strong> generates 1 waste</li>
          <li>Placing a <strong>2nd road</strong> in the same hex generates 1 waste</li>
          <li>Building a <strong>special building</strong> generates 1 waste (Fast Food generates 2)</li>
          <li>At waste <strong>3, 7, and 12</strong> (and every space after 12), you must place a junk pile on an empty hex. Junk piles score 0.</li>
        </ul>
      </div>

      <div className="rules-section">
        <h4 className="rules-section-title">Scoring (max 12 per building)</h4>
        <ul className="rules-list">
          <li><strong>Park:</strong> 1 point</li>
          <li><strong>Neighborhood:</strong> 1 point per adjacent Park</li>
          <li><strong>Business:</strong> 2 points per Neighborhood connected by road</li>
          <li><strong>Factory:</strong> 4 points per Farm connected by road</li>
          <li><strong>Farm:</strong> 2 points per Business connected by road</li>
        </ul>
      </div>

      <div className="rules-section">
        <h4 className="rules-section-title">Road Bonus</h4>
        <ul className="rules-list">
          <li>At game end, the shortest road route connecting any two highway exits scores 1 point per hex crossed</li>
        </ul>
      </div>
    </div>
  );
}
