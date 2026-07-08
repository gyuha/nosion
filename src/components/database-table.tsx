"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type {
  OptionColor,
  PropertyOption,
  PropertyRow,
  PropertyType,
  RowValues,
  RowWithPage,
} from "@/lib/databases-api";
import { PAGES_CHANGED_EVENT } from "@/components/sidebar";

const JSON_HEADERS = { "Content-Type": "application/json" };

export type DatabaseProperty = Omit<PropertyRow, "options"> & {
  options: PropertyOption[];
};

const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: "text", label: "텍스트" },
  { value: "number", label: "숫자" },
  { value: "select", label: "셀렉트" },
  { value: "multiSelect", label: "다중 셀렉트" },
  { value: "date", label: "날짜" },
  { value: "checkbox", label: "체크박스" },
];

const OPTION_COLOR_STYLES: Record<OptionColor, string> = {
  gray: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
  brown: "bg-[#e9dfd4] text-[#8b5e3c] dark:bg-[#4a3a2c] dark:text-[#e6c9a8]",
  orange:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300",
  yellow:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/60 dark:text-yellow-300",
  green:
    "bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
  purple:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/60 dark:text-pink-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300",
};
const OPTION_COLOR_LIST = Object.keys(OPTION_COLOR_STYLES) as OptionColor[];

function omitKey(values: RowValues, key: string): RowValues {
  const rest = { ...values };
  delete rest[key];
  return rest;
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M8 3a.75.75 0 0 1 .75.75v3.5h3.5a.75.75 0 0 1 0 1.5h-3.5v3.5a.75.75 0 0 1-1.5 0v-3.5h-3.5a.75.75 0 0 1 0-1.5h3.5v-3.5A.75.75 0 0 1 8 3z" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <circle cx="3" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="13" cy="8" r="1.5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M6.5 2a1 1 0 0 0-1 1v.5H3a.75.75 0 0 0 0 1.5h.4l.6 8.1A1.5 1.5 0 0 0 5.5 14.5h5a1.5 1.5 0 0 0 1.5-1.4l.6-8.1h.4a.75.75 0 0 0 0-1.5h-2.5V3a1 1 0 0 0-1-1h-3zm0 1.5h3V3.5h-3v0zM5.9 5h4.2l-.57 7.5H6.47L5.9 5z" />
    </svg>
  );
}

function OpenPageIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
      <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H8A.75.75 0 0 0 8 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V8a.75.75 0 0 0-1.5 0v3.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
    </svg>
  );
}

