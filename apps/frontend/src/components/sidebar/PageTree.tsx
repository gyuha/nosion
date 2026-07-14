import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { PageNode } from "@nosion/shared";
import {
  useCreatePage,
  useDeletePage,
  useMovePage,
  usePageTree,
  useUpdatePage,
} from "../../api/pages";

function flatten(nodes: PageNode[]): PageNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children)]);
}

function TreeNode({ node, allPages }: { node: PageNode; allPages: PageNode[] }) {
  const navigate = useNavigate();
  const { pageId } = useParams();
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(node.title);
  const [menuOpen, setMenuOpen] = useState(false);

  const createPage = useCreatePage();
  const updatePage = useUpdatePage();
  const movePage = useMovePage();
  const deletePage = useDeletePage();

  const commitRename = () => {
    setEditing(false);
    if (title.trim() && title !== node.title) {
      updatePage.mutate({ id: node.id, body: { title: title.trim() } });
    } else {
      setTitle(node.title);
    }
  };

  return (
    <li>
      <div
        className={`flex items-center gap-1 rounded px-1 py-0.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
          pageId === node.id ? "bg-gray-100 dark:bg-gray-800" : ""
        }`}
      >
        {node.children.length > 0 ? (
          <button
            aria-label="펼치기/접기"
            onClick={() => setExpanded((v) => !v)}
            className="w-4 text-gray-400"
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span>{node.icon ?? (node.type === "database" ? "🗄️" : "📄")}</span>
        {editing ? (
          <input
            className="flex-1 rounded border border-gray-300 px-1 dark:bg-gray-900"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => e.key === "Enter" && commitRename()}
          />
        ) : (
          <button
            className="flex-1 truncate text-left"
            onClick={() => navigate(`/page/${node.id}`)}
          >
            {node.title}
          </button>
        )}
        <div className="relative">
          <button
            aria-label="더보기"
            className="px-1 text-gray-400"
            onClick={() => setMenuOpen((v) => !v)}
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-10 w-40 rounded border border-gray-200 bg-white text-xs shadow-md dark:border-gray-700 dark:bg-gray-800">
              <button
                className="block w-full px-2 py-1 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => {
                  createPage.mutate({ type: "document", parentId: node.id });
                  setMenuOpen(false);
                  setExpanded(true);
                }}
              >
                하위 문서 추가
              </button>
              <button
                className="block w-full px-2 py-1 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => {
                  createPage.mutate({ type: "database", parentId: node.id });
                  setMenuOpen(false);
                  setExpanded(true);
                }}
              >
                하위 데이터베이스 추가
              </button>
              <button
                className="block w-full px-2 py-1 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => {
                  setEditing(true);
                  setMenuOpen(false);
                }}
              >
                이름 변경
              </button>
              <label className="block px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                이동:
                <select
                  aria-label={`${node.title} 이동 대상`}
                  className="mt-1 w-full rounded border border-gray-300 dark:bg-gray-900"
                  defaultValue=""
                  onChange={(e) => {
                    const targetParentId =
                      e.target.value === "" ? null : e.target.value;
                    movePage.mutate({
                      id: node.id,
                      body: { parentId: targetParentId, position: 0 },
                    });
                    setMenuOpen(false);
                  }}
                >
                  <option value="" disabled>
                    선택
                  </option>
                  <option value="">최상위</option>
                  {allPages
                    .filter((p) => p.id !== node.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                </select>
              </label>
              <button
                className="block w-full px-2 py-1 text-left text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => {
                  deletePage.mutate(node.id);
                  setMenuOpen(false);
                }}
              >
                삭제(휴지통으로)
              </button>
            </div>
          )}
        </div>
      </div>
      {expanded && node.children.length > 0 && (
        <ul className="ml-4 border-l border-gray-100 pl-2 dark:border-gray-800">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} allPages={allPages} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function PageTree() {
  const navigate = useNavigate();
  const { data: tree, isPending } = usePageTree();
  const createPage = useCreatePage();

  if (isPending) return null;
  const nodes = tree ?? [];
  const allPages = flatten(nodes);

  return (
    <nav className="w-64 shrink-0 border-r border-gray-200 p-2 dark:border-gray-700">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500">페이지</span>
        <div className="flex gap-1 text-xs">
          <button
            className="rounded px-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => createPage.mutate({ type: "document" })}
          >
            + 문서
          </button>
          <button
            className="rounded px-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => createPage.mutate({ type: "database" })}
          >
            + DB
          </button>
        </div>
      </div>
      <ul>
        {nodes.map((node) => (
          <TreeNode key={node.id} node={node} allPages={allPages} />
        ))}
      </ul>
      <button
        className="mt-2 block w-full rounded px-1 py-0.5 text-left text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={() => navigate("/trash")}
      >
        🗑️ 휴지통
      </button>
    </nav>
  );
}
