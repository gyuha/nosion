import { Routes, Route } from "react-router-dom";
import Login from "./routes/Login";
import ProtectedRoute from "./routes/ProtectedRoute";
import { signOut, useSession } from "./lib/auth-client";

function Home() {
  const { data: session } = useSession();
  return (
    <div className="p-4 text-gray-900 dark:text-gray-100">
      <p>Nosion</p>
      {session && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span>{session.user.email}</span>
          <button className="underline" onClick={() => signOut()}>
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
      </Route>
    </Routes>
  );
}
