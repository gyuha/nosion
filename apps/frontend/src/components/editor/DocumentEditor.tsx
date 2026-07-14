import { useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useDocumentContent, useSaveDocumentContent } from "../../api/documents";

const AUTO_SAVE_DELAY_MS = 800;

export default function DocumentEditor({ pageId }: { pageId: string }) {
  const { data, isPending } = useDocumentContent(pageId);
  const saveContent = useSaveDocumentContent(pageId);
  const [saveError, setSaveError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  if (isPending) {
    return <p className="p-4 text-sm text-gray-400">불러오는 중...</p>;
  }

  const initialBlocks = data?.content as Block[] | undefined;

  return (
    <EditorBody
      key={pageId}
      initialBlocks={
        initialBlocks && initialBlocks.length > 0 ? initialBlocks : undefined
      }
      onChangeBlocks={(blocks) => {
        setSaveError(false);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          saveContent.mutate(blocks, {
            onError: () => setSaveError(true),
          });
        }, AUTO_SAVE_DELAY_MS);
      }}
      saveError={saveError}
    />
  );
}

function EditorBody({
  initialBlocks,
  onChangeBlocks,
  saveError,
}: {
  initialBlocks: Block[] | undefined;
  onChangeBlocks: (blocks: Block[]) => void;
  saveError: boolean;
}) {
  const editor = useCreateBlockNote({ initialContent: initialBlocks });

  return (
    <div>
      {saveError && (
        <p className="px-4 pt-2 text-xs text-red-600">
          저장에 실패했습니다. 다시 시도해 주세요.
        </p>
      )}
      <BlockNoteView
        editor={editor}
        onChange={() => onChangeBlocks(editor.document)}
      />
    </div>
  );
}
