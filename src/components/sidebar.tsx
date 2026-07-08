"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import ThemeToggle from "@/components/theme-toggle";

export type PageItem = {
  id: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  sortOrder: number;
  pageType: "document" | "database" | "database_row";
};

type ApiNode = PageItem & { children: ApiNode[] };

type DropZone = "before" | "after" | "inside";
type DropTarget = { id: string; zone: DropZone };

/** 트리 아래 빈 영역 드롭 대상 id — 루트 레벨 맨 뒤로 이동 */
const ROOT_END = "__root_end__";

const JSON_HEADERS = { "Content-Type": "application/json" };

/** 페이지 상세 화면(제목/아이콘 편집) 등 사이드바 밖에서 페이지가 바뀌었음을 알리는 이벤트 */
export const PAGES_CHANGED_EVENT = "nosion:pages-changed";

type TreeCtx = {
  childrenMap: Map<string | null, PageItem[]>;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  activeId: string | null;
  renamingId: string | null;
  menuId: string | null;
  setMenuId: (id: string | null) => void;
  startRename: (id: string) => void;
  commitRename: (id: string, rawTitle: string) => void;
  cancelRename: () => void;
  createChild: (parentId: string) => void;
  removePage: (id: string) => void;
  navigate: (id: string) => void;
  draggingId: string | null;
  dropTarget: DropTarget | null;
  onRowDragStart: (id: string, e: React.DragEvent) => void;
  onRowDragOver: (id: string, e: React.DragEvent) => void;
  onRowDrop: (id: string, e: React.DragEvent) => void;
  onDragEnd: () => void;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
      aria-hidden
    >
      <path d="M6 3.5 11 8l-5 4.5v-9z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M8 3a.75.75 0 0 1 .75.75v3.5h3.5a.75.75 0 0 1 0 1.5h-3.5v3.5a.75.75 0 0 1-1.5 0v-3.5h-3.5a.75.75 0 0 1 0-1.5h3.5v-3.5A.75.75 0 0 1 8 3z" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v7A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 13.5 3h-11zM2.5 4.5h3.75v2H2.5v-2zm5.25 0h5.75v2H7.75v-2zM2.5 8h3.75v3.5H2.5V8zm5.25 0h5.75v3.5H7.75V8z" />
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

function TreeNode({
  node,
  depth,
  ctx,
}: {
  node: PageItem;
  depth: number;
  ctx: TreeCtx;
}) {
  const children = ctx.childrenMap.get(node.id) ?? [];
  const isExpanded = ctx.expanded.has(node.id);
  const isActive = ctx.activeId === node.id;
  const isRenaming = ctx.renamingId === node.id;
  const isDragging = ctx.draggingId === node.id;
  const isDropTarget = ctx.dropTarget?.id === node.id;
  const dropZone = isDropTarget ? ctx.dropTarget!.zone : null;

  return (
    <div>
      <div
        draggable={!isRenaming}
        onDragStart={(e) => ctx.onRowDragStart(node.id, e)}
        onDragOver={(e) => ctx.onRowDragOver(node.id, e)}
        onDrop={(e) => ctx.onRowDrop(node.id, e)}
        onDragEnd={ctx.onDragEnd}
        onClick={() => ctx.navigate(node.id)}
        style={{ paddingLeft: depth * 14 + 4 }}
        className={`group relative flex cursor-pointer items-center gap-1 rounded-md py-1 pr-1 text-sm ${
          isActive
            ? "bg-zinc-200 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
            : "text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
        } ${dropZone === "inside" ? "ring-2 ring-inset ring-blue-500" : ""} ${
          isDragging ? "opacity-50" : ""
        }`}
      >
        {dropZone === "before" && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 rounded bg-blue-500" />
        )}
        {dropZone === "after" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-0.5 rounded bg-blue-500" />
        )}
        <button
          type="button"
          aria-label={isExpanded ? "접기" : "펼치기"}
          onClick={(e) => {
            e.stopPropagation();
            ctx.toggleExpand(node.id);
          }}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-zinc-300 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        >
          <ChevronIcon open={isExpanded} />
        </button>
        {isRenaming ? (
          <input
            autoFocus
            defaultValue={node.title}
            maxLength={200}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                ctx.commitRename(node.id, e.currentTarget.value);
              } else if (e.key === "Escape") {
                ctx.cancelRename();
              }
            }}
            onBlur={(e) => ctx.commitRename(node.id, e.currentTarget.value)}
            className="min-w-0 flex-1 rounded border border-blue-400 bg-white px-1 py-0 text-sm text-zinc-900 outline-none dark:bg-zinc-900 dark:text-zinc-50"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate">
            {node.icon ? (
              <span className="mr-1">{node.icon}</span>
            ) : (
              node.pageType === "database" && (
                <span className="mr-1 inline-flex text-zinc-400">
                  <TableIcon />
                </span>
              )
            )}
            {node.title}
          </span>
        )}
        {!isRenaming && (
          <div
            className="hidden shrink-0 items-center gap-0.5 group-hover:flex"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="메뉴"
              title="메뉴"
              onClick={() => ctx.setMenuId(node.id)}
              className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:bg-zinc-300 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
            >
              <DotsIcon />
            </button>
            <button
              type="button"
              aria-label="하위 페이지 추가"
              title="하위 페이지 추가"
              onClick={() => ctx.createChild(node.id)}
              className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:bg-zinc-300 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
            >
              <PlusIcon />
            </button>
          </div>
        )}
        {ctx.menuId === node.id && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.stopPropagation();
                ctx.setMenuId(null);
              }}
            />
            <div
              className="absolute right-1 top-7 z-20 w-36 overflow-hidden rounded-md border border-zinc-200 bg-white py-1 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => ctx.startRename(node.id)}
                className="block w-full px-3 py-1.5 text-left text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                이름 바꾸기
              </button>
              <button
                type="button"
                onClick={() => ctx.removePage(node.id)}
                className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                삭제
              </button>
            </div>
          </>
        )}
      </div>
      {isExpanded &&
        (children.length > 0 ? (
          children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} ctx={ctx} />
          ))
        ) : (
          <p
            style={{ paddingLeft: (depth + 1) * 14 + 8 }}
            className="py-1 text-xs text-zinc-400 dark:text-zinc-500"
          >
            하위 페이지 없음
          </p>
        ))}
    </div>
  );
}

