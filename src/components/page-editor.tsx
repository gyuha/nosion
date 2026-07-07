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

/** BlockNote는 브라우저 전용(window 접근)이라 하이드레이션 이후에만 true가 된다. */
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
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
  });
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
      <BlockNoteView editor={editor} onChange={handleChange} slashMenu={false}>
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
