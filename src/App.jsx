import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AuthGuard from "./auth/AuthGuard";
import { AdminLayout, UserLayout } from "./layouts";
import { adminRoutes, getUniqueRoutes, userRoutes } from "./routes";
import "./App.css";

const AccessCheckingPage = lazy(() => import("./pages/AccessCheckingPage"));

function PageFallback() {
  return <div className="page-loading">กำลังโหลดหน้า...</div>;
}

function App() {
  const uniqueAdminRoutes = getUniqueRoutes(adminRoutes);
  const uniqueUserRoutes = getUniqueRoutes(userRoutes);

  return (
    <>
      <AuthGuard />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<AccessCheckingPage />} />
          {uniqueAdminRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<AdminLayout>{route.element}</AdminLayout>}
            />
          ))}
          {uniqueUserRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<UserLayout>{route.element}</UserLayout>}
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
