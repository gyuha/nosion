import {
  BlockNoteSchema,
  defaultBlockSpecs,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core";
import {
  createReactBlockSpec,
  getDefaultReactSlashMenuItems,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";

/** 아이콘 + 배경색으로 강조하는 콜아웃 블록. 내부 텍스트는 자유롭게 편집할 수 있다. */
const calloutBlockSpec = createReactBlockSpec(
  {
    type: "callout",
    content: "inline",
    propSchema: {},
  },
  {
    render: (props) => (
      <div className="my-1 flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
        <div className="select-none text-lg leading-6" contentEditable={false}>
          💡
        </div>
        <div className="min-w-0 flex-1 leading-6" ref={props.contentRef} />
      </div>
    ),
  },
)();

/** 수평선 하나로만 이루어진, 편집 불가능한 구분선 블록. 기본 divider 블록을 대체한다. */
const dividerBlockSpec = createReactBlockSpec(
  {
    type: "divider",
    content: "none",
    propSchema: {},
  },
  {
    render: () => (
      <hr className="my-2 w-full border-t border-zinc-200 dark:border-zinc-700" />
    ),
  },
)();

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    callout: calloutBlockSpec,
    divider: dividerBlockSpec,
  },
});

/** 기본 슬래시 메뉴 항목에 "콜아웃" 항목을 추가로 등록한다. */
export function getCustomSlashMenuItems(
  editor: typeof schema.BlockNoteEditor,
): DefaultReactSuggestionItem[] {
  return [
    ...getDefaultReactSlashMenuItems(editor),
    {
      title: "콜아웃",
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, { type: "callout" }),
      subtext: "아이콘과 배경색으로 강조하는 박스",
      aliases: ["callout", "콜아웃", "강조", "박스", "알림"],
      group: "기타",
      icon: <span className="text-base">💡</span>,
    },
  ];
}
