import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getActivePages } from "@/lib/pages-api";
import Sidebar, { type PageItem } from "@/components/sidebar";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.userId, session.user.id),
  });

  const rows = workspace ? await getActivePages(workspace.id) : [];
  const initialPages: PageItem[] = rows.map((row) => ({
    id: row.id,
    parentId: row.parentId,
    title: row.title,
    icon: row.icon,
    sortOrder: row.sortOrder,
    pageType: row.pageType,
  }));

  return (
    <div className="flex h-dvh w-full">
      <Sidebar
        workspaceName={workspace?.name ?? "nosion"}
        userEmail={session.user.email}
        initialPages={initialPages}
      />
      <main className="flex flex-1 flex-col overflow-y-auto bg-white dark:bg-zinc-950">
        {children}
      </main>
    </div>
  );
}
