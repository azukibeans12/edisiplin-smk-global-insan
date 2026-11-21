"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Avatar } from "@/components/Avatar";

interface ConfirmDeleteModalProps {
  title: string; // e.g. "HAPUS SISWA?" or "HAPUS GURU?"
  targetName: string;
  targetSub?: string;
  targetAvatar?: string | null;
  variant?: "student" | "staff";
  description: string;
  tip?: string;
  loading?: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({
  title,
  targetName,
  targetSub,
  targetAvatar,
  variant = "student",
  description,
  tip,
  loading = false,
  error,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={() => !loading && onCancel()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 md:p-7 text-center space-y-5"
      >
        {/* Warning Icon + Big Bold Red Title (from Figma sketch) */}
        <div className="space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-red-600 uppercase">
            {title}
          </h2>
        </div>

        {/* Target Identity Preview */}
        <div className="flex items-center justify-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-left">
          <Avatar name={targetName} src={targetAvatar} size="md" variant={variant} />
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 truncate">{targetName}</div>
            {targetSub && <div className="text-xs text-slate-500 truncate">{targetSub}</div>}
          </div>
        </div>

        {/* Description & Tip */}
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>{description}</p>
          {tip && (
            <p className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
              <strong>Tip:</strong> {tip}
            </p>
          )}
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Prominent Pill Buttons: Blue JANGAN vs Red HAPUS */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="w-full py-3 px-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold tracking-wide shadow-sm transition disabled:opacity-50"
          >
            JANGAN
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="w-full py-3 px-5 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-extrabold tracking-wide shadow-sm transition disabled:opacity-50"
          >
            {loading ? "MENGHAPUS..." : "HAPUS"}
          </button>
        </div>
      </div>
    </div>
  );
}
