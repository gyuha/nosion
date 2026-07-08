import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { PartialBlock } from "@blocknote/core";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { auth } from "@/lib/auth";
import { findActivePage } from "@/lib/pages-api";
import {
  findActiveDatabasePage,
  findActiveRow,
  getProperties,
  getRows,
  serializeProperty,
} from "@/lib/databases-api";
import PageEditor from "@/components/page-editor";
import PageHeader from "@/components/page-header";
import DatabaseTable from "@/components/database-table";
import RowPropertiesPanel from "@/components/row-properties-panel";

/** 페이지 content(JSON 문자열)를 BlockNote 초기 콘텐츠로 파싱한다. 손상된 콘텐츠는 빈 문서로 취급한다. */
function parseInitialContent(content: string | null): PartialBlock[] | undefined {
  if (!content) return undefined;
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export default async function PageDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.userId, session.user.id),
  });
  const page = workspace ? await findActivePage(workspace.id, id) : null;

  if (!workspace || !page) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <p className="text-zinc-500 dark:text-zinc-400">
          페이지를 찾을 수 없습니다.
        </p>
      </div>
    );
  }

  if (page.pageType === "database") {
    const [properties, rows] = await Promise.all([
      getProperties(page.id),
      getRows(page.id),
    ]);

    return (
      <div className="mx-auto w-full max-w-5xl px-8 py-16">
        <PageHeader
          key={`header-${page.id}`}
          pageId={page.id}
          title={page.title}
          icon={page.icon}
          coverImage={page.coverImage}
        />
        <DatabaseTable
          key={page.id}
          databasePageId={page.id}
          initialProperties={properties.map(serializeProperty)}
          initialRows={rows}
        />
      </div>
    );
  }

  // 데이터베이스 행 페이지: 부모 데이터베이스의 속성 스키마 + 이 행의 값을 함께 불러온다.
  const databasePage =
    page.pageType === "database_row" && page.parentId
      ? await findActiveDatabasePage(workspace.id, page.parentId)
      : null;
  const [rowProperties, row] = databasePage
    ? await Promise.all([
        getProperties(databasePage.id),
        findActiveRow(databasePage.id, page.id),
      ])
    : [[], null];

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-16">
      <PageHeader
        key={`header-${page.id}`}
        pageId={page.id}
        title={page.title}
        icon={page.icon}
        coverImage={page.coverImage}
      />
      {databasePage && row && (
        <RowPropertiesPanel
          key={`props-${page.id}`}
          databasePageId={databasePage.id}
          rowId={page.id}
          properties={rowProperties.map(serializeProperty)}
          initialValues={row.values}
        />
      )}
      <PageEditor
        key={page.id}
        pageId={page.id}
        initialContent={parseInitialContent(page.content)}
      />
    </div>
  );
}
