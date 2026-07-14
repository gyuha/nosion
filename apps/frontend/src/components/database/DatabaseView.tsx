import { useState } from "react";
import { useDatabase } from "../../api/databases";
import ViewSwitcher from "./ViewSwitcher";
import FilterSortBar from "./FilterSortBar";
import DatabaseTable from "./DatabaseTable";
import BoardView from "./BoardView";
import ListView from "./ListView";
import { applyViewConfig } from "./viewUtils";

export default function DatabaseView({ pageId }: { pageId: string }) {
  const { data, isPending } = useDatabase(pageId);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  if (isPending || !data) {
    return <p className="mt-4 text-sm text-gray-400">불러오는 중...</p>;
  }

  const activeView = data.views.find((v) => v.id === activeViewId) ?? data.views[0];
  if (!activeView) return null;

  const displayedRows = applyViewConfig(data.rows, activeView.config);

  return (
    <div>
      <ViewSwitcher
        pageId={pageId}
        views={data.views}
        activeViewId={activeView.id}
        onSelect={setActiveViewId}
      />
      <FilterSortBar pageId={pageId} view={activeView} properties={data.properties} />
      {activeView.type === "table" && (
        <DatabaseTable pageId={pageId} properties={data.properties} rows={displayedRows} />
      )}
      {activeView.type === "board" && (
        <BoardView
          pageId={pageId}
          properties={data.properties}
          rows={displayedRows}
          groupPropertyId={activeView.config.groupPropertyId}
        />
      )}
      {activeView.type === "list" && (
        <ListView pageId={pageId} rows={displayedRows} />
      )}
    </div>
  );
}
