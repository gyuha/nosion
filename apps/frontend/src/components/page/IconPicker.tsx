import { useState } from "react";
import { EMOJI_OPTIONS } from "./decorPresets";

export default function IconPicker({
  icon,
  onChange,
}: {
  icon: string | null;
  onChange: (icon: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        aria-label="아이콘 설정"
        className="rounded px-2 py-1 text-3xl hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={() => setOpen((v) => !v)}
      >
        {icon ?? "🙂"}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 grid w-64 grid-cols-8 gap-1 rounded border border-gray-200 bg-white p-2 shadow-md dark:border-gray-700 dark:bg-gray-800">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              className="rounded p-1 text-xl hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => {
                onChange(e);
                setOpen(false);
              }}
            >
              {e}
            </button>
          ))}
          <button
            className="col-span-8 mt-1 rounded px-2 py-1 text-left text-xs text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            아이콘 제거
          </button>
        </div>
      )}
    </div>
  );
}
