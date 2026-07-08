"use client";

import { useRef, useState } from "react";
import { PAGES_CHANGED_EVENT } from "@/components/sidebar";

const EMOJI_OPTIONS = [
  "📄", "📝", "📌", "📎", "✅", "🎯", "💡", "🔥", "⭐", "📚",
  "🗂️", "📊", "🎨", "🚀", "🧠", "📅", "🔧", "🌱", "🎉", "💬",
  "🖼️", "🧩", "📁", "🔔", "🏷️", "🧭", "🛠️", "📈", "🔒", "❤️",
];

export default function PageHeader({
  pageId,
  title: initialTitle,
  icon: initialIcon,
  coverImage: initialCoverImage,
}: {
  pageId: string;
  title: string;
  icon: string | null;
  coverImage: string | null;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [icon, setIcon] = useState(initialIcon);
  const [coverImage, setCoverImage] = useState(initialCoverImage);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    window.dispatchEvent(new Event(PAGES_CHANGED_EVENT));
  }

  function commitTitle(raw: string) {
    const next = raw.trim();
    if (next === "" || next === initialTitle) {
      setTitle(initialTitle);
      return;
    }
    setTitle(next);
    void patch({ title: next });
  }

  function pickIcon(emoji: string) {
    setPickerOpen(false);
    setIcon(emoji);
    void patch({ icon: emoji });
  }

  function removeIcon() {
    setPickerOpen(false);
    setIcon(null);
    void patch({ icon: null });
  }

  async function uploadCover(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("업로드 실패");
      const { url } = (await res.json()) as { url: string };
      setCoverImage(url);
      await patch({ coverImage: url });
    } catch {
      alert("커버 이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function removeCover() {
    setCoverImage(null);
    void patch({ coverImage: null });
  }

  return (
    <div>
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void uploadCover(file);
        }}
      />
      {coverImage ? (
        <div className="group relative mb-6 h-56 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
          {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 업로드 이미지라 next/image 최적화 대상이 아님 */}
          <img src={coverImage} alt="" className="h-full w-full object-cover" />
          <div className="absolute right-3 top-3 hidden gap-2 group-hover:flex">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="rounded bg-white/90 px-2 py-1 text-xs font-medium text-zinc-700 shadow hover:bg-white"
            >
              변경
            </button>
            <button
              type="button"
              onClick={removeCover}
              className="rounded bg-white/90 px-2 py-1 text-xs font-medium text-red-600 shadow hover:bg-white"
            >
              삭제
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          disabled={uploading}
          className="mb-2 text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          {uploading ? "업로드 중..." : "+ 커버 추가"}
        </button>
      )}

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-label="아이콘 선택"
            className="flex h-12 w-12 items-center justify-center rounded-lg text-4xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {icon ?? "🙂"}
          </button>
          {pickerOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setPickerOpen(false)}
              />
              <div className="absolute left-0 top-14 z-20 grid w-64 grid-cols-6 gap-1 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => pickIcon(emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded text-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {emoji}
                  </button>
                ))}
                {icon && (
                  <button
                    type="button"
                    onClick={removeIcon}
                    className="col-span-6 mt-1 rounded px-2 py-1 text-left text-xs text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    아이콘 제거
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={(e) => commitTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          maxLength={200}
          placeholder="제목 없음"
          className="w-full min-w-0 break-words border-none bg-transparent text-4xl font-bold text-zinc-900 outline-none placeholder:text-zinc-300 dark:text-zinc-50 dark:placeholder:text-zinc-700"
        />
      </div>
    </div>
  );
}
