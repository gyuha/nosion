import { useNavigate } from "react-router-dom";
import type { DbProperty, DbRow } from "@nosion/shared";
import { useCreateRow, useUpdatePropertyValue } from "../../api/databases";

const UNASSIGNED = "__unassigned__";

export default function BoardView({
  pageId,
  properties,
  rows,
  groupPropertyId,
}: {
  pageId: string;
  properties: DbProperty[];
  rows: DbRow[];
  groupPropertyId: string | undefined;
}) {
  const navigate = useNavigate();
  const createRow = useCreateRow(pageId);
  const updateValue = useUpdatePropertyValue(pageId);

  const groupProperty = properties.find(
    (p) => p.id === groupPropertyId && p.type === "select",
  );

  if (!groupProperty) {
    return (
      <p className="mt-4 text-sm text-gray-500">
        보드 뷰는 그룹 기준으로 쓸 셀렉트 속성이 필요합니다. 먼저 테이블 뷰에서 셀렉트
        속성을 만들고, 뷰 설정에서 그룹 기준으로 지정해 주세요.
      </p>
    );
  }

  const options = groupProperty.config.options ?? [];
  const columns = [...options.map((o) => ({ id: o.id, label: o.label })), {
    id: UNASSIGNED,
    label: "미지정",
  }];

  const rowsByColumn = new Map<string, DbRow[]>();
  for (const row of rows) {
    const value = (row.values[groupProperty.id] as string | undefined) ?? UNASSIGNED;
    const list = rowsByColumn.get(value) ?? [];
    list.push(row);
    rowsByColumn.set(value, list);
  }

  return (
    <div className="mt-4 flex gap-4 overflow-x-auto">
      {columns.map((col) => (
        <div
          key={col.id}
          className="w-56 shrink-0 rounded border border-gray-200 p-2 dark:border-gray-700"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const rowPageId = e.dataTransfer.getData("text/row-page-id");
            if (!rowPageId) return;
            updateValue.mutate({
              rowPageId,
              propertyId: groupProperty.id,
              value: col.id === UNASSIGNED ? null : col.id,
            });
          }}
        >
          <div className="mb-2 text-xs font-semibold text-gray-500">{col.label}</div>
          <div className="space-y-2">
            {(rowsByColumn.get(col.id) ?? []).map((row) => (
              <div
                key={row.pageId}
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/row-page-id", row.pageId)
                }
                className="cursor-move rounded border border-gray-200 bg-white p-2 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-800"
                onClick={() => navigate(`/page/${row.pageId}`)}
              >
                {row.title}
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        className="h-fit shrink-0 text-xs text-gray-500 hover:text-gray-700"
        onClick={() => createRow.mutate()}
      >
        + 카드 추가
      </button>
    </div>
  );
}
