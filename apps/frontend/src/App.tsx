import { Routes, Route } from "react-router-dom";
import Login from "./routes/Login";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppShell from "./routes/AppShell";
import Home from "./routes/Home";
import PagePlaceholder from "./routes/PagePlaceholder";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/page/:pageId" element={<PagePlaceholder />} />
        </Route>
      </Route>
    </Routes>
  );
}