function OptionBadge({ option }: { option: PropertyOption }) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded px-1.5 py-0.5 text-xs font-medium ${OPTION_COLOR_STYLES[option.color]}`}
    >
      {option.name}
    </span>
  );
}

function TextCell({
  value,
  onCommit,
  allowEmpty = true,
  placeholder = "비어 있음",
  maxLength,
}: {
  value: string | undefined;
  onCommit: (value: string | null) => void;
  allowEmpty?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  const [text, setText] = useState(value ?? "");

  function commit() {
    const trimmed = text.trim();
    if (trimmed === "") {
      if (!allowEmpty) {
        setText(value ?? "");
        return;
      }
      if (value !== undefined) onCommit(null);
      return;
    }
    if (trimmed !== (value ?? "")) onCommit(trimmed);
  }

  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full min-w-0 bg-transparent px-2 py-1.5 text-sm text-zinc-900 outline-none focus:bg-zinc-50 dark:text-zinc-100 dark:focus:bg-zinc-900"
    />
  );
}

function NumberCell({
  value,
  onCommit,
}: {
  value: number | undefined;
  onCommit: (value: number | null) => void;
}) {
  const [text, setText] = useState(value !== undefined ? String(value) : "");

  function commit() {
    const trimmed = text.trim();
    if (trimmed === "") {
      if (value !== undefined) onCommit(null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setText(value !== undefined ? String(value) : "");
      return;
    }
    if (parsed !== value) onCommit(parsed);
  }

  return (
    <input
      type="number"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      placeholder="비어 있음"
      className="w-full min-w-0 bg-transparent px-2 py-1.5 text-sm text-zinc-900 outline-none focus:bg-zinc-50 dark:text-zinc-100 dark:focus:bg-zinc-900"
    />
  );
}

function CheckboxCell({
  value,
  onCommit,
}: {
  value: boolean | undefined;
  onCommit: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-center px-2 py-1.5">
      <input
        type="checkbox"
        checked={value ?? false}
        onChange={(e) => onCommit(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
      />
    </div>
  );
}

function DateCell({
  value,
  onCommit,
}: {
  value: string | undefined;
  onCommit: (value: string | null) => void;
}) {
  return (
    <input
      type="date"
      value={value ?? ""}
      onChange={(e) => onCommit(e.target.value === "" ? null : e.target.value)}
      className="w-full min-w-0 bg-transparent px-2 py-1.5 text-sm text-zinc-900 outline-none focus:bg-zinc-50 dark:text-zinc-100 dark:[color-scheme:dark] dark:focus:bg-zinc-900"
    />
  );
}

function SelectCell({
  options,
  value,
  onCommit,
}: {
  options: PropertyOption[];
  value: string | undefined;
  onCommit: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-8 w-full items-center px-2 py-1 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        {current ? (
          <OptionBadge option={current} />
        ) : (
          <span className="text-sm text-zinc-300 dark:text-zinc-600">비어 있음</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 w-48 rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {options.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-zinc-400">
                옵션이 없습니다. 열 메뉴에서 옵션을 추가하세요.
              </p>
            )}
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onCommit(option.id === value ? null : option.id);
                }}
                className="flex w-full items-center rounded px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <OptionBadge option={option} />
              </button>
            ))}
            {value && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onCommit(null);
                }}
                className="mt-1 block w-full rounded px-2 py-1.5 text-left text-xs text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                값 지우기
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MultiSelectCell({
  options,
  value,
  onCommit,
}: {
  options: PropertyOption[];
  value: string[] | undefined;
  onCommit: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedIds = value ?? [];
  const selected = options.filter((option) => selectedIds.includes(option.id));

  function toggle(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((v) => v !== id)
      : [...selectedIds, id];
    onCommit(next);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-8 w-full flex-wrap items-center gap-1 px-2 py-1 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        {selected.length > 0 ? (
          selected.map((option) => <OptionBadge key={option.id} option={option} />)
        ) : (
          <span className="text-sm text-zinc-300 dark:text-zinc-600">비어 있음</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 w-48 rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {options.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-zinc-400">
                옵션이 없습니다. 열 메뉴에서 옵션을 추가하세요.
              </p>
            )}
            {options.map((option) => (
              <label
                key={option.id}
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(option.id)}
                  onChange={() => toggle(option.id)}
                  className="h-3.5 w-3.5"
                />
                <OptionBadge option={option} />
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function PropertyCell({
  property,
  value,
  onCommit,
}: {
  property: DatabaseProperty;
  value: unknown;
  onCommit: (value: unknown) => void;
}) {
  switch (property.type) {
    case "text":
      return <TextCell value={value as string | undefined} onCommit={onCommit} />;
    case "number":
      return <NumberCell value={value as number | undefined} onCommit={onCommit} />;
    case "checkbox":
      return (
        <CheckboxCell value={value as boolean | undefined} onCommit={onCommit} />
      );
    case "date":
      return <DateCell value={value as string | undefined} onCommit={onCommit} />;
    case "select":
      return (
        <SelectCell
          options={property.options}
          value={value as string | undefined}
          onCommit={onCommit}
        />
      );
    case "multiSelect":
      return (
        <MultiSelectCell
          options={property.options}
          value={value as string[] | undefined}
          onCommit={onCommit}
        />
      );
    default:
      return null;
  }
}

function AddOptionPopover({
  onAdd,
  onClose,
}: {
  onAdd: (name: string, color: OptionColor) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<OptionColor>("gray");

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-6 z-20 w-56 rounded-md border border-zinc-200 bg-white p-3 text-left shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          새 옵션 추가
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="옵션 이름"
          className="mb-2 w-full rounded border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <div className="mb-3 flex flex-wrap gap-1.5">
          {OPTION_COLOR_LIST.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => setColor(c)}
              className={`h-5 w-5 rounded-full ${OPTION_COLOR_STYLES[c].split(" ")[0]} ${
                color === c ? "ring-2 ring-offset-1 ring-blue-500" : ""
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          disabled={name.trim() === ""}
          onClick={() => {
            if (name.trim()) onAdd(name.trim(), color);
          }}
          className="w-full rounded bg-zinc-900 px-2 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          추가
        </button>
      </div>
    </>
  );
}

