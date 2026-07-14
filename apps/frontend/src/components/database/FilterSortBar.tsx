import type { DbProperty, DbView } from "@nosion/shared";
import { useUpdateView } from "../../api/views";

export default function FilterSortBar({
  pageId,
  view,
  properties,
}: {
  pageId: string;
  view: DbView;
  properties: DbProperty[];
}) {
  const updateView = useUpdateView(pageId);
  const filterRule = view.config.filter?.[0];
  const sortRule = view.config.sort;

  return (
    <div className="flex flex-wrap items-center gap-4 py-2 text-xs text-gray-600 dark:text-gray-300">
      <label className="flex items-center gap-1">
        필터:
        <select
          className="rounded border border-gray-300 dark:bg-gray-900"
          value={filterRule?.propertyId ?? ""}
          onChange={(e) => {
            const propertyId = e.target.value;
            updateView.mutate({
              id: view.id,
              body: {
                config: {
                  ...view.config,
                  filter: propertyId ? [{ propertyId, value: "" }] : undefined,
                },
              },
            });
          }}
        >
          <option value="">(없음)</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {filterRule && (
          <input
            className="w-24 rounded border border-gray-300 px-1 dark:bg-gray-900"
            placeholder="값 포함"
            defaultValue={String(filterRule.value ?? "")}
            onBlur={(e) =>
              updateView.mutate({
                id: view.id,
                body: {
                  config: {
                    ...view.config,
                    filter: [{ propertyId: filterRule.propertyId, value: e.target.value }],
                  },
                },
              })
            }
          />
        )}
      </label>

      <label className="flex items-center gap-1">
        정렬:
        <select
          className="rounded border border-gray-300 dark:bg-gray-900"
          value={sortRule?.propertyId ?? ""}
          onChange={(e) => {
            const propertyId = e.target.value;
            updateView.mutate({
              id: view.id,
              body: {
                config: {
                  ...view.config,
                  sort: propertyId
                    ? { propertyId, direction: sortRule?.direction ?? "asc" }
                    : undefined,
                },
              },
            });
          }}
        >
          <option value="">(없음)</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {sortRule && (
          <select
            className="rounded border border-gray-300 dark:bg-gray-900"
            value={sortRule.direction}
            onChange={(e) =>
              updateView.mutate({
                id: view.id,
                body: {
                  config: {
                    ...view.config,
                    sort: {
                      propertyId: sortRule.propertyId,
                      direction: e.target.value as "asc" | "desc",
                    },
                  },
                },
              })
            }
          >
            <option value="asc">오름차순</option>
            <option value="desc">내림차순</option>
          </select>
        )}
      </label>

      {view.type === "board" && (
        <label className="flex items-center gap-1">
          그룹 기준:
          <select
            className="rounded border border-gray-300 dark:bg-gray-900"
            value={view.config.groupPropertyId ?? ""}
            onChange={(e) =>
              updateView.mutate({
                id: view.id,
                body: {
                  config: { ...view.config, groupPropertyId: e.target.value || undefined },
                },
              })
            }
          >
            <option value="">(없음)</option>
            {properties
              .filter((p) => p.type === "select")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
      )}
    </div>
  );
}