export default function Sidebar({
  workspaceName,
  userEmail,
  initialPages,
}: {
  workspaceName: string;
  userEmail: string;
  initialPages: PageItem[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const activeId = pathname.startsWith("/p/")
    ? (pathname.split("/")[2] ?? null)
    : null;

  const [pagesList, setPagesList] = useState<PageItem[]>(initialPages);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // 첫 로드 시 현재 페이지의 조상들을 펼쳐서 보이게 한다.
    const set = new Set<string>();
    const byId = new Map(initialPages.map((p) => [p.id, p]));
    let current = activeId ? (byId.get(activeId)?.parentId ?? null) : null;
    while (current) {
      set.add(current);
      current = byId.get(current)?.parentId ?? null;
    }
    return set;
  });
  const [renamingId, setRenamingIdState] = useState<string | null>(null);
  const renamingIdRef = useRef<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [draggingId, setDraggingIdState] = useState<string | null>(null);
  // dragover는 연속(continuous) 이벤트라 drop 시점에 상태 커밋이 보장되지 않으므로
  // 드롭 판정은 ref와 이벤트 좌표로 수행하고, 상태는 표시(하이라이트)에만 쓴다.
  const draggingIdRef = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const byIdMap = useMemo(
    () => new Map(pagesList.map((p) => [p.id, p])),
    [pagesList],
  );
  const childrenMap = useMemo(() => {
    const map = new Map<string | null, PageItem[]>();
    for (const page of pagesList) {
      const list = map.get(page.parentId) ?? [];
      list.push(page);
      map.set(page.parentId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [pagesList]);

  function setRenamingId(id: string | null) {
    renamingIdRef.current = id;
    setRenamingIdState(id);
  }

  /** 서버의 트리를 다시 받아 로컬 상태를 동기화한다. */
  async function refetch() {
    try {
      const res = await fetch("/api/pages", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { pages: ApiNode[] };
      const flat: PageItem[] = [];
      const walk = (nodes: ApiNode[]) => {
        for (const node of nodes) {
          flat.push({
            id: node.id,
            parentId: node.parentId,
            title: node.title,
            icon: node.icon,
            sortOrder: node.sortOrder,
            pageType: node.pageType,
          });
          walk(node.children);
        }
      };
      walk(data.pages);
      setPagesList(flat);
    } catch {
      // 네트워크 오류 시 기존 상태 유지
    }
  }

  useEffect(() => {
    window.addEventListener(PAGES_CHANGED_EVENT, refetch);
    return () => window.removeEventListener(PAGES_CHANGED_EVENT, refetch);
  }, []);

  async function createPage(parentId: string | null) {
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(parentId ? { parentId } : {}),
    });
    if (!res.ok) {
      alert("페이지를 만들지 못했습니다.");
      return;
    }
    const { page } = (await res.json()) as { page: PageItem };
    if (parentId) {
      setExpanded((prev) => new Set(prev).add(parentId));
    }
    await refetch();
    router.push(`/p/${page.id}`);
  }

  async function createDatabase() {
    const res = await fetch("/api/databases", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      alert("데이터베이스를 만들지 못했습니다.");
      return;
    }
    const { page } = (await res.json()) as { page: PageItem };
    await refetch();
    router.push(`/p/${page.id}`);
  }

  function startRename(id: string) {
    setMenuId(null);
    setRenamingId(id);
  }

  async function commitRename(id: string, rawTitle: string) {
    if (renamingIdRef.current !== id) return; // Enter 후 blur 중복 방지
    setRenamingId(null);
    const title = rawTitle.trim();
    const current = byIdMap.get(id);
    if (!current || title === "" || title === current.title) return;
    setPagesList((list) =>
      list.map((p) => (p.id === id ? { ...p, title } : p)),
    );
    const res = await fetch(`/api/pages/${id}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ title }),
    });
    if (!res.ok) alert("이름을 바꾸지 못했습니다.");
    await refetch();
    router.refresh();
  }

  async function removePage(id: string) {
    setMenuId(null);
    if (!confirm("하위 페이지를 포함해 삭제됩니다. 계속할까요?")) return;
    const res = await fetch(`/api/pages/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("삭제하지 못했습니다.");
      return;
    }
    const { deletedIds } = (await res.json()) as { deletedIds: string[] };
    await refetch();
    if (activeId && deletedIds.includes(activeId)) {
      router.push("/");
    } else {
      router.refresh();
    }
  }

  /** targetId가 드래그 중인 페이지 자신 또는 그 후손이면 true */
  function isInvalidDropTarget(targetId: string) {
    const dragId = draggingIdRef.current;
    if (!dragId) return true;
    if (targetId === dragId) return true;
    let current = byIdMap.get(targetId)?.parentId ?? null;
    while (current) {
      if (current === dragId) return true;
      current = byIdMap.get(current)?.parentId ?? null;
    }
    return false;
  }

  function zoneFromEvent(e: React.DragEvent): DropZone {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    return ratio < 0.3 ? "before" : ratio > 0.7 ? "after" : "inside";
  }

  function onRowDragStart(id: string, e: React.DragEvent) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    draggingIdRef.current = id;
    setDraggingIdState(id);
  }

  function onRowDragOver(id: string, e: React.DragEvent) {
    if (isInvalidDropTarget(id)) {
      setDropTarget((prev) => (prev?.id === id ? null : prev));
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const zone = zoneFromEvent(e);
    setDropTarget((prev) =>
      prev?.id === id && prev.zone === zone ? prev : { id, zone },
    );
  }

  function onRowDrop(id: string, e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const dragId = draggingIdRef.current;
    if (dragId && !isInvalidDropTarget(id)) {
      void applyMove(dragId, id, zoneFromEvent(e));
    }
    onDragEnd();
  }

  function onRootEndDragOver(e: React.DragEvent) {
    if (!draggingIdRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget((prev) =>
      prev?.id === ROOT_END ? prev : { id: ROOT_END, zone: "after" },
    );
  }

  function onRootEndDrop(e: React.DragEvent) {
    e.preventDefault();
    const dragId = draggingIdRef.current;
    if (dragId) {
      void applyMove(dragId, ROOT_END, "after");
    }
    onDragEnd();
  }

  function onDragEnd() {
    draggingIdRef.current = null;
    setDraggingIdState(null);
    setDropTarget(null);
  }

  /** 드롭 결과를 로컬 상태에 반영하고 API로 저장한다. */
  async function applyMove(
    dragId: string,
    targetId: string,
    zone: DropZone,
  ) {
    const dragged = byIdMap.get(dragId);
    if (!dragged) return;

    let destParent: string | null;
    let insertIndex: number;

    if (targetId === ROOT_END) {
      destParent = null;
      insertIndex = (childrenMap.get(null) ?? []).filter(
        (p) => p.id !== dragId,
      ).length;
    } else {
      const target = byIdMap.get(targetId);
      if (!target) return;
      if (zone === "inside") {
        destParent = target.id;
        insertIndex = (childrenMap.get(target.id) ?? []).filter(
          (p) => p.id !== dragId,
        ).length;
        setExpanded((prev) => new Set(prev).add(target.id));
      } else {
        destParent = target.parentId;
        const siblings = (childrenMap.get(destParent) ?? []).filter(
          (p) => p.id !== dragId,
        );
        const targetIndex = siblings.findIndex((p) => p.id === targetId);
        insertIndex = zone === "before" ? targetIndex : targetIndex + 1;
      }
    }

    const siblings = (childrenMap.get(destParent) ?? []).filter(
      (p) => p.id !== dragId,
    );
    const newOrder = [
      ...siblings.slice(0, insertIndex),
      dragged,
      ...siblings.slice(insertIndex),
    ];

    // 변화가 없으면 종료
    const oldOrder = childrenMap.get(destParent) ?? [];
    if (
      dragged.parentId === destParent &&
      oldOrder.length === newOrder.length &&
      oldOrder.every((p, i) => p.id === newOrder[i].id)
    ) {
      return;
    }

    const orderById = new Map(newOrder.map((p, i) => [p.id, i]));

    // 낙관적 갱신
    setPagesList((list) =>
      list.map((p) => {
        if (p.id === dragId) {
          return { ...p, parentId: destParent, sortOrder: orderById.get(p.id)! };
        }
        const index = orderById.get(p.id);
        return index !== undefined && index !== p.sortOrder
          ? { ...p, sortOrder: index }
          : p;
      }),
    );

    // API 저장: 이동한 페이지 → parentId+sortOrder, 바뀐 형제들 → sortOrder만
    const res = await fetch(`/api/pages/${dragId}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        parentId: destParent,
        sortOrder: orderById.get(dragId),
      }),
    });
    if (!res.ok) alert("페이지를 이동하지 못했습니다.");
    for (const sibling of siblings) {
      const index = orderById.get(sibling.id)!;
      if (index !== sibling.sortOrder) {
        await fetch(`/api/pages/${sibling.id}`, {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify({ sortOrder: index }),
        });
      }
    }
    await refetch();
    router.refresh();
  }

  const ctx: TreeCtx = {
    childrenMap,
    expanded,
    toggleExpand: (id) =>
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    activeId,
    renamingId,
    menuId,
    setMenuId,
    startRename,
    commitRename,
    cancelRename: () => setRenamingId(null),
    createChild: (parentId) => void createPage(parentId),
    removePage: (id) => void removePage(id),
    navigate: (id) => router.push(`/p/${id}`),
    draggingId,
    dropTarget,
    onRowDragStart,
    onRowDragOver,
    onRowDrop,
    onDragEnd,
  };

  const rootPages = childrenMap.get(null) ?? [];

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="px-4 py-3">
        <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {workspaceName}
        </span>
      </div>
      <nav className="flex flex-1 flex-col overflow-y-auto px-2 pb-2">
        <p className="px-2 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          페이지
        </p>
        <div>
          {rootPages.map((node) => (
            <TreeNode key={node.id} node={node} depth={0} ctx={ctx} />
          ))}
          {rootPages.length === 0 && (
            <p className="px-2 py-1 text-xs text-zinc-400 dark:text-zinc-500">
              페이지가 없습니다
            </p>
          )}
        </div>
        <div
          className="relative min-h-8 flex-1"
          onDragOver={onRootEndDragOver}
          onDrop={onRootEndDrop}
        >
          {dropTarget?.id === ROOT_END && (
            <div className="pointer-events-none absolute inset-x-2 top-0 h-0.5 rounded bg-blue-500" />
          )}
        </div>
      </nav>
      <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => void createPage(null)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <PlusIcon />새 페이지
        </button>
        <button
          type="button"
          onClick={() => void createDatabase()}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <TableIcon />새 데이터베이스
        </button>
        <div className="mt-2 flex items-center justify-between gap-2 px-2">
          <span className="min-w-0 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {userEmail}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </div>
    </aside>
  );
}
