import { useDatabase, useUpdatePropertyValue } from "../../api/databases";
import PropertyValueCell from "./PropertyValueCell";

export default function RowPropertiesPanel({
  databasePageId,
  rowPageId,
}: {
  databasePageId: string;
  rowPageId: string;
}) {
  const { data, isPending } = useDatabase(databasePageId);
  const updateValue = useUpdatePropertyValue(databasePageId);

  if (isPending || !data) return null;
  const row = data.rows.find((r) => r.pageId === rowPageId);
  if (!row) return null;

  return (
    <div className="mb-4 space-y-1 border-b border-gray-200 pb-4 dark:border-gray-700">
      {data.properties.map((prop) => (
        <div key={prop.id} className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0 text-gray-500">{prop.name}</span>
          <PropertyValueCell
            property={prop}
            value={row.values[prop.id]}
            onChange={(value) =>
              updateValue.mutate({ rowPageId, propertyId: prop.id, value })
            }
          />
        </div>
      ))}
    </div>
  );
}