function ColumnHeader({
  property,
  onRename,
  onDelete,
  onAddOption,
}: {
  property: DatabaseProperty;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddOption: (name: string, color: OptionColor) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [managingOptions, setManagingOptions] = useState(false);
  const canHaveOptions = property.type === "select" || property.type === "multiSelect";

  if (renaming) {
    return (
      <input
        autoFocus
        defaultValue={property.name}
        maxLength={100}
        onBlur={(e) => {
          setRenaming(false);
          const next = e.currentTarget.value.trim();
          if (next && next !== property.name) onRename(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setRenaming(false);
        }}
        className="w-full rounded border border-blue-400 bg-white px-1 py-0.5 text-xs font-medium text-zinc-900 outline-none dark:bg-zinc-900 dark:text-zinc-50"
      />
    );
  }

  return (
    <div className="relative flex items-center justify-between gap-1">
      <span className="truncate">{property.name}</span>
      <button
        type="button"
        aria-label="속성 메뉴"
        title="속성 메뉴"
        onClick={() => setMenuOpen((v) => !v)}
        className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
      >
        <DotsIcon />
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-6 z-20 w-40 overflow-hidden rounded-md border border-zinc-200 bg-white py-1 text-left text-xs font-normal shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setRenaming(true);
              }}
              className="block w-full px-3 py-1.5 text-left text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              이름 바꾸기
            </button>
            {canHaveOptions && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setManagingOptions(true);
                }}
                className="block w-full px-3 py-1.5 text-left text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                옵션 추가
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
              className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              속성 삭제
            </button>
          </div>
        </>
      )}
      {managingOptions && (
        <AddOptionPopover
          onClose={() => setManagingOptions(false)}
          onAdd={(name, color) => {
            onAddOption(name, color);
            setManagingOptions(false);
          }}
        />
      )}
    </div>
  );
}

