const icons = {
  Clear: (
    <svg viewBox="0 0 160 160" role="img" aria-label="Cielo despejado">
      <defs>
        <radialGradient id="sunGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff4d6" />
          <stop offset="60%" stopColor="#ffd36f" />
          <stop offset="100%" stopColor="#f7a14b" />
        </radialGradient>
      </defs>
      <g>
        <circle cx="80" cy="80" r="32" fill="url(#sunGradient)" />
        <g stroke="#ffd36f" strokeWidth="6" strokeLinecap="round">
          {[...Array(8)].map((_, index) => {
            const angle = (index * Math.PI) / 4;
            const x1 = 80 + Math.cos(angle) * 48;
            const y1 = 80 + Math.sin(angle) * 48;
            const x2 = 80 + Math.cos(angle) * 64;
            const y2 = 80 + Math.sin(angle) * 64;
            return (
              <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} opacity="0.9" />
            );
          })}
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 80 80"
            to="360 80 80"
            dur="12s"
            repeatCount="indefinite"
          />
        </g>
      </g>
    </svg>
  ),
  Rain: (
    <svg viewBox="0 0 160 160" role="img" aria-label="Lluvia ligera">
      <g fill="none" strokeLinecap="round">
        <g stroke="#cfd9f5" strokeWidth="8">
          <path d="M45 80c-8 0-15-7-15-15 0-12 9-21 21-21 5-12 17-20 31-20 18 0 33 14 34 32 10 1 18 9 18 19 0 11-9 20-20 20">
            <animate
              attributeName="d"
              dur="4s"
              repeatCount="indefinite"
              values="M45 80c-8 0-15-7-15-15 0-12 9-21 21-21 5-12 17-20 31-20 18 0 33 14 34 32 10 1 18 9 18 19 0 11-9 20-20 20;M45 82c-8 0-15-7-15-15 0-12 9-21 21-21 5-12 17-20 31-20 18 0 33 14 34 32 10 1 18 9 18 19 0 11-9 20-20 20;M45 80c-8 0-15-7-15-15 0-12 9-21 21-21 5-12 17-20 31-20 18 0 33 14 34 32 10 1 18 9 18 19 0 11-9 20-20 20"
            />
          </path>
        </g>
        {[0, 1, 2].map((drop) => (
          <line
            key={drop}
            x1={60 + drop * 24}
            y1={104}
            x2={54 + drop * 24}
            y2={136}
            stroke="#7fb7ff"
            strokeWidth="6"
            opacity="0.85"
          >
            <animate
              attributeName="y1"
              values="104;128;104"
              dur={`${0.8 + drop * 0.1}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="y2"
              values="136;160;136"
              dur={`${0.8 + drop * 0.1}s`}
              repeatCount="indefinite"
            />
          </line>
        ))}
      </g>
    </svg>
  ),
  Clouds: (
    <svg viewBox="0 0 160 160" role="img" aria-label="Cielo nublado">
      <g fill="#f0f4ff" opacity="0.92">
        <ellipse cx="70" cy="80" rx="42" ry="26">
          <animate
            attributeName="cx"
            values="70;74;70"
            dur="6s"
            repeatCount="indefinite"
          />
        </ellipse>
        <ellipse cx="105" cy="86" rx="38" ry="24">
          <animate
            attributeName="cx"
            values="105;100;105"
            dur="6s"
            repeatCount="indefinite"
          />
        </ellipse>
        <ellipse cx="90" cy="92" rx="48" ry="26" fill="#dfe6fb" />
      </g>
    </svg>
  ),
  Snow: (
    <svg viewBox="0 0 160 160" role="img" aria-label="Nieve suave">
      <g stroke="#ffffff" strokeWidth="4" strokeLinecap="round">
        {[0, 1, 2].map((flake) => (
          <g key={flake} transform={`translate(${60 + flake * 24} 90)`}>
            <line x1="0" y1="-12" x2="0" y2="12">
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0;45;0"
                dur={`${2 + flake * 0.3}s`}
                repeatCount="indefinite"
              />
            </line>
            <line x1="-12" y1="0" x2="12" y2="0">
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0;-45;0"
                dur={`${2 + flake * 0.3}s`}
                repeatCount="indefinite"
              />
            </line>
            <circle cx="0" cy="0" r="2" fill="#ffffff">
              <animate
                attributeName="cy"
                values="0;20;0"
                dur={`${2.4 + flake * 0.3}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        ))}
      </g>
    </svg>
  ),
  Thunderstorm: (
    <svg viewBox="0 0 160 160" role="img" aria-label="Tormenta eléctrica">
      <g>
        <path
          d="M40 82c-9 0-16-8-16-17 0-13 10-24 24-24 6-15 21-25 38-25 22 0 40 18 40 40 11 2 20 12 20 24 0 14-11 25-25 25"
          fill="none"
          stroke="#c7ceef"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <polygon
          points="90,96 76,128 98,128 84,160"
          fill="#ffd155"
          opacity="0.9"
        >
          <animate
            attributeName="opacity"
            values="0.4;1;0.4"
            dur="1.2s"
            repeatCount="indefinite"
          />
        </polygon>
        <g stroke="#8fb4ff" strokeWidth="6" strokeLinecap="round">
          <line x1="60" y1="112" x2="54" y2="136">
            <animate
              attributeName="y2"
              values="136;150;136"
              dur="0.7s"
              repeatCount="indefinite"
            />
          </line>
          <line x1="84" y1="118" x2="78" y2="144">
            <animate
              attributeName="y2"
              values="144;160;144"
              dur="0.7s"
              begin="0.2s"
              repeatCount="indefinite"
            />
          </line>
        </g>
      </g>
    </svg>
  ),
  Drizzle: (
    <svg viewBox="0 0 160 160" role="img" aria-label="Llovizna suave">
      <g>
        <linearGradient id="drizzleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d7e7ff" />
          <stop offset="100%" stopColor="#8fb9ff" />
        </linearGradient>
        <ellipse
          cx="86"
          cy="72"
          rx="46"
          ry="24"
          fill="url(#drizzleGradient)"
          opacity="0.85"
        >
          <animate
            attributeName="cx"
            values="84;88;84"
            dur="5s"
            repeatCount="indefinite"
          />
        </ellipse>
        {[0, 1, 2, 3].map((drop) => (
          <line
            key={drop}
            x1={58 + drop * 20}
            y1={98}
            x2={54 + drop * 20}
            y2={124}
            stroke="#87b7ff"
            strokeWidth="5"
            strokeLinecap="round"
            opacity={0.7 + drop * 0.05}
          >
            <animate
              attributeName="y1"
              values="98;116;98"
              dur={`${1 + drop * 0.08}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="y2"
              values="124;142;124"
              dur={`${1 + drop * 0.08}s`}
              repeatCount="indefinite"
            />
          </line>
        ))}
      </g>
    </svg>
  ),
  Mist: (
    <svg viewBox="0 0 160 160" role="img" aria-label="Niebla">
      {[0, 1, 2, 3].map((line) => (
        <g
          key={line}
          stroke="#dbe3f9"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.7"
        >
          <line x1="40" y1={70 + line * 14} x2="120" y2={70 + line * 14}>
            <animate
              attributeName="x1"
              values="40;44;40"
              dur={`${4 + line}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="x2"
              values="120;116;120"
              dur={`${4 + line}s`}
              repeatCount="indefinite"
            />
          </line>
        </g>
      ))}
    </svg>
  ),
};

const fallback = (
  <svg viewBox="0 0 160 160" role="img" aria-label="Clima variable">
    <circle cx="60" cy="70" r="26" fill="#f4c95d" opacity="0.9" />
    <ellipse cx="96" cy="98" rx="38" ry="24" fill="#d6def6" opacity="0.85" />
  </svg>
);

export default function WeatherVisual({ condition }) {
  if (!condition) {
    return <div className="weather-visual">{fallback}</div>;
  }

  const related = {
    Drizzle: "Rain",
    Haze: "Mist",
    Fog: "Mist",
    Smoke: "Mist",
    Dust: "Mist",
    Sand: "Mist",
    Ash: "Mist",
    Squall: "Thunderstorm",
    Tornado: "Thunderstorm",
  };

  const selected = icons[condition] || icons[related[condition]] || fallback;

  return <div className="weather-visual">{selected}</div>;
}
