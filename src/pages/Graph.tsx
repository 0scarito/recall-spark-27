import AppLayout from "@/components/AppLayout";

const Graph = () => {
  return (
    <AppLayout>
      <div className="relative min-h-[calc(100vh-200px)] w-full overflow-hidden">
        {/* Abstract graph elements */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800">
          {/* Top right cluster - X shape */}
          <g transform="translate(900, 100)">
            <circle cx="0" cy="0" r="4" fill="#60a5fa" />
            <circle cx="30" cy="-30" r="4" fill="#60a5fa" />
            <circle cx="-30" cy="30" r="4" fill="#60a5fa" />
            <circle cx="30" cy="30" r="4" fill="#60a5fa" />
            <circle cx="-30" cy="-30" r="4" fill="#60a5fa" />
            <line x1="0" y1="0" x2="30" y2="-30" stroke="#60a5fa" strokeWidth="1" opacity="0.5" />
            <line x1="0" y1="0" x2="-30" y2="30" stroke="#60a5fa" strokeWidth="1" opacity="0.5" />
            <line x1="0" y1="0" x2="30" y2="30" stroke="#60a5fa" strokeWidth="1" opacity="0.5" />
            <line x1="0" y1="0" x2="-30" y2="-30" stroke="#60a5fa" strokeWidth="1" opacity="0.5" />
          </g>

          {/* Top middle single dot */}
          <circle cx="600" cy="150" r="4" fill="#60a5fa" />

          {/* Middle left cluster - X shape */}
          <g transform="translate(200, 350)">
            <circle cx="0" cy="0" r="4" fill="#60a5fa" />
            <circle cx="30" cy="-30" r="4" fill="#60a5fa" />
            <circle cx="-30" cy="30" r="4" fill="#60a5fa" />
            <circle cx="30" cy="30" r="4" fill="#60a5fa" />
            <circle cx="-30" cy="-30" r="4" fill="#60a5fa" />
            <line x1="0" y1="0" x2="30" y2="-30" stroke="#60a5fa" strokeWidth="1" opacity="0.5" />
            <line x1="0" y1="0" x2="-30" y2="30" stroke="#60a5fa" strokeWidth="1" opacity="0.5" />
            <line x1="0" y1="0" x2="30" y2="30" stroke="#60a5fa" strokeWidth="1" opacity="0.5" />
            <line x1="0" y1="0" x2="-30" y2="-30" stroke="#60a5fa" strokeWidth="1" opacity="0.5" />
          </g>

          {/* Bottom middle starburst/dandelion */}
          <g transform="translate(600, 600)">
            <circle cx="0" cy="0" r="6" fill="#60a5fa" />
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 360) / 12;
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * 50;
              const y = Math.sin(rad) * 50;
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r="3" fill="#60a5fa" />
                  <line x1="0" y1="0" x2={x} y2={y} stroke="#60a5fa" strokeWidth="1" opacity="0.4" />
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </AppLayout>
  );
};

export default Graph;


