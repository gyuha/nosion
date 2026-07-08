"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useCreateBlockNote, SuggestionMenuController } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { filterSuggestionItems, type PartialBlock } from "@blocknote/core";
import { ko } from "@blocknote/core/locales";
import { schema, getCustomSlashMenuItems } from "@/components/blocknote/custom-blocks";
import "@blocknote/mantine/style.css";

const AUTOSAVE_DELAY_MS = 1000;

type SaveStatus = "idle" | "saving" | "saved" | "error";

const emptySubscribe = () => () => {};

/** 이미지 블록(붙여넣기/파일선택)에서 호출되는 업로드 핸들러. 업로드된 파일의 URL을 반환한다. */
async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("이미지 업로드에 실패했습니다.");
  const { url } = await res.json();
  return url;
}

/** BlockNote는 브라우저 전용(window 접근)이라 하이드레이션 이후에만 true가 된다. */
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/** <html> 요소의 dark 클래스를 관찰해 앱의 다크 모드 토글을 에디터 테마에 반영한다. */
function useIsDarkMode() {
  return useSyncExternalStore(
    (callback) => {
      const observer = new MutationObserver(callback);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return () => observer.disconnect();
    },
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
}

export default function PageEditor(props: {
  pageId: string;
  initialContent: PartialBlock[] | undefined;
}) {
  const isClient = useIsClient();
  if (!isClient) return <div className="mt-8" />;
  return <PageEditorClient {...props} />;
}

function PageEditorClient({
  pageId,
  initialContent,
}: {
  pageId: string;
  initialContent: PartialBlock[] | undefined;
}) {
  const editor = useCreateBlockNote({
    initialContent,
    dictionary: ko,
    schema,
    uploadFile,
  });
  const isDark = useIsDarkMode();
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleChange() {
    setStatus("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/pages/${pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: JSON.stringify(editor.document) }),
        });
        setStatus(res.ok ? "saved" : "error");
      } catch {
        setStatus("error");
      }
    }, AUTOSAVE_DELAY_MS);
  }

  return (
    <div className="mt-8">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        slashMenu={false}
        theme={isDark ? "dark" : "light"}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(getCustomSlashMenuItems(editor), query)
          }
        />
      </BlockNoteView>
      <p className="mt-2 h-4 text-xs text-zinc-400 dark:text-zinc-600">
        {status === "saving" && "저장 중..."}
        {status === "saved" && "저장됨"}
        {status === "error" && "저장하지 못했습니다."}
      </p>
    </div>
  );
}
