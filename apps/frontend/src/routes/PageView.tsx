import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { usePage, useUpdatePage } from "../api/pages";
import DocumentEditor from "../components/editor/DocumentEditor";
import DatabaseTable from "../components/database/DatabaseTable";
import RowPropertiesPanel from "../components/database/RowPropertiesPanel";

export default function PageView() {
  const { pageId } = useParams();
  const { data: page } = usePage(pageId);
  const updatePage = useUpdatePage();
  const [title, setTitle] = useState("");

  useEffect(() => {
    setTitle(page?.title ?? "");
  }, [page?.title]);

  if (!page || !pageId) {
    return <p className="p-4 text-sm text-gray-400">불러오는 중...</p>;
  }

  const commitTitle = () => {
    if (title.trim() && title !== page.title) {
      updatePage.mutate({ id: pageId, body: { title: title.trim() } });
    } else {
      setTitle(page.title);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <input
        className="w-full border-none bg-transparent text-3xl font-bold outline-none dark:text-gray-100"
        value={title}
        placeholder="제목 없음"
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      {page.isRow && page.parentId && (
        <RowPropertiesPanel databasePageId={page.parentId} rowPageId={pageId} />
      )}
      {page.type === "document" ? (
        <DocumentEditor pageId={pageId} />
      ) : (
        <DatabaseTable pageId={pageId} />
      )}
    </div>
  );
}
