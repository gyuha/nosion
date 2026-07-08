"use client";

import { useState } from "react";
import type { RowValues } from "@/lib/databases-api";
import { PropertyCell, type DatabaseProperty } from "@/components/database-table";

const JSON_HEADERS = { "Content-Type": "application/json" };

function omitKey(values: RowValues, key: string): RowValues {
  const rest = { ...values };
  delete rest[key];
  return rest;
}

/** 데이터베이스 행 페이지 상단에 표시되는 속성 값 편집 패널. 타입별 에디터는 DatabaseTable과 동일한 것을 재사용한다. */
export default function RowPropertiesPanel({
  databasePageId,
  rowId,
  properties,
  initialValues,
}: {
  databasePageId: string;
  rowId: string;
  properties: DatabaseProperty[];
  initialValues: RowValues;
}) {
  const [values, setValues] = useState<RowValues>(initialValues);

  async function updateValue(propertyId: string, value: unknown) {
    const prevValues = values;
    const nextValues =
      value === null
        ? omitKey(prevValues, propertyId)
        : { ...prevValues, [propertyId]: value };
    setValues(nextValues);
    const res = await fetch(`/api/databases/${databasePageId}/rows/${rowId}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ values: { [propertyId]: value } }),
    });
    if (!res.ok) {
      alert("값을 저장하지 못했습니다.");
      setValues(prevValues);
      return;
    }
    const { row } = (await res.json()) as { row: { values: RowValues } };
    setValues(row.values);
  }

  if (properties.length === 0) return null;

  return (
    <div className="mt-6 divide-y divide-zinc-100 border-b border-zinc-100 pb-2 dark:divide-zinc-900 dark:border-zinc-900">
      {properties.map((property) => (
        <div key={property.id} className="flex items-center gap-3 py-1">
          <span className="w-32 shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
            {property.name}
          </span>
          <div className="min-w-0 flex-1 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900">
            <PropertyCell
              property={property}
              value={values[property.id]}
              onCommit={(value) => void updateValue(property.id, value)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
