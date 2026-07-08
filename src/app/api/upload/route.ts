import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { badRequest, unauthorized } from "@/lib/pages-api";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// SVG는 <script>를 포함할 수 있고 정적 파일로 직접 열리면 앱과 같은 origin에서
// 실행되어 세션을 이용한 XSS로 이어질 수 있어 허용 목록에서 제외한다.
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

/** 이미지 업로드 (로그인 사용자만) */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return unauthorized();

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return badRequest("file 필드에 이미지 파일이 필요합니다.");
  }

  const extension = EXTENSION_BY_MIME_TYPE[file.type];
  if (!extension) {
    return badRequest("지원하지 않는 이미지 형식입니다.");
  }
  if (file.size > MAX_FILE_SIZE) {
    return badRequest("파일 크기는 10MB를 초과할 수 없습니다.");
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
}
