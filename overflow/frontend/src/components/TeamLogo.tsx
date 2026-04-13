import Image from "next/image";

const TEAM_IDS = ["IU", "LQ", "MS", "KK", "PZ", "QG", "HK", "RW"] as const;
type TeamId = (typeof TEAM_IDS)[number];

function isValidTeamId(id: string): id is TeamId {
  return TEAM_IDS.includes(id as TeamId);
}

interface TeamLogoProps {
  teamId: string;
  color?: string;
  size?: number;
  className?: string;
  glow?: boolean;
}

export function TeamLogo({ teamId, color, size = 40, className = "", glow = false }: TeamLogoProps) {
  const cleanId = teamId.replace("$", "").toUpperCase();

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
          src={`/teams/${cleanId}.svg`}
          alt={cleanId}
          width={size}
          height={size}
          className="h-full w-full object-cover"
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
        fontSize: size * 0.25,
        ...(glow && color ? { boxShadow: `0 0 20px ${color}40, 0 0 40px ${color}20` } : {}),
      }}
    >
      {cleanId.slice(0, 2)}
    </div>
  );
}
