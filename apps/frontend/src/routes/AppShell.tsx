import { Outlet } from "react-router-dom";
import PageTree from "../components/sidebar/PageTree";
import SearchPalette from "../components/search/SearchPalette";
import { signOut, useSession } from "../lib/auth-client";
import { useTheme } from "../theme/ThemeProvider";

export default function AppShell() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="flex min-h-screen text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <PageTree />
      <div className="flex-1">
        <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
          <SearchPalette />
          <div className="flex items-center gap-3">
            <button
              aria-label="테마 전환"
              className="rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={toggleTheme}
            >
              {theme === "dark" ? "🌙 다크" : "☀️ 라이트"}
            </button>
            {session && (
              <div className="flex items-center gap-2">
                <span>{session.user.email}</span>
                <button className="underline" onClick={() => signOut()}>
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
