import { useState } from "react";
import type { DbView, ViewType } from "@nosion/shared";
import { useCreateView, useDeleteView, useUpdateView } from "../../api/views";

const VIEW_TYPES: { value: ViewType; label: string }[] = [
  { value: "table", label: "테이블" },
  { value: "board", label: "보드" },
  { value: "list", label: "리스트" },
];

export default function ViewSwitcher({
  pageId,
  views,
  activeViewId,
  onSelect,
}: {
  pageId: string;
  views: DbView[];
  activeViewId: string;
  onSelect: (viewId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<ViewType>("table");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const createView = useCreateView(pageId);
  const updateView = useUpdateView(pageId);
  const deleteView = useDeleteView(pageId);

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 pb-2 text-sm dark:border-gray-700">
      {views.map((view) =>
        renamingId === view.id ? (
          <input
            key={view.id}
            autoFocus
            defaultValue={view.name}
            className="rounded border border-gray-300 px-1 dark:bg-gray-900"
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value !== view.name) {
                updateView.mutate({ id: view.id, body: { name: e.target.value.trim() } });
              }
              setRenamingId(null);
            }}
          />
        ) : (
          <button
            key={view.id}
            onClick={() => onSelect(view.id)}
            onDoubleClick={() => setRenamingId(view.id)}
            className={`rounded px-2 py-1 ${
              activeViewId === view.id
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {view.name}
            {views.length > 1 && activeViewId === view.id && (
              <span
                role="button"
                className="ml-2 text-xs opacity-70"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteView.mutate(view.id);
                }}
              >
                ✕
              </span>
            )}
          </button>
        ),
      )}
      {adding ? (
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createView.mutate({ name: name.trim(), type });
            setName("");
            setAdding(false);
          }}
        >
          <input
            autoFocus
            className="rounded border border-gray-300 px-1 dark:bg-gray-900"
            placeholder="뷰 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="rounded border border-gray-300 dark:bg-gray-900"
            value={type}
            onChange={(e) => setType(e.target.value as ViewType)}
          >
            {VIEW_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded bg-gray-900 px-2 py-1 text-white dark:bg-gray-100 dark:text-gray-900">
            추가
          </button>
        </form>
      ) : (
        <button
          className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600"
          onClick={() => setAdding(true)}
        >
          + 뷰 추가
        </button>
      )}
    </div>
  );
}
