import {
  pgTable,
  text,
  boolean,
  timestamp,
  uuid,
  integer,
  jsonb,
  primaryKey,
  AnyPgColumn,
} from "drizzle-orm/pg-core";

// better-auth 관리 테이블 (npx @better-auth/cli generate 산출을 기반으로 손질).
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 애플리케이션 테이블. user.id(better-auth 관리)만 참조한다.
export const workspace = pgTable("workspace", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

// 페이지 트리(사이드바)의 노드. 행(데이터베이스 행)도 페이지로 저장되지만
// is_row=true인 페이지는 트리에 노출하지 않는다(architecture.md §3).
export const page = pgTable("page", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references(
    (): AnyPgColumn => page.id,
    { onDelete: "cascade" },
  ),
  type: text("type").notNull().$type<"document" | "database">(),
  title: text("title").notNull().default("제목 없음"),
  icon: text("icon"),
  cover: text("cover"),
  isRow: boolean("is_row").notNull().default(false),
  isFavorite: boolean("is_favorite").notNull().default(false),
  position: integer("position").notNull().default(0),
  deletedAt: timestamp("deleted_at"),
});

// 문서 페이지 본문. 페이지당 BlockNote JSON 하나를 JSONB로 통저장한다(ADR-0004).
export const document = pgTable("document", {
  pageId: uuid("page_id")
    .primaryKey()
    .references(() => page.id, { onDelete: "cascade" }),
  content: jsonb("content").notNull().default([]),
  // 본문 평문 텍스트 캐시. 검색 인덱스 갱신 로직은 F6(global-search)에서 채운다.
  searchText: text("search_text"),
});

// 데이터베이스 페이지의 속성(열) 정의.
export const dbProperty = pgTable("db_property", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageId: uuid("page_id")
    .notNull()
    .references(() => page.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type")
    .notNull()
    .$type<"text" | "number" | "select" | "multi_select" | "date" | "checkbox">(),
  // 셀렉트/다중셀렉트 옵션 등 타입별 부가 설정.
  config: jsonb("config").notNull().default({}),
  position: integer("position").notNull().default(0),
});

// 행(row=페이지)의 속성 값. 값은 타입별 JSONB로 저장한다(EAV).
export const propertyValue = pgTable(
  "property_value",
  {
    rowPageId: uuid("row_page_id")
      .notNull()
      .references(() => page.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => dbProperty.id, { onDelete: "cascade" }),
    value: jsonb("value"),
  },
  (table) => [
    primaryKey({ columns: [table.rowPageId, table.propertyId] }),
  ],
);

// 데이터베이스 페이지의 뷰(테이블/보드/리스트). 필터·정렬·보드 그룹 기준을 config에 저장한다.
export const dbView = pgTable("db_view", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageId: uuid("page_id")
    .notNull()
    .references(() => page.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().$type<"table" | "board" | "list">(),
  config: jsonb("config").notNull().default({}),
  position: integer("position").notNull().default(0),
});
