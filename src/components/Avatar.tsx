"use client";

import React from "react";
import { Camera } from "lucide-react";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "student" | "staff";
  editable?: boolean;
  onEditClick?: () => void;
}

const PALETTES = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200",
  "bg-violet-100 text-violet-800 border-violet-200",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getPaletteIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % PALETTES.length;
  }
  return Math.abs(hash) % PALETTES.length;
}

export function Avatar({ name, src, size = "md", variant = "student", editable = false, onEditClick }: AvatarProps) {
  const sizeClass =
    size === "sm"
      ? "w-8 h-8 text-[11px]"
      : size === "lg"
      ? "w-14 h-14 text-base"
      : size === "xl"
      ? "w-20 h-20 text-xl"
      : "w-10 h-10 text-xs";

  const palette = variant === "staff" ? "bg-slate-800 text-white border-slate-700" : PALETTES[getPaletteIndex(name)];

  return (
    <div className="relative inline-flex shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className={`${sizeClass} rounded-full object-cover border-2 border-white ring-1 ring-slate-200 shadow-xs bg-slate-100`}
        />
      ) : variant === "staff" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logo-smk-global-insan.jpg"
          alt={`${name} — SMK Global Insan`}
          className={`${sizeClass} rounded-full object-contain border-2 border-white ring-1 ring-slate-200 shadow-xs bg-white p-0.5`}
        />
      ) : (
        <div
          className={`${sizeClass} rounded-full border font-extrabold flex flex-col items-center justify-center select-none shadow-xs ${palette}`}
          title={`${name} (Foto placeholder — dapat diganti oleh Admin/Guru)`}
        >
          <span>{getInitials(name)}</span>
        </div>
      )}

      {editable && onEditClick && (
        <button
          type="button"
          onClick={onEditClick}
          title="Ganti Foto Profil"
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-700 text-white border-2 border-white shadow flex items-center justify-center hover:bg-blue-800 transition"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
