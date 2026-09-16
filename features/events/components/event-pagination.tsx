import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Server pagination metadata drives both public discovery and organizer lists.
export function EventPagination({
  page,
  totalPages,
  disabled,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  disabled: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav aria-label="Event pagination" className="explore-pagination">
      <Button
        variant="secondary"
        disabled={page <= 1 || disabled}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        <ArrowLeft size={17} aria-hidden="true" />
        <span>Previous</span>
      </Button>
      <p>
        Page <strong>{Math.min(page, totalPages)}</strong> of {totalPages}
      </p>
      <Button
        variant="secondary"
        disabled={page >= totalPages || disabled}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        <span>Next</span>
        <ArrowRight size={17} aria-hidden="true" />
      </Button>
    </nav>
  );
}
