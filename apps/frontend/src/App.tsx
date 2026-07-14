import { Routes, Route } from "react-router-dom";

function Home() {
  return <div className="p-4 text-gray-900 dark:text-gray-100">Nosion</div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
