import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DbProperty, DbRow, PropertyType } from "@nosion/shared";
import {
  useCreateProperty,
  useCreateRow,
  useDeleteProperty,
  useDeleteRow,
  useUpdateProperty,
  useUpdatePropertyValue,
} from "../../api/databases";
import PropertyValueCell from "./PropertyValueCell";

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "text", label: "텍스트" },
  { value: "number", label: "숫자" },
  { value: "select", label: "셀렉트" },
  { value: "multi_select", label: "다중 셀렉트" },
  { value: "date", label: "날짜" },
  { value: "checkbox", label: "체크박스" },
];

function parseOptions(input: string) {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((label, i) => ({ id: `opt-${i}-${label}`, label }));
}

function AddPropertyForm({ pageId }: { pageId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<PropertyType>("text");
  const [optionsText, setOptionsText] = useState("");
  const createProperty = useCreateProperty(pageId);

  if (!open) {
    return (
      <button
        className="px-2 text-xs text-gray-400 hover:text-gray-600"
        onClick={() => setOpen(true)}
      >
        + 속성 추가
      </button>
    );
  }

  const needsOptions = type === "select" || type === "multi_select";

  return (
    <form
      className="flex flex-wrap items-center gap-2 rounded border border-gray-200 p-2 text-xs dark:border-gray-700"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        createProperty.mutate({
          name: name.trim(),
          type,
          config: needsOptions ? { options: parseOptions(optionsText) } : undefined,
        });
        setName("");
        setOptionsText("");
        setOpen(false);
      }}
    >
      <input
        className="rounded border border-gray-300 px-1 dark:bg-gray-900"
        placeholder="속성 이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <select
        className="rounded border border-gray-300 dark:bg-gray-900"
        value={type}
        onChange={(e) => setType(e.target.value as PropertyType)}
      >
        {PROPERTY_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      {needsOptions && (
        <input
          className="rounded border border-gray-300 px-1 dark:bg-gray-900"
          placeholder="옵션(쉼표로 구분)"
          value={optionsText}
          onChange={(e) => setOptionsText(e.target.value)}
        />
      )}
      <button type="submit" className="rounded bg-gray-900 px-2 py-1 text-white dark:bg-gray-100 dark:text-gray-900">
        추가
      </button>
    </form>
  );
}

export default function DatabaseTable({
  pageId,
  properties,
  rows,
}: {
  pageId: string;
  properties: DbProperty[];
  rows: DbRow[];
}) {
  const navigate = useNavigate();
  const updateProperty = useUpdateProperty(pageId);
  const deleteProperty = useDeleteProperty(pageId);
  const createRow = useCreateRow(pageId);
  const deleteRow = useDeleteRow(pageId);
  const updateValue = useUpdatePropertyValue(pageId);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  return (
    <div className="mt-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {properties.map((prop) => (
              <th
                key={prop.id}
                className="relative border border-gray-200 p-1 text-left font-medium dark:border-gray-700"
              >
                <button onClick={() => setMenuFor(menuFor === prop.id ? null : prop.id)}>
                  {prop.name}
                </button>
                {menuFor === prop.id && (
                  <div className="absolute left-0 top-full z-10 w-48 rounded border border-gray-200 bg-white p-2 text-xs shadow-md dark:border-gray-700 dark:bg-gray-800">
                    <input
                      className="mb-1 w-full rounded border border-gray-300 px-1 dark:bg-gray-900"
                      defaultValue={prop.name}
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value !== prop.name) {
                          updateProperty.mutate({
                            id: prop.id,
                            body: { name: e.target.value.trim() },
                          });
                        }
                      }}
                    />
                    <select
                      className="mb-1 w-full rounded border border-gray-300 dark:bg-gray-900"
                      value={prop.type}
                      onChange={(e) =>
                        updateProperty.mutate({
                          id: prop.id,
                          body: { type: e.target.value as PropertyType },
                        })
                      }
                    >
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="w-full rounded bg-red-50 px-2 py-1 text-left text-red-600 dark:bg-red-950"
                      onClick={() => {
                        deleteProperty.mutate(prop.id);
                        setMenuFor(null);
                      }}
                    >
                      속성 삭제
                    </button>
                  </div>
                )}
              </th>
            ))}
            <th className="border border-gray-200 p-1 dark:border-gray-700">
              <AddPropertyForm pageId={pageId} />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.pageId}>
              {properties.map((prop) => (
                <td key={prop.id} className="border border-gray-200 p-0 dark:border-gray-700">
                  <PropertyValueCell
                    property={prop}
                    value={row.values[prop.id]}
                    onChange={(value) =>
                      updateValue.mutate({ rowPageId: row.pageId, propertyId: prop.id, value })
                    }
                  />
                </td>
              ))}
              <td className="border border-gray-200 p-1 text-xs dark:border-gray-700">
                <button className="mr-2 underline" onClick={() => navigate(`/page/${row.pageId}`)}>
                  열기
                </button>
                <button
                  className="text-red-600 underline"
                  onClick={() => deleteRow.mutate(row.pageId)}
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="mt-2 text-xs text-gray-500 hover:text-gray-700"
        onClick={() => createRow.mutate()}
      >
        + 행 추가
      </button>
    </div>
  );
}
