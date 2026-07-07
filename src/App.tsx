import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { MemberShell } from "./components/layout/MemberShell";
import { AdminShell } from "./components/layout/AdminShell";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import BooksAdmin from "./pages/Admin/BooksAdmin";
import CoursesAdmin from "./pages/Admin/CoursesAdmin";
import MembersAdmin from "./pages/Admin/MembersAdmin";
import LoansAdmin from "./pages/Admin/LoansAdmin";
import { LoadingSpinner } from "./components/ui/loading";
import Home from "./pages/Home/Home";
import Books from "./pages/Books/Books";
import BookDetail from "./pages/BookDetail/BookDetail";
import Learn from "./pages/Learn/Learn";
import LearnDetail from "./pages/LearnDetail/LearnDetail";
import LessonPlayer from "./pages/LessonPlayer/LessonPlayer";
import TestRunner from "./pages/TestRunner/TestRunner";
import CertificateVerify from "./pages/CertificateVerify/CertificateVerify";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Dashboard from "./pages/Dashboard/Dashboard";
import Plans from "./pages/Plans/Plans";
import Profile from "./pages/Profile/Profile";
import NotFound from "./pages/NotFound/NotFound";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// The UI guard is cosmetic — the API's @PreAuthorize ADMIN rules are the
// real gate; this only keeps members out of a broken-looking screen.
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login?returnTo=%2Fadmin" replace />;
  }
  if (user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <Routes>
      <Route element={<MemberShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/books" element={<Books />} />
        <Route path="/books/:id" element={<BookDetail />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/learn/:slug" element={<LearnDetail />} />
        <Route
          path="/learn/:slug/lesson/:lessonId"
          element={
            <ProtectedRoute>
              <LessonPlayer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learn/:slug/test/:testId"
          element={
            <ProtectedRoute>
              <TestRunner />
            </ProtectedRoute>
          }
        />
        <Route path="/certificates/:serial" element={<CertificateVerify />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route
        element={
          <AdminRoute>
            <AdminShell />
          </AdminRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/books" element={<BooksAdmin />} />
        <Route path="/admin/learn/courses" element={<CoursesAdmin />} />
        <Route path="/admin/members" element={<MembersAdmin />} />
        <Route path="/admin/loans" element={<LoansAdmin />} />
      </Route>
    </Routes>
  );
}
