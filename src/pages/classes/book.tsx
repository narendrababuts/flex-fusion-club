
import BookClassForm from "@/components/BookClassForm";

export default function BookClassPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-background">
      <div className="w-full max-w-xl p-8 bg-card rounded-lg shadow-lg">
        <BookClassForm />
      </div>
    </div>
  );
}
