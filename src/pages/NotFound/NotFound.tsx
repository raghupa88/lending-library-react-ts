import { useNavigate } from "react-router-dom";
import { BookX } from "lucide-react";
import { EmptyState } from "../../components/ui/empty-state";
import { Button } from "../../components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <EmptyState
        icon={<BookX aria-hidden="true" />}
        title="Page not found"
        description="The page you're looking for isn't on our shelves."
        action={<Button onClick={() => navigate("/")}>Back to home</Button>}
      />
    </div>
  );
}
