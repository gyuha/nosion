import { usePermanentlyDeletePage, useRestorePage, useTrash } from "../api/trash";

export default function Trash() {
  const { data, isPending } = useTrash();
  const restore = useRestorePage();
  const permanentlyDelete = usePermanentlyDeletePage();

  if (isPending) return <p className="p-4 text-sm text-gray-400">불러오는 중...</p>;

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-semibold">휴지통</h1>
      {(data ?? []).length === 0 ? (
        <p className="text-sm text-gray-500">휴지통이 비어 있습니다.</p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {(data ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {item.type === "database" ? "🗄️" : "📄"} {item.title}
              </span>
              <div className="flex gap-2">
                <button className="underline" onClick={() => restore.mutate(item.id)}>
                  복원
                </button>
                <button
                  className="text-red-600 underline"
                  onClick={() => permanentlyDelete.mutate(item.id)}
                >
                  영구 삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
