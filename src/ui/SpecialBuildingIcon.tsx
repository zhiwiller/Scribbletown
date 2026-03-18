import { getSpecialBuildingDef } from '../game/specialBuildings';

export function SpecialBuildingIcon({ defId, cx, cy }: {
  defId: string; cx: number; cy: number;
}) {
  const def = getSpecialBuildingDef(defId);
  if (!def) return null;

  // Bakery — chef's toque
  if (defId === 'bakery') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <ellipse cx="0" cy="4" rx="8" ry="4" fill="#f5f0e0" stroke="#b08840" strokeWidth="1.2" />
        <rect x="-6" y="-2" width="12" height="6" rx="1" fill="#f5f0e0" stroke="#b08840" strokeWidth="1" />
        <ellipse cx="0" cy="-4" rx="5" ry="6" fill="#fff" stroke="#b08840" strokeWidth="1.2" />
        <circle cx="0" cy="-7" r="1.5" fill="#b08840" />
      </g>
    );
  }

  // Airport — airplane silhouette
  if (defId === 'airport') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <path d="M0,-10 L2,-6 L10,-2 L10,0 L2,-1 L2,4 L5,6 L5,7.5 L0,5.5 L-5,7.5 L-5,6 L-2,4 L-2,-1 L-10,0 L-10,-2 L-2,-6 Z"
          fill="#5588bb" stroke="#334466" strokeWidth="0.8" />
      </g>
    );
  }

  // Playground — swing set
  if (defId === 'playground') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <line x1="-8" y1="8" x2="-3" y2="-8" stroke="#886644" strokeWidth="1.5" />
        <line x1="8" y1="8" x2="3" y2="-8" stroke="#886644" strokeWidth="1.5" />
        <line x1="-3" y1="-8" x2="3" y2="-8" stroke="#886644" strokeWidth="2" />
        <line x1="-1" y1="-8" x2="-3" y2="2" stroke="#666" strokeWidth="0.8" />
        <line x1="1" y1="-8" x2="3" y2="2" stroke="#666" strokeWidth="0.8" />
        <rect x="-4.5" y="2" width="3" height="1.5" rx="0.5" fill="#cc6644" />
        <rect x="1.5" y="2" width="3" height="1.5" rx="0.5" fill="#cc6644" />
      </g>
    );
  }

  // Fire Station — flame
  if (defId === 'fire_station') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <path d="M0,-10 C4,-6 8,-2 8,3 C8,7 4,10 0,10 C-4,10 -8,7 -8,3 C-8,-2 -4,-6 0,-10 Z"
          fill="#dd4422" stroke="#aa2200" strokeWidth="0.8" />
        <path d="M0,-3 C2,-1 4,1 4,4 C4,6 2,8 0,8 C-2,8 -4,6 -4,4 C-4,1 -2,-1 0,-3 Z"
          fill="#ffaa22" stroke="none" />
        <ellipse cx="0" cy="5" rx="2" ry="3" fill="#ffdd44" />
      </g>
    );
  }

  // Scrapyard — pile of bricks
  if (defId === 'scrapyard') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <rect x="-8" y="4" width="7" height="4" rx="0.5" fill="#bb6644" stroke="#884422" strokeWidth="0.6" />
        <rect x="1" y="4" width="7" height="4" rx="0.5" fill="#cc7755" stroke="#884422" strokeWidth="0.6" />
        <rect x="-5" y="0" width="7" height="4" rx="0.5" fill="#aa5533" stroke="#884422" strokeWidth="0.6" />
        <rect x="2" y="-1" width="6" height="4" rx="0.5" fill="#bb6644" stroke="#884422" strokeWidth="0.6" />
        <rect x="-3" y="-5" width="7" height="4" rx="0.5" fill="#cc7755" stroke="#884422" strokeWidth="0.6" />
        <rect x="-1" y="-8" width="5" height="3" rx="0.5" fill="#aa5533" stroke="#884422" strokeWidth="0.6" />
      </g>
    );
  }

  // Spa — aloe leaf
  if (defId === 'spa') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <path d="M0,10 C-2,4 -6,-4 -3,-10 C-1,-6 0,-2 0,0 C0,-2 1,-6 3,-10 C6,-4 2,4 0,10 Z"
          fill="#55aa55" stroke="#337733" strokeWidth="0.8" />
        <line x1="0" y1="10" x2="0" y2="-6" stroke="#337733" strokeWidth="0.6" strokeDasharray="1,1.5" />
      </g>
    );
  }

  // Campground — tent
  if (defId === 'campground') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <polygon points="0,-9 10,8 -10,8" fill="#cc8844" stroke="#885522" strokeWidth="1" strokeLinejoin="round" />
        <polygon points="0,-9 3,8 -3,8" fill="#ddaa66" stroke="none" />
        <line x1="0" y1="-9" x2="0" y2="8" stroke="#885522" strokeWidth="0.6" />
      </g>
    );
  }

  // Demolition — wrecking ball
  if (defId === 'demolition') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <line x1="-4" y1="-10" x2="-4" y2="-2" stroke="#666" strokeWidth="1.5" />
        <line x1="-8" y1="-10" x2="4" y2="-10" stroke="#666" strokeWidth="1.5" />
        <line x1="3" y1="-10" x2="3" y2="0" stroke="#888" strokeWidth="0.8" />
        <circle cx="3" cy="5" r="5.5" fill="#555" stroke="#333" strokeWidth="1" />
        <circle cx="2" cy="3.5" r="1.5" fill="#777" />
      </g>
    );
  }

  // Monument — spire
  if (defId === 'monument') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <polygon points="0,-11 3,8 -3,8" fill="#ddd" stroke="#999" strokeWidth="0.8" />
        <rect x="-5" y="6" width="10" height="3" rx="0.5" fill="#ccc" stroke="#999" strokeWidth="0.6" />
        <circle cx="0" cy="-11" r="1.2" fill="#ffcc00" stroke="#cc9900" strokeWidth="0.5" />
      </g>
    );
  }

  // Precinct — police badge
  if (defId === 'precinct') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <polygon
          points="0,-10 2.5,-4 9,-4 4,1 6,7.5 0,4 -6,7.5 -4,1 -9,-4 -2.5,-4"
          fill="#d4af37" stroke="#a08020" strokeWidth="0.8" strokeLinejoin="round"
        />
        <circle cx="0" cy="-1" r="3" fill="#2244aa" stroke="#1a336e" strokeWidth="0.5" />
      </g>
    );
  }

  // Church — church with cross
  if (defId === 'church') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <rect x="-6" y="0" width="12" height="10" rx="1" fill="#ddd" stroke="#999" strokeWidth="0.8" />
        <polygon points="-6,0 0,-5 6,0" fill="#cc4444" stroke="#993333" strokeWidth="0.8" />
        <rect x="-1" y="-11" width="2" height="7" fill="#996633" />
        <rect x="-3" y="-9" width="6" height="2" fill="#996633" />
      </g>
    );
  }

  // Warehouse — stack of boxes
  if (defId === 'warehouse') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <rect x="-7" y="3" width="6" height="5" fill="#cc9955" stroke="#886633" strokeWidth="0.6" />
        <rect x="1" y="3" width="6" height="5" fill="#bb8844" stroke="#886633" strokeWidth="0.6" />
        <rect x="-4" y="-2" width="6" height="5" fill="#ddaa66" stroke="#886633" strokeWidth="0.6" />
        <rect x="2" y="-3" width="5" height="5" fill="#cc9955" stroke="#886633" strokeWidth="0.6" />
        <rect x="-2" y="-7" width="5" height="4" fill="#bb8844" stroke="#886633" strokeWidth="0.6" />
      </g>
    );
  }

  // University — mortar board
  if (defId === 'university') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <polygon points="0,-10 10,-4 0,2 -10,-4" fill="#333" stroke="#111" strokeWidth="0.8" />
        <rect x="-1" y="-4" width="2" height="8" fill="#555" />
        <rect x="-4" y="4" width="8" height="3" rx="1" fill="#333" stroke="#111" strokeWidth="0.5" />
        <line x1="7" y1="-3" x2="7" y2="3" stroke="#d4af37" strokeWidth="0.8" />
        <circle cx="7" cy="3" r="1" fill="#d4af37" />
      </g>
    );
  }

  // Wind Turbine — windmill
  if (defId === 'wind_turbine') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <rect x="-1.5" y="-2" width="3" height="12" fill="#888" stroke="#666" strokeWidth="0.5" />
        <circle cx="0" cy="-2" r="2" fill="#aaa" stroke="#666" strokeWidth="0.5" />
        <line x1="0" y1="-2" x2="0" y2="-11" stroke="#ddd" strokeWidth="2" strokeLinecap="round" />
        <line x1="0" y1="-2" x2="8" y2="3" stroke="#ddd" strokeWidth="2" strokeLinecap="round" />
        <line x1="0" y1="-2" x2="-8" y2="3" stroke="#ddd" strokeWidth="2" strokeLinecap="round" />
      </g>
    );
  }

  // Golf Course — golf hole with flag
  if (defId === 'golf_course') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <ellipse cx="0" cy="6" rx="8" ry="3" fill="#55aa55" stroke="#337733" strokeWidth="0.8" />
        <circle cx="0" cy="5" r="2" fill="#333" />
        <line x1="0" y1="5" x2="0" y2="-10" stroke="#aaa" strokeWidth="1" />
        <polygon points="0,-10 8,-7 0,-4" fill="#dd3333" stroke="#aa2222" strokeWidth="0.5" />
      </g>
    );
  }

  // Mine — tunnel in a mountain
  if (defId === 'mine') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <polygon points="0,-10 10,8 -10,8" fill="#998877" stroke="#776655" strokeWidth="0.8" />
        <path d="M-4,8 A4,5 0 0 1 4,8 Z" fill="#333" stroke="#222" strokeWidth="0.5" />
        <rect x="-3" y="3" width="2" height="1" fill="#886633" />
        <rect x="1" y="3" width="2" height="1" fill="#886633" />
      </g>
    );
  }

  // Recycling Plant — recycling logo
  if (defId === 'recycling_plant') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <circle cx="0" cy="0" r="10" fill="#228833" stroke="#116622" strokeWidth="0.8" />
        <path d="M0,-6 L3,-1 L-3,-1 Z" fill="#fff" />
        <path d="M5,2 L2,7 L-1,2 Z" fill="#fff" />
        <path d="M-5,2 L-2,7 L1,2 Z" fill="#fff" transform="rotate(0)" />
        <path d="M-2,-4 Q0,-8 2,-4" fill="none" stroke="#fff" strokeWidth="1.5" />
        <path d="M4,0 Q7,3 3,5" fill="none" stroke="#fff" strokeWidth="1.5" />
        <path d="M-4,0 Q-7,3 -3,5" fill="none" stroke="#fff" strokeWidth="1.5" />
      </g>
    );
  }

  // Zoo — panda
  if (defId === 'zoo') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <circle cx="0" cy="0" r="8" fill="#fff" stroke="#333" strokeWidth="0.8" />
        <circle cx="-5" cy="-7" r="3" fill="#333" />
        <circle cx="5" cy="-7" r="3" fill="#333" />
        <ellipse cx="-3" cy="-1" rx="2.5" ry="2" fill="#333" />
        <ellipse cx="3" cy="-1" rx="2.5" ry="2" fill="#333" />
        <circle cx="-2.5" cy="-1.5" r="1" fill="#fff" />
        <circle cx="2.5" cy="-1.5" r="1" fill="#fff" />
        <ellipse cx="0" cy="3" rx="2" ry="1.5" fill="#333" />
      </g>
    );
  }

  // Bus Station — bus
  if (defId === 'bus_station') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <rect x="-8" y="-6" width="16" height="12" rx="2" fill="#ddaa22" stroke="#aa8811" strokeWidth="0.8" />
        <rect x="-6" y="-4" width="5" height="4" rx="0.5" fill="#aaddff" stroke="#6699bb" strokeWidth="0.4" />
        <rect x="1" y="-4" width="5" height="4" rx="0.5" fill="#aaddff" stroke="#6699bb" strokeWidth="0.4" />
        <circle cx="-4" cy="7" r="2" fill="#333" stroke="#111" strokeWidth="0.5" />
        <circle cx="4" cy="7" r="2" fill="#333" stroke="#111" strokeWidth="0.5" />
        <rect x="6" y="-3" width="2" height="3" rx="0.5" fill="#ff8800" />
      </g>
    );
  }

  // Post Office — envelope
  if (defId === 'post_office') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <rect x="-9" y="-5" width="18" height="13" rx="1" fill="#f0e8d0" stroke="#aa9966" strokeWidth="0.8" />
        <polyline points="-9,-5 0,3 9,-5" fill="none" stroke="#aa9966" strokeWidth="1" />
        <line x1="-9" y1="8" x2="-2" y2="2" stroke="#aa9966" strokeWidth="0.6" />
        <line x1="9" y1="8" x2="2" y2="2" stroke="#aa9966" strokeWidth="0.6" />
      </g>
    );
  }

  // City Hall — building with rotunda and flag
  if (defId === 'city_hall') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <rect x="-7" y="2" width="14" height="8" fill="#ddd" stroke="#999" strokeWidth="0.8" />
        <rect x="-8" y="0" width="16" height="3" fill="#ccc" stroke="#999" strokeWidth="0.5" />
        <path d="M-5,0 Q0,-8 5,0" fill="#bbb" stroke="#999" strokeWidth="0.8" />
        <line x1="0" y1="-8" x2="0" y2="-12" stroke="#888" strokeWidth="0.8" />
        <polygon points="0,-12 4,-10.5 0,-9" fill="#dd3333" />
        <line x1="-4" y1="3" x2="-4" y2="9" stroke="#999" strokeWidth="0.8" />
        <line x1="0" y1="3" x2="0" y2="9" stroke="#999" strokeWidth="0.8" />
        <line x1="4" y1="3" x2="4" y2="9" stroke="#999" strokeWidth="0.8" />
      </g>
    );
  }

  // Pharmacy — mortar and pestle
  if (defId === 'pharmacy') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <path d="M-7,2 Q-7,-5 0,-6 Q7,-5 7,2 L5,8 L-5,8 Z" fill="#ddd" stroke="#999" strokeWidth="0.8" />
        <line x1="-2" y1="-8" x2="5" y2="4" stroke="#888" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="5" cy="5" rx="2" ry="3" fill="#888" stroke="#666" strokeWidth="0.5" transform="rotate(20,5,5)" />
      </g>
    );
  }

  // Art Gallery — framed picture
  if (defId === 'art_gallery') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <rect x="-9" y="-8" width="18" height="16" rx="1" fill="#996633" stroke="#664422" strokeWidth="1.2" />
        <rect x="-7" y="-6" width="14" height="12" fill="#aaddee" stroke="#88aacc" strokeWidth="0.5" />
        <polygon points="-4,6 -1,-2 3,1 6,-4 7,6" fill="#55aa55" stroke="none" />
        <circle cx="-3" cy="-3" r="2" fill="#ffcc00" />
      </g>
    );
  }

  // Power Plant — cooling tower with lightning bolt
  if (defId === 'power_plant') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <path d="M-5,9 Q-7,-2 -4,-8 L4,-8 Q7,-2 5,9 Z" fill="#bbb" stroke="#888" strokeWidth="0.8" />
        <path d="M-3,-8 Q-2,-12 0,-12 Q2,-12 3,-8" fill="#ddd" stroke="#888" strokeWidth="0.5" />
        <path d="M1,-5 L-2,0 L1,0 L-1,5 L3,0 L0,0 Z" fill="#ffcc00" stroke="#cc9900" strokeWidth="0.5" />
      </g>
    );
  }

  // Farmers Market — vendor stall
  if (defId === 'farmers_market') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <rect x="-8" y="1" width="16" height="8" fill="#cc8844" stroke="#885522" strokeWidth="0.8" />
        <polygon points="-9,-4 0,-9 9,-4 9,1 -9,1" fill="#dd4444" stroke="#aa2222" strokeWidth="0.8" />
        <line x1="-3" y1="-4" x2="-3" y2="1" stroke="#fff" strokeWidth="0.8" />
        <line x1="3" y1="-4" x2="3" y2="1" stroke="#fff" strokeWidth="0.8" />
        <circle cx="-4" cy="5" r="1.5" fill="#ff8800" />
        <circle cx="0" cy="5" r="1.5" fill="#55aa55" />
        <circle cx="4" cy="5" r="1.5" fill="#dd3333" />
      </g>
    );
  }

  // Hospital — red cross
  if (defId === 'hospital') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <rect x="-9" y="-9" width="18" height="18" rx="2" fill="#fff" stroke="#cc0000" strokeWidth="1.2" />
        <rect x="-2.5" y="-7" width="5" height="14" fill="#cc0000" />
        <rect x="-7" y="-2.5" width="14" height="5" fill="#cc0000" />
      </g>
    );
  }

  // Theme Park — ferris wheel
  if (defId === 'theme_park') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <circle cx="0" cy="-2" r="8" fill="none" stroke="#cc44aa" strokeWidth="1.5" />
        <circle cx="0" cy="-2" r="1.5" fill="#cc44aa" />
        <line x1="0" y1="-2" x2="0" y2="-10" stroke="#cc44aa" strokeWidth="0.8" />
        <line x1="0" y1="-2" x2="0" y2="6" stroke="#cc44aa" strokeWidth="0.8" />
        <line x1="0" y1="-2" x2="7" y2="2" stroke="#cc44aa" strokeWidth="0.8" />
        <line x1="0" y1="-2" x2="-7" y2="2" stroke="#cc44aa" strokeWidth="0.8" />
        <line x1="0" y1="-2" x2="7" y2="-6" stroke="#cc44aa" strokeWidth="0.8" />
        <line x1="0" y1="-2" x2="-7" y2="-6" stroke="#cc44aa" strokeWidth="0.8" />
        <line x1="-4" y1="8" x2="4" y2="8" stroke="#888" strokeWidth="1.5" />
        <line x1="-3" y1="8" x2="0" y2="6" stroke="#888" strokeWidth="0.8" />
        <line x1="3" y1="8" x2="0" y2="6" stroke="#888" strokeWidth="0.8" />
      </g>
    );
  }

  // Fast Food — hamburger
  if (defId === 'fast_food') {
    return (
      <g transform={`translate(${cx}, ${cy})`} className="building-icon">
        <path d="M-8,0 Q-8,-8 0,-8 Q8,-8 8,0 Z" fill="#cc8833" stroke="#996622" strokeWidth="0.8" />
        <rect x="-8" y="0" width="16" height="3" fill="#55aa33" />
        <rect x="-8" y="3" width="16" height="2" fill="#cc4444" />
        <rect x="-8" y="5" width="16" height="2" fill="#ddaa44" />
        <path d="M-8,7 Q-8,10 0,10 Q8,10 8,7 Z" fill="#cc8833" stroke="#996622" strokeWidth="0.8" />
        <circle cx="-3" cy="-4" r="0.8" fill="#ffdd88" />
        <circle cx="2" cy="-5" r="0.8" fill="#ffdd88" />
        <circle cx="4" cy="-2" r="0.8" fill="#ffdd88" />
      </g>
    );
  }

  // Fallback: generic marker
  return (
    <g transform={`translate(${cx}, ${cy})`} className="building-icon">
      <circle r="10" fill="#d080d0" stroke="#a060a0" strokeWidth="1.2" />
      <text textAnchor="middle" dominantBaseline="central" fontSize="8" fill="#fff" fontWeight="700">
        {def.name[0]}
      </text>
    </g>
  );
}
