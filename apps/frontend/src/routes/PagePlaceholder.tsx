import { useParams } from "react-router-dom";
import { usePage } from "../api/pages";

export default function PagePlaceholder() {
  const { pageId } = useParams();
  const { data: page } = usePage(pageId);

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold">{page?.title ?? "불러오는 중..."}</h1>
      <p className="mt-2 text-sm text-gray-500">
        {page?.type === "database"
          ? "데이터베이스 편집은 이후 태스크(F4)에서 구현됩니다."
          : "문서 편집은 이후 태스크(F3)에서 구현됩니다."}
      </p>
    </div>
  );
}
