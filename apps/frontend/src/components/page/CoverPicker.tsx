import { useState } from "react";
import { COVER_PRESETS, coverStyle } from "./decorPresets";

export default function CoverPicker({
  cover,
  onChange,
}: {
  cover: string | null;
  onChange: (cover: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const style = coverStyle(cover);

  return (
    <div className="relative mb-4">
      {style ? (
        <div
          className="h-32 w-full cursor-pointer rounded"
          style={{ background: style }}
          onClick={() => setOpen((v) => !v)}
        />
      ) : (
        <button
          className="w-full rounded border border-dashed border-gray-300 py-2 text-xs text-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          onClick={() => setOpen((v) => !v)}
        >
          + 커버 추가
        </button>
      )}
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 flex flex-wrap gap-2 rounded border border-gray-200 bg-white p-2 shadow-md dark:border-gray-700 dark:bg-gray-800">
          {COVER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              aria-label={preset.label}
              className="h-10 w-16 rounded"
              style={{ background: preset.style }}
              onClick={() => {
                onChange(preset.id);
                setOpen(false);
              }}
            />
          ))}
          <button
            className="w-full rounded px-2 py-1 text-left text-xs text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            커버 제거
          </button>
        </div>
      )}
    </div>
  );
}
