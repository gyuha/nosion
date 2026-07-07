import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { PartialBlock } from "@blocknote/core";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { auth } from "@/lib/auth";
import { findActivePage } from "@/lib/pages-api";
import PageEditor from "@/components/page-editor";

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

  if (!page) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <p className="text-zinc-500 dark:text-zinc-400">
          페이지를 찾을 수 없습니다.
        </p>
      </div>
    );
  }

  let initialContent: PartialBlock[] | undefined;
  if (page.content) {
    try {
      const parsed = JSON.parse(page.content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        initialContent = parsed;
      }
    } catch {
      // 손상된 콘텐츠는 무시하고 빈 문서로 시작한다.
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-16">
      <h1 className="break-words text-4xl font-bold text-zinc-900 dark:text-zinc-50">
        {page.title}
      </h1>
      <PageEditor key={page.id} pageId={page.id} initialContent={initialContent} />
    </div>
  );
}
