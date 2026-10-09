import { useState } from "react";
import { Activity } from "lucide-react";
export function Brand({
  name = "PlugPix",
  clinic = false,
  initials,
  logo,
}: {
  name?: string | undefined;
  clinic?: boolean;
  initials?: string;
  logo?: string | undefined;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <div className="brand">
      <div className="brand-symbol">
        {logo && failedSrc !== logo ? (
          <img
            src={logo}
            alt="Logo"
            className="brand-logo-img"
            onError={() => setFailedSrc(logo)}
          />
        ) : clinic ? (
          initials
        ) : (
          <Activity size={25} strokeWidth={2.4} />
        )}
      </div>
      <div>
        <strong>{name}</strong>
        <span>{clinic ? "Gestão da clínica" : "TECHMEDICINA"}</span>
      </div>
    </div>
  );
}
