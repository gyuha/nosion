import { useState } from "react";
import type { DbProperty } from "@nosion/shared";

// 체크박스는 순수 controlled(value prop 그대로 checked)로 두면, 클릭 직후 서버 응답을
// 기다리는 동안 무관한 쿼리 무효화로 리렌더되어 값이 순간적으로 되돌아가 보일 수 있다.
// 로컬 상태로 즉시 반영하고, 실제 저장은 그대로 onChange로 위임한다.
function CheckboxCell({
  initialValue,
  onChange,
}: {
  initialValue: boolean;
  onChange: (value: unknown) => void;
}) {
  const [checked, setChecked] = useState(initialValue);
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => {
        setChecked(e.target.checked);
        onChange(e.target.checked);
      }}
    />
  );
}

export default function PropertyValueCell({
  property,
  value,
  onChange,
}: {
  property: DbProperty;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (property.type) {
    case "text":
      return (
        <input
          className="w-full bg-transparent px-1 py-0.5 text-sm outline-none"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "number":
      return (
        <input
          type="number"
          className="w-full bg-transparent px-1 py-0.5 text-sm outline-none"
          value={typeof value === "number" ? value : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
        />
      );
    case "date":
      return (
        <input
          type="date"
          className="w-full bg-transparent px-1 py-0.5 text-sm outline-none"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "checkbox":
      return <CheckboxCell initialValue={Boolean(value)} onChange={onChange} />;
    case "select": {
      const options = property.config.options ?? [];
      return (
        <select
          className="w-full bg-transparent px-1 py-0.5 text-sm outline-none"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">(없음)</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    case "multi_select": {
      const options = property.config.options ?? [];
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-2 px-1 py-0.5 text-xs">
          {options.map((o) => (
            <label key={o.id} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={selected.includes(o.id)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, o.id]
                    : selected.filter((id) => id !== o.id);
                  onChange(next);
                }}
              />
              {o.label}
            </label>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}
