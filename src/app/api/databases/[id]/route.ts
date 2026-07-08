import { NextResponse } from "next/server";
import {
  findActiveDatabasePage,
  getProperties,
  getRows,
  serializeProperty,
} from "@/lib/databases-api";
import { getSessionWorkspace, notFound, unauthorized } from "@/lib/pages-api";

type RouteContext = { params: Promise<{ id: string }> };

/** 데이터베이스 페이지 상세: 속성 스키마 + 행 목록 */
export async function GET(request: Request, context: RouteContext) {
  const workspace = await getSessionWorkspace(request);
  if (!workspace) return unauthorized();

  const { id } = await context.params;
  const page = await findActiveDatabasePage(workspace.id, id);
  if (!page) return notFound();

  const [properties, rows] = await Promise.all([
    getProperties(page.id),
    getRows(page.id),
  ]);

  return NextResponse.json({
    page,
    properties: properties.map(serializeProperty),
    rows,
  });
}