function AddColumnPopover({
  onAdd,
  onClose,
}: {
  onAdd: (name: string, type: PropertyType) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PropertyType>("text");

  function submit() {
    if (name.trim()) onAdd(name.trim(), type);
  }

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute left-0 top-8 z-20 w-56 rounded-md border border-zinc-200 bg-white p-3 text-left shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="속성 이름"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          className="mb-2 w-full rounded border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as PropertyType)}
          className="mb-3 w-full rounded border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        >
          {PROPERTY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={name.trim() === ""}
          onClick={submit}
          className="w-full rounded bg-zinc-900 px-2 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          속성 추가
        </button>
      </div>
    </>
  );
}

// ---------- 필터/정렬 ----------

type FilterOp =
  | "text_contains"
  | "number_eq"
  | "number_neq"
  | "number_gt"
  | "number_gte"
  | "number_lt"
  | "number_lte"
  | "select_eq"
  | "multi_select_contains"
  | "checkbox_eq"
  | "date_eq"
  | "date_before"
  | "date_after";

type FilterRule = {
  id: string;
  propertyId: string;
  op: FilterOp;
  value: unknown;
};

type SortRule = { propertyId: string; direction: "asc" | "desc" } | null;

type DatabaseViewState = { filters: FilterRule[]; sort: SortRule };

const FILTER_OPS_BY_TYPE: Record<PropertyType, { op: FilterOp; label: string }[]> = {
  text: [{ op: "text_contains", label: "포함" }],
  number: [
    { op: "number_eq", label: "=" },
    { op: "number_neq", label: "≠" },
    { op: "number_gt", label: ">" },
    { op: "number_gte", label: "≥" },
    { op: "number_lt", label: "<" },
    { op: "number_lte", label: "≤" },
  ],
  select: [{ op: "select_eq", label: "값 일치" }],
  multiSelect: [{ op: "multi_select_contains", label: "포함" }],
  checkbox: [{ op: "checkbox_eq", label: "상태 일치" }],
  date: [
    { op: "date_eq", label: "날짜 일치" },
    { op: "date_before", label: "이전" },
    { op: "date_after", label: "이후" },
  ],
};

function defaultFilterValue(property: DatabaseProperty, op: FilterOp): unknown {
  switch (op) {
    case "select_eq":
    case "multi_select_contains":
      return property.options[0]?.id ?? "";
    case "checkbox_eq":
      return true;
    default:
      return "";
  }
}

function viewStorageKey(databasePageId: string) {
  return `nosion:db-view:${databasePageId}`;
}

// 같은 탭에서 localStorage를 갱신했을 때 useSyncExternalStore 구독자에게 알리기 위한 이벤트.
const DB_VIEW_CHANGED_EVENT = "nosion:db-view-changed";
const EMPTY_VIEW_STATE: DatabaseViewState = { filters: [], sort: null };
// raw 문자열이 그대로면 같은 객체 참조를 반환해 useSyncExternalStore의 무한 렌더를 막는다.
const viewStateCache = new Map<string, { raw: string | null; value: DatabaseViewState }>();

function parseViewState(raw: string | null): DatabaseViewState {
  if (!raw) return EMPTY_VIEW_STATE;
  try {
    const parsed = JSON.parse(raw) as Partial<DatabaseViewState> | null;
    const filters = Array.isArray(parsed?.filters)
      ? (parsed.filters as FilterRule[])
      : [];
    const sort =
      parsed?.sort && typeof parsed.sort === "object"
        ? (parsed.sort as SortRule)
        : null;
    return { filters, sort };
  } catch {
    return EMPTY_VIEW_STATE;
  }
}

/** 필터/정렬 설정을 localStorage에서 읽는다. 새로고침 후에도 유지하기 위함이다. */
function readViewState(databasePageId: string): DatabaseViewState {
  const raw = window.localStorage.getItem(viewStorageKey(databasePageId));
  const cached = viewStateCache.get(databasePageId);
  if (cached && cached.raw === raw) return cached.value;
  const value = parseViewState(raw);
  viewStateCache.set(databasePageId, { raw, value });
  return value;
}

function writeViewState(databasePageId: string, state: DatabaseViewState) {
  try {
    window.localStorage.setItem(viewStorageKey(databasePageId), JSON.stringify(state));
  } catch {
    // localStorage를 사용할 수 없으면 조용히 무시한다.
  }
  window.dispatchEvent(new Event(DB_VIEW_CHANGED_EVENT));
}

function subscribeViewState(callback: () => void) {
  window.addEventListener(DB_VIEW_CHANGED_EVENT, callback);
  return () => window.removeEventListener(DB_VIEW_CHANGED_EVENT, callback);
}

/** 데이터베이스 페이지별 필터/정렬 설정을 localStorage와 동기화하는 훅. */
function useDatabaseViewState(databasePageId: string) {
  const state = useSyncExternalStore(
    subscribeViewState,
    () => readViewState(databasePageId),
    () => EMPTY_VIEW_STATE,
  );

  const setFilters = useCallback(
    (updater: FilterRule[] | ((prev: FilterRule[]) => FilterRule[])) => {
      const prev = readViewState(databasePageId);
      const nextFilters = typeof updater === "function" ? updater(prev.filters) : updater;
      writeViewState(databasePageId, { ...prev, filters: nextFilters });
    },
    [databasePageId],
  );

  const setSort = useCallback(
    (updater: SortRule | ((prev: SortRule) => SortRule)) => {
      const prev = readViewState(databasePageId);
      const nextSort =
        typeof updater === "function"
          ? (updater as (prevSort: SortRule) => SortRule)(prev.sort)
          : updater;
      writeViewState(databasePageId, { ...prev, sort: nextSort });
    },
    [databasePageId],
  );

  return { filters: state.filters, sort: state.sort, setFilters, setSort };
}

/** 행 값이 필터 규칙과 일치하는지 검사한다. 필터 값이 아직 입력되지 않았으면 통과시킨다. */
function matchesFilterRule(value: unknown, rule: FilterRule): boolean {
  switch (rule.op) {
    case "text_contains": {
      const query =
        typeof rule.value === "string" ? rule.value.trim().toLowerCase() : "";
      if (query === "") return true;
      const text = typeof value === "string" ? value.toLowerCase() : "";
      return text.includes(query);
    }
    case "number_eq":
    case "number_neq":
    case "number_gt":
    case "number_gte":
    case "number_lt":
    case "number_lte": {
      if (typeof rule.value !== "number" || !Number.isFinite(rule.value)) return true;
      if (typeof value !== "number") return false;
      switch (rule.op) {
        case "number_eq":
          return value === rule.value;
        case "number_neq":
          return value !== rule.value;
        case "number_gt":
          return value > rule.value;
        case "number_gte":
          return value >= rule.value;
        case "number_lt":
          return value < rule.value;
        case "number_lte":
          return value <= rule.value;
        default:
          return true;
      }
    }
    case "select_eq": {
      if (typeof rule.value !== "string" || rule.value === "") return true;
      return value === rule.value;
    }
    case "multi_select_contains": {
      if (typeof rule.value !== "string" || rule.value === "") return true;
      return Array.isArray(value) && value.includes(rule.value);
    }
    case "checkbox_eq": {
      return Boolean(value) === (rule.value === true);
    }
    case "date_eq":
    case "date_before":
    case "date_after": {
      if (typeof rule.value !== "string" || rule.value === "") return true;
      if (typeof value !== "string") return false;
      const target = Date.parse(rule.value);
      const current = Date.parse(value);
      if (Number.isNaN(target) || Number.isNaN(current)) return false;
      if (rule.op === "date_eq") return current === target;
      if (rule.op === "date_before") return current < target;
      return current > target;
    }
    default:
      return true;
  }
}

/** 정렬 비교용 키를 계산한다. 값이 비어 있으면 정렬 방향과 무관하게 항상 뒤로 보낸다. */
function getSortKey(
  property: DatabaseProperty,
  value: unknown,
): { empty: boolean; key: string | number } {
  switch (property.type) {
    case "text":
      return typeof value === "string" && value !== ""
        ? { empty: false, key: value.toLowerCase() }
        : { empty: true, key: "" };
    case "number":
      return typeof value === "number"
        ? { empty: false, key: value }
        : { empty: true, key: 0 };
    case "checkbox":
      return { empty: false, key: value === true ? 1 : 0 };
    case "date": {
      const time = typeof value === "string" ? Date.parse(value) : NaN;
      return Number.isNaN(time) ? { empty: true, key: 0 } : { empty: false, key: time };
    }
    case "select": {
      const option =
        typeof value === "string"
          ? property.options.find((o) => o.id === value)
          : undefined;
      return option
        ? { empty: false, key: option.name.toLowerCase() }
        : { empty: true, key: "" };
    }
    case "multiSelect": {
      if (!Array.isArray(value) || value.length === 0) return { empty: true, key: "" };
      const names = property.options
        .filter((o) => value.includes(o.id))
        .map((o) => o.name.toLowerCase())
        .sort();
      return names.length > 0
        ? { empty: false, key: names.join(",") }
        : { empty: true, key: "" };
    }
    default:
      return { empty: true, key: "" };
  }
}

function sortRows(
  targetRows: RowWithPage[],
  property: DatabaseProperty,
  direction: "asc" | "desc",
): RowWithPage[] {
  return targetRows
    .map((row) => ({ row, sortKey: getSortKey(property, row.values[property.id]) }))
    .sort((a, b) => {
      if (a.sortKey.empty !== b.sortKey.empty) return a.sortKey.empty ? 1 : -1;
      if (a.sortKey.empty) return 0;
      const cmp =
        typeof a.sortKey.key === "number" && typeof b.sortKey.key === "number"
          ? a.sortKey.key - b.sortKey.key
          : String(a.sortKey.key).localeCompare(String(b.sortKey.key));
      return direction === "asc" ? cmp : -cmp;
    })
    .map((entry) => entry.row);
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M2 3.75A.75.75 0 0 1 2.75 3h10.5a.75.75 0 0 1 .6 1.2L9.5 9.5v3.75a.75.75 0 0 1-1.1.66l-2-1.1a.75.75 0 0 1-.4-.66V9.5L2.15 4.2A.75.75 0 0 1 2 3.75z" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M4.5 2.5a.75.75 0 0 1 .75.75v7.69l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72V3.25A.75.75 0 0 1 4.5 2.5zM11.5 13.5a.75.75 0 0 1-.75-.75V5.06L9.03 6.78a.75.75 0 0 1-1.06-1.06l3-3a.75.75 0 0 1 1.06 0l3 3a.75.75 0 1 1-1.06 1.06L12.25 5.06v7.69a.75.75 0 0 1-.75.75z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M3.28 3.28a.75.75 0 0 1 1.06 0L8 6.94l3.66-3.66a.75.75 0 1 1 1.06 1.06L9.06 8l3.66 3.66a.75.75 0 1 1-1.06 1.06L8 9.06l-3.66 3.66a.75.75 0 0 1-1.06-1.06L6.94 8 3.28 4.34a.75.75 0 0 1 0-1.06z" />
    </svg>
  );
}

