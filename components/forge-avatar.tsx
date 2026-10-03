"use client";

type ForgeAvatarProps = {
  name?: string;
  level?: number;
  size?: "sm" | "md" | "lg";
};

const palettes = [
  ["#c8ff38", "#16220c"],
  ["#67a9ff", "#0e1b2c"],
  ["#ffad61", "#24170c"],
  ["#d98cff", "#1d1028"],
];

export default function ForgeAvatar({ name = "Forge Player", level = 1, size = "md" }: ForgeAvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "F";
  const seed = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [accent, background] = palettes[seed % palettes.length];

  return (
    <span
      className={`forge-avatar forge-avatar-${size}`}
      style={{ "--avatar-accent": accent, "--avatar-bg": background } as React.CSSProperties}
      title={`${name} · Level ${level}`}
      aria-label={`${name}, level ${level}`}
    >
      <span>{initial}</span>
      {size !== "sm" && <b>{level}</b>}
    </span>
  );
}
