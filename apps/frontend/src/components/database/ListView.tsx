import { useNavigate } from "react-router-dom";
import type { DbRow } from "@nosion/shared";
import { useCreateRow } from "../../api/databases";

export default function ListView({
  pageId,
  rows,
}: {
  pageId: string;
  rows: DbRow[];
}) {
  const navigate = useNavigate();
  const createRow = useCreateRow(pageId);

  return (
    <div className="mt-4">
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {rows.map((row) => (
          <li key={row.pageId}>
            <button
              className="w-full py-2 text-left text-sm hover:underline"
              onClick={() => navigate(`/page/${row.pageId}`)}
            >
              {row.title}
            </button>
          </li>
        ))}
      </ul>
      <button
        className="mt-2 text-xs text-gray-500 hover:text-gray-700"
        onClick={() => createRow.mutate()}
      >
        + 항목 추가
      </button>
    </div>
  );
}
