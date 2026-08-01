import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { BoardsPage } from "./pages/BoardsPage";
import { BoardPage } from "./pages/BoardPage";
import { RequireAuth } from "./components/RequireAuth";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/boards"
          element={
            <RequireAuth>
              <BoardsPage />
            </RequireAuth>
          }
        />
        <Route path="/board/:boardId" element={<BoardPage />} />
        <Route path="/" element={<Navigate to="/boards" replace />} />
        <Route path="*" element={<Navigate to="/boards" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
