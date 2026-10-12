import type { Clinic } from "./types";

export interface CustomTextureItem {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

export interface StandardTextureOption {
  id: string;
  name: string;
  description: string;
  url?: string | undefined;
  isAvailable: boolean;
}

export const DEFAULT_TEXTURE_CATALOG: StandardTextureOption[] = [
  {
    id: "texture-1",
    name: "Luzes Bokeh",
    description: "Orbes luminosos em degradê verde e azul sobre metal",
    url: "/textures/texture-1.jpg",
    isAvailable: true,
  },
  {
    id: "texture-2",
    name: "Brilho Esmeralda",
    description: "Três pontos de luz verde ambiente sobre textura acetinada",
    url: "/textures/texture-2.jpg",
    isAvailable: true,
  },
  {
    id: "texture-3",
    name: "Azul Meia-Noite",
    description: "Textura metálica lisa em tom azul profundo e nobre",
    url: "/textures/texture-3.jpg",
    isAvailable: true,
  },
  {
    id: "texture-4",
    name: "Vidro Água",
    description: "Superfície vítrea verde-água com gotas e ranhuras suaves",
    url: "/textures/texture-4.jpg",
    isAvailable: true,
  },
  {
    id: "texture-5",
    name: "Opção Padrão 5",
    description: "Pendente de anexo do proprietário",
    url: undefined,
    isAvailable: false,
  },
];

export interface ClinicPreferences {
  name: string;
  primary: string;
  secondary: string;
  mode: "light" | "dark";
  logo?: string | undefined;
  favicon?: string | undefined;
  textureId?: string | undefined;
  textureUrl?: string | undefined;
  customTextures?: CustomTextureItem[] | undefined;
}
export const validColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

export const validImageBase64 = (value: unknown, maxBytes = 204800): boolean => {
  if (value === undefined) return true;
  if (typeof value !== "string") return false;
  // Conservative base64 overhead limit (+200 chars header allowance)
  const maxChars = Math.ceil((maxBytes * 4) / 3) + 200;
  if (value.length > maxChars) return false;
  const match = value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return false;

  const mime = match[1];
  const payload = match[2];
  if (!payload) return false;

  try {
    const raw = atob(payload);
    if (btoa(raw) !== payload) return false; // Not canonical
    if (raw.length > maxBytes) return false;

    const toHex = (str: string, len: number) => {
      let hex = "";
      for (let i = 0; i < len && i < str.length; i++) {
        hex += str.charCodeAt(i).toString(16).padStart(2, "0");
      }
      return hex;
    };

    if (mime === "png") {
      return toHex(raw, 8) === "89504e470d0a1a0a";
    }
    if (mime === "jpeg") {
      return toHex(raw, 3).toLowerCase() === "ffd8ff";
    }
    if (mime === "webp") {
      return (
        toHex(raw, 4).toLowerCase() === "52494646" &&
        toHex(raw.substring(8), 4).toLowerCase() === "57454250"
      );
    }
    return false;
  } catch {
    return false;
  }
};

export const validTextureUrl = (value: unknown): boolean => {
  if (value === undefined) return true;
  if (typeof value !== "string") return false;
  if (value.startsWith("/textures/") || value.startsWith("/patient-mobile-texture.jpg")) {
    return true;
  }
  // Custom texture upload allows up to 5MB (5242880 bytes)
  return validImageBase64(value, 5242880);
};

export function validPreferences(value: unknown): value is ClinicPreferences {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<ClinicPreferences>;
  const baseValid =
    typeof p.name === "string" &&
    p.name.trim().length > 0 &&
    p.name.length <= 80 &&
    typeof p.primary === "string" &&
    validColor(p.primary) &&
    typeof p.secondary === "string" &&
    validColor(p.secondary) &&
    (p.mode === "light" || p.mode === "dark") &&
    validImageBase64(p.logo) &&
    validImageBase64(p.favicon);

  if (!baseValid) return false;

  if (p.textureId !== undefined && (typeof p.textureId !== "string" || p.textureId.length > 64)) {
    return false;
  }
  if (p.textureUrl !== undefined && !validTextureUrl(p.textureUrl)) {
    return false;
  }
  if (p.customTextures !== undefined) {
    if (!Array.isArray(p.customTextures) || p.customTextures.length > 20) return false;
    for (const item of p.customTextures) {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.id !== "string" ||
        typeof item.name !== "string" ||
        !validTextureUrl(item.url)
      ) {
        return false;
      }
    }
  }

  return true;
}

export function defaultPreferences(clinic: Clinic): ClinicPreferences {
  return {
    name: clinic.name,
    primary: "#B9D85D",
    secondary: "#56B9C5",
    mode: "dark",
    textureId: "texture-3",
    textureUrl: "/textures/texture-3.jpg",
    customTextures: [],
  };
}