function FilterValueInput({
  property,
  op,
  value,
  onChange,
}: {
  property: DatabaseProperty;
  op: FilterOp;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const inputClass =
    "w-full min-w-0 rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";

  switch (op) {
    case "text_contains":
      return (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="검색어"
          className={inputClass}
        />
      );
    case "number_eq":
    case "number_neq":
    case "number_gt":
    case "number_gte":
    case "number_lt":
    case "number_lte":
      return (
        <input
          type="number"
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="값"
          className={inputClass}
        />
      );
    case "select_eq":
    case "multi_select_contains":
      return (
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          {property.options.length === 0 && <option value="">옵션 없음</option>}
          {property.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      );
    case "checkbox_eq":
      return (
        <select
          value={value === true ? "true" : "false"}
          onChange={(e) => onChange(e.target.value === "true")}
          className={inputClass}
        >
          <option value="true">체크됨</option>
          <option value="false">체크 안 됨</option>
        </select>
      );
    case "date_eq":
    case "date_before":
    case "date_after":
      return (
        <input
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} dark:[color-scheme:dark]`}
        />
      );
    default:
      return null;
  }
}

function FilterRuleRow({
  rule,
  properties,
  onChange,
  onRemove,
}: {
  rule: FilterRule;
  properties: DatabaseProperty[];
  onChange: (next: FilterRule) => void;
  onRemove: () => void;
}) {
  const property = properties.find((p) => p.id === rule.propertyId);
  if (!property) return null;
  const ops = FILTER_OPS_BY_TYPE[property.type];

  function changeProperty(propertyId: string) {
    const nextProperty = properties.find((p) => p.id === propertyId);
    if (!nextProperty) return;
    const nextOp = FILTER_OPS_BY_TYPE[nextProperty.type][0].op;
    onChange({
      ...rule,
      propertyId,
      op: nextOp,
      value: defaultFilterValue(nextProperty, nextOp),
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={rule.propertyId}
        onChange={(e) => changeProperty(e.target.value)}
        className="w-28 shrink-0 rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
      >
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {ops.length > 1 ? (
        <select
          value={rule.op}
          onChange={(e) =>
            onChange({
              ...rule,
              op: e.target.value as FilterOp,
              value: defaultFilterValue(property, e.target.value as FilterOp),
            })
          }
          className="w-16 shrink-0 rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        >
          {ops.map((o) => (
            <option key={o.op} value={o.op}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <span className="w-16 shrink-0 text-center text-xs text-zinc-400">{ops[0].label}</span>
      )}
      <div className="min-w-0 flex-1">
        <FilterValueInput
          property={property}
          op={rule.op}
          value={rule.value}
          onChange={(value) => onChange({ ...rule, value })}
        />
      </div>
      <button
        type="button"
        aria-label="필터 제거"
        title="필터 제거"
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
      >
        <XIcon />
      </button>
    </div>
  );
}

function FilterPopover({
  properties,
  filters,
  onChange,
}: {
  properties: DatabaseProperty[];
  filters: FilterRule[];
  onChange: (next: FilterRule[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function addFilter() {
    const property = properties[0];
    if (!property) return;
    const op = FILTER_OPS_BY_TYPE[property.type][0].op;
    onChange([
      ...filters,
      {
        id: crypto.randomUUID(),
        propertyId: property.id,
        op,
        value: defaultFilterValue(property, op),
      },
    ]);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${
          filters.length > 0
            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
            : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
        }`}
      >
        <FilterIcon />
        필터{filters.length > 0 ? ` · ${filters.length}` : ""}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-8 z-20 w-[26rem] max-w-[90vw] space-y-2 rounded-md border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {filters.length === 0 && (
              <p className="text-xs text-zinc-400">설정된 필터가 없습니다.</p>
            )}
            {filters.map((rule) => (
              <FilterRuleRow
                key={rule.id}
                rule={rule}
                properties={properties}
                onChange={(next) => onChange(filters.map((f) => (f.id === next.id ? next : f)))}
                onRemove={() => onChange(filters.filter((f) => f.id !== rule.id))}
              />
            ))}
            <button
              type="button"
              disabled={properties.length === 0}
              onClick={addFilter}
              className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <PlusIcon /> 필터 추가
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SortPopover({
  properties,
  sort,
  onChange,
}: {
  properties: DatabaseProperty[];
  sort: SortRule;
  onChange: (next: SortRule) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeProperty = sort ? properties.find((p) => p.id === sort.propertyId) : undefined;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${
          sort
            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
            : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
        }`}
      >
        <SortIcon />
        정렬{activeProperty ? ` · ${activeProperty.name}` : ""}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-8 z-20 w-60 space-y-2 rounded-md border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <select
              value={sort?.propertyId ?? ""}
              onChange={(e) => {
                const propertyId = e.target.value;
                if (propertyId === "") {
                  onChange(null);
                  return;
                }
                onChange({ propertyId, direction: sort?.direction ?? "asc" });
              }}
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <option value="">정렬 없음</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {sort && (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => onChange({ ...sort, direction: "asc" })}
                  className={`flex-1 rounded px-2 py-1 text-xs ${
                    sort.direction === "asc"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  오름차순
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...sort, direction: "desc" })}
                  className={`flex-1 rounded px-2 py-1 text-xs ${
                    sort.direction === "desc"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  내림차순
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function DatabaseTable({
  databasePageId,
  initialProperties,
  initialRows,
}: {
  databasePageId: string;
  initialProperties: DatabaseProperty[];
  initialRows: RowWithPage[];
}) {
  const router = useRouter();
  const [properties, setProperties] = useState<DatabaseProperty[]>(initialProperties);
  const [rows, setRows] = useState<RowWithPage[]>(initialRows);
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  // 새로고침 후에도 필터/정렬 설정이 유지되도록 페이지별로 localStorage와 동기화한다.
  const { filters, sort, setFilters, setSort } = useDatabaseViewState(databasePageId);

  // 행의 편집 가능한 영역(입력/버튼/select 등) 밖을 클릭했을 때만 해당 행의 페이지로 이동한다.
  function handleRowClick(event: React.MouseEvent<HTMLTableRowElement>, rowId: string) {
    const target = event.target as HTMLElement;
    if (target.closest("input, button, select, textarea, label")) return;
    router.push(`/p/${rowId}`);
  }

  const visibleRows = useMemo(() => {
    let result = rows;
    if (filters.length > 0) {
      result = result.filter((row) =>
        filters.every((rule) => matchesFilterRule(row.values[rule.propertyId], rule)),
      );
    }
    if (sort) {
      const sortProperty = properties.find((p) => p.id === sort.propertyId);
      if (sortProperty) result = sortRows(result, sortProperty, sort.direction);
    }
    return result;
  }, [rows, properties, filters, sort]);

  function notifySidebar() {
    window.dispatchEvent(new Event(PAGES_CHANGED_EVENT));
  }

  async function addColumn(name: string, type: PropertyType) {
    setAddColumnOpen(false);
    const res = await fetch(`/api/databases/${databasePageId}/properties`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ name, type }),
    });
    if (!res.ok) {
      alert("속성을 추가하지 못했습니다.");
      return;
    }
    const { property } = (await res.json()) as { property: DatabaseProperty };
    setProperties((prev) => [...prev, property]);
  }

  async function renameColumn(propertyId: string, name: string) {
    const res = await fetch(
      `/api/databases/${databasePageId}/properties/${propertyId}`,
      {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ name }),
      },
    );
    if (!res.ok) {
      alert("속성 이름을 바꾸지 못했습니다.");
      return;
    }
    const { property } = (await res.json()) as { property: DatabaseProperty };
    setProperties((prev) => prev.map((p) => (p.id === propertyId ? property : p)));
  }

  async function addOption(propertyId: string, name: string, color: OptionColor) {
    const property = properties.find((p) => p.id === propertyId);
    if (!property) return;
    const nextOptions = [
      ...property.options,
      { id: crypto.randomUUID(), name, color },
    ];
    const res = await fetch(
      `/api/databases/${databasePageId}/properties/${propertyId}`,
      {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ options: nextOptions }),
      },
    );
    if (!res.ok) {
      alert("옵션을 추가하지 못했습니다.");
      return;
    }
    const { property: updated } = (await res.json()) as { property: DatabaseProperty };
    setProperties((prev) => prev.map((p) => (p.id === propertyId ? updated : p)));
  }

  async function deleteColumn(propertyId: string) {
    const property = properties.find((p) => p.id === propertyId);
    if (!property) return;
    if (
      !confirm(`"${property.name}" 속성을 삭제할까요? 모든 행의 값이 사라집니다.`)
    ) {
      return;
    }
    const res = await fetch(
      `/api/databases/${databasePageId}/properties/${propertyId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      alert("속성을 삭제하지 못했습니다.");
      return;
    }
    setProperties((prev) => prev.filter((p) => p.id !== propertyId));
    setRows((prev) =>
      prev.map((row) =>
        propertyId in row.values
          ? { ...row, values: omitKey(row.values, propertyId) }
          : row,
      ),
    );
    setFilters((prev) => prev.filter((f) => f.propertyId !== propertyId));
    setSort((prev) => (prev && prev.propertyId === propertyId ? null : prev));
  }

  async function addRow() {
    const res = await fetch(`/api/databases/${databasePageId}/rows`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      alert("행을 추가하지 못했습니다.");
      return;
    }
    const { row } = (await res.json()) as { row: RowWithPage };
    setRows((prev) => [...prev, row]);
    notifySidebar();
  }

  async function deleteRow(rowId: string) {
    if (!confirm("이 행을 삭제할까요?")) return;
    const res = await fetch(`/api/databases/${databasePageId}/rows/${rowId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("행을 삭제하지 못했습니다.");
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== rowId));
    notifySidebar();
  }

  async function updateCellValue(rowId: string, propertyId: string, value: unknown) {
    const prevRow = rows.find((r) => r.id === rowId);
    if (!prevRow) return;
    const prevValues = prevRow.values;
    const nextValues =
      value === null
        ? omitKey(prevValues, propertyId)
        : { ...prevValues, [propertyId]: value };
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, values: nextValues } : r)),
    );
    const res = await fetch(`/api/databases/${databasePageId}/rows/${rowId}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ values: { [propertyId]: value } }),
    });
    if (!res.ok) {
      alert("값을 저장하지 못했습니다.");
      setRows((prev) =>
        prev.map((r) => (r.id === rowId ? { ...r, values: prevValues } : r)),
      );
      return;
    }
    const { row } = (await res.json()) as { row: RowWithPage };
    setRows((prev) => prev.map((r) => (r.id === rowId ? row : r)));
  }

  async function updateRowTitle(rowId: string, title: string) {
    const prevRow = rows.find((r) => r.id === rowId);
    if (!prevRow || prevRow.title === title) return;
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, title } : r)));
    const res = await fetch(`/api/pages/${rowId}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      alert("제목을 바꾸지 못했습니다.");
      setRows((prev) =>
        prev.map((r) => (r.id === rowId ? { ...r, title: prevRow.title } : r)),
      );
      return;
    }
    notifySidebar();
  }

  return (
    <div className="mt-8">
      <div className="mb-2 flex items-center gap-2">
        <FilterPopover properties={properties} filters={filters} onChange={setFilters} />
        <SortPopover properties={properties} sort={sort} onChange={setSort} />
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <th className="w-14 border-r border-zinc-200 dark:border-zinc-800" />
            <th className="min-w-[220px] border-r border-zinc-200 px-2 py-2 text-left text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              이름
            </th>
            {properties.map((property) => (
              <th
                key={property.id}
                className="min-w-[160px] border-r border-zinc-200 px-2 py-2 text-left text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
              >
                <ColumnHeader
                  property={property}
                  onRename={(name) => void renameColumn(property.id, name)}
                  onDelete={() => void deleteColumn(property.id)}
                  onAddOption={(name, color) => void addOption(property.id, name, color)}
                />
              </th>
            ))}
            <th className="w-10 px-1 py-2 text-left">
              <div className="relative">
                <button
                  type="button"
                  aria-label="속성 추가"
                  title="속성 추가"
                  onClick={() => setAddColumnOpen((v) => !v)}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  <PlusIcon />
                </button>
                {addColumnOpen && (
                  <AddColumnPopover
                    onAdd={(name, type) => void addColumn(name, type)}
                    onClose={() => setAddColumnOpen(false)}
                  />
                )}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr
              key={row.id}
              onClick={(e) => handleRowClick(e, row.id)}
              className="group cursor-pointer border-b border-zinc-100 last:border-b-0 dark:border-zinc-900"
            >
              <td className="border-r border-zinc-100 text-center dark:border-zinc-900">
                <div className="flex items-center justify-center gap-0.5">
                  <button
                    type="button"
                    aria-label="페이지 열기"
                    title="페이지 열기"
                    onClick={() => router.push(`/p/${row.id}`)}
                    className="flex h-6 w-6 items-center justify-center rounded text-zinc-300 opacity-0 hover:bg-zinc-200 hover:text-zinc-700 group-hover:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  >
                    <OpenPageIcon />
                  </button>
                  <button
                    type="button"
                    aria-label="행 삭제"
                    title="행 삭제"
                    onClick={() => void deleteRow(row.id)}
                    className="flex h-6 w-6 items-center justify-center rounded text-zinc-300 opacity-0 hover:bg-zinc-200 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-zinc-800"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </td>
              <td className="border-r border-zinc-100 dark:border-zinc-900">
                <TextCell
                  value={row.title}
                  allowEmpty={false}
                  maxLength={200}
                  placeholder="제목 없음"
                  onCommit={(value) => {
                    if (value !== null) void updateRowTitle(row.id, value);
                  }}
                />
              </td>
              {properties.map((property) => (
                <td
                  key={property.id}
                  className="border-r border-zinc-100 dark:border-zinc-900"
                >
                  <PropertyCell
                    property={property}
                    value={row.values[property.id]}
                    onCommit={(value) => void updateCellValue(row.id, property.id, value)}
                  />
                </td>
              ))}
              <td />
            </tr>
          ))}
          {visibleRows.length === 0 && (
            <tr>
              <td
                colSpan={properties.length + 3}
                className="px-3 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500"
              >
                {rows.length === 0 ? "행이 없습니다" : "조건에 맞는 행이 없습니다"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => void addRow()}
        className="mt-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
      >
        <PlusIcon />새 행
      </button>
    </div>
  );
}
