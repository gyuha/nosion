import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSearch } from "../../api/search";

export default function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data } = useSearch(query);
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) {
    return (
      <button
        aria-label="검색 열기"
        className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={() => setOpen(true)}
      >
        🔍 검색 (⌘K)
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl dark:bg-gray-800">
        <input
          autoFocus
          className="w-full rounded border border-gray-300 px-3 py-2 outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          placeholder="페이지 제목·본문 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="mt-2 max-h-80 overflow-y-auto">
          {(data?.results ?? []).map((r) => (
            <li key={r.pageId}>
              <button
                className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => {
                  navigate(`/page/${r.pageId}`);
                  setOpen(false);
                  setQuery("");
                }}
              >
                {r.type === "database" ? "🗄️" : "📄"} {r.title}
              </button>
            </li>
          ))}
          {query.trim() && (data?.results ?? []).length === 0 && (
            <li className="px-2 py-2 text-sm text-gray-400">검색 결과가 없습니다</li>
          )}
        </ul>
      </div>
    </div>
  );
}
