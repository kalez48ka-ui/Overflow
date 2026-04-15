import Image from "next/image";

const TEAM_IDS = ["IU", "LQ", "MS", "KK", "PZ", "QG", "HK", "RW"] as const;
type TeamId = (typeof TEAM_IDS)[number];

const TEAM_NAMES: Record<string, string> = {
  IU: "Islamabad United",
  LQ: "Lahore Qalandars",
  MS: "Multan Sultans",
  KK: "Karachi Kings",
  PZ: "Peshawar Zalmi",
  QG: "Quetta Gladiators",
  HK: "Hyderabad Kingsmen",
  RW: "Rawalpindiz",
};

function isValidTeamId(id: string): id is TeamId {
  return TEAM_IDS.includes(id as TeamId);
}

interface TeamLogoProps {
  teamId: string;
  color?: string;
  size?: number;
  className?: string;
  glow?: boolean;
  priority?: boolean;
}

export function TeamLogo({ teamId, color, size = 40, className = "", glow = false, priority = false }: TeamLogoProps) {
  const cleanId = (teamId || "").replace("$", "").toUpperCase();

  if (isValidTeamId(cleanId)) {
    return (
      <div
        className={`relative shrink-0 rounded-full overflow-hidden ${className}`}
        style={{
          width: size,
          height: size,
          ...(glow && color ? { boxShadow: `0 0 20px ${color}40, 0 0 40px ${color}20` } : {}),
        }}
      >
        <Image
          src={`/teams/${cleanId}.png`}
          alt={`${TEAM_NAMES[cleanId] || cleanId} logo`}
          width={size}
          height={size}
          sizes="(max-width: 768px) 40px, 48px"
          className="h-full w-full object-contain"
          priority={priority}
        />
      </div>
    );
  }

  // Fallback for unknown teams
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full text-white font-bold ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color || "#58A6FF",
        fontSize: Math.max(size * 0.3, 10),
        ...(glow && color ? { boxShadow: `0 0 20px ${color}40, 0 0 40px ${color}20` } : {}),
      }}
    >
      {cleanId.slice(0, 2)}
    </div>
  );
}
