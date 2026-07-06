import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil } from "lucide-react";
import { useBooksQuery, type BookSummary } from "../../features/books/queries";
import { useCreateBook, useUpdateBook, type BookInput } from "../../features/admin/queries";
import { bookSchema, type BookFormValues } from "../../lib/schemas/book";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { Field } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { useToast } from "../../components/ui/toast";
import { ApiError } from "../../lib/api";

type DialogState = { mode: "create" } | { mode: "edit"; book: BookSummary } | null;

export default function BooksAdmin() {
  const [dialog, setDialog] = useState<DialogState>(null);
  const { data, isLoading } = useBooksQuery({ size: 100 });
  const books = data?.content ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Books</h1>
          <p className="mt-1 text-sm text-muted">
            {data ? `${data.totalElements} titles in the catalog` : "Loading…"}
          </p>
        </div>
        <Button onClick={() => setDialog({ mode: "create" })}>
          <Plus aria-hidden="true" />
          Add book
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="mt-6 h-64 w-full" />
      ) : books.length === 0 ? (
        <EmptyState className="mt-6" title="No books in the catalog yet" />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-(--radius-card) border border-border bg-surface">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted uppercase">
                <th scope="col" className="px-4 py-3 font-medium">Title</th>
                <th scope="col" className="px-4 py-3 font-medium">Author</th>
                <th scope="col" className="px-4 py-3 font-medium">Genre</th>
                <th scope="col" className="px-4 py-3 font-medium">Copies</th>
                <th scope="col" className="px-4 py-3 font-medium">Rating</th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {books.map((book) => (
                <tr key={book.id}>
                  <td className="px-4 py-3 font-medium">{book.title}</td>
                  <td className="px-4 py-3 text-muted">{book.author}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{book.genre}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {book.availableCopies}/{book.totalCopies}
                  </td>
                  <td className="px-4 py-3 text-muted">{book.rating?.toFixed(1) ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit ${book.title}`}
                      onClick={() => setDialog({ mode: "edit", book })}
                    >
                      <Pencil aria-hidden="true" />
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog && <BookFormDialog state={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}

function BookFormDialog({ state, onClose }: { state: DialogState & object; onClose: () => void }) {
  const { toast } = useToast();
  const createBook = useCreateBook();
  const updateBook = useUpdateBook();
  const editing = state.mode === "edit" ? state.book : null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: editing
      ? {
          title: editing.title,
          author: editing.author,
          isbn: editing.isbn,
          description: editing.description ?? "",
          totalCopies: editing.totalCopies,
          purchasePrice: 0,
          category: editing.genre ?? "",
          language: editing.language ?? "",
          pageCount: editing.pageCount ? String(editing.pageCount) : "",
          publishedYear: editing.publishedYear ? String(editing.publishedYear) : "",
          coverUrl: editing.cover ?? "",
        }
      : { totalCopies: 1, purchasePrice: 0, pageCount: "", publishedYear: "" },
  });

  const onSubmit = async (values: BookFormValues) => {
    const input: BookInput = {
      ...values,
      pageCount: values.pageCount ? Number(values.pageCount) : undefined,
      publishedYear: values.publishedYear ? Number(values.publishedYear) : undefined,
      coverUrl: values.coverUrl || undefined,
    };
    try {
      if (editing) {
        await updateBook.mutateAsync({ id: editing.id, input });
        toast("success", `Updated "${values.title}"`);
      } else {
        await createBook.mutateAsync(input);
        toast("success", `Added "${values.title}" to the catalog`);
      }
      onClose();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Couldn't save the book");
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? `Edit ${editing.title}` : "Add a book"}
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" error={errors.title?.message}>
            {(props) => <Input {...props} {...register("title")} />}
          </Field>
          <Field label="Author" error={errors.author?.message}>
            {(props) => <Input {...props} {...register("author")} />}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ISBN" error={errors.isbn?.message}>
            {(props) => <Input {...props} {...register("isbn")} />}
          </Field>
          <Field label="Cover URL" optional error={errors.coverUrl?.message}>
            {(props) => <Input {...props} type="url" {...register("coverUrl")} />}
          </Field>
        </div>
        <Field label="Description" optional error={errors.description?.message}>
          {(props) => <Textarea {...props} rows={2} {...register("description")} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" error={errors.category?.message}>
            {(props) => <Input {...props} placeholder="Fiction" {...register("category")} />}
          </Field>
          <Field label="Language" error={errors.language?.message}>
            {(props) => <Input {...props} placeholder="English" {...register("language")} />}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Copies" error={errors.totalCopies?.message}>
            {(props) => <Input {...props} type="number" min={1} {...register("totalCopies")} />}
          </Field>
          <Field label="Price (₹)" error={errors.purchasePrice?.message}>
            {(props) => (
              <Input {...props} type="number" min={0} step="0.01" {...register("purchasePrice")} />
            )}
          </Field>
          <Field label="Pages" optional error={errors.pageCount?.message}>
            {(props) => <Input {...props} type="number" {...register("pageCount")} />}
          </Field>
          <Field label="Year" optional error={errors.publishedYear?.message}>
            {(props) => <Input {...props} type="number" {...register("publishedYear")} />}
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : editing ? "Save changes" : "Add book"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
