import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Check,
  Pencil,
  Trash2,
  NotebookPen,
  ClipboardList,
  Pin,
} from "lucide-react";
import type { Task, Memo } from "@shared/schema";
import { useTasks, useMemos } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { prettyDate } from "@/lib/booking-utils";
import {
  PageHeader,
  Field,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from "./product-ui";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
export default function WorkItems({ kind }: { kind: "tasks" | "memos" }) {
  const tasks = useTasks();
  const memos = useMemos();
  const query = kind === "tasks" ? tasks : memos;
  const isTask = kind === "tasks";
  const { providerId } = useAuth();
  const client = useQueryClient();
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState("All");
  const [editing, setEditing] = useState<Task | Memo | "new" | null>(null);
  const [remove, setRemove] = useState<Task | Memo | null>(null);
  const item = editing && editing !== "new" ? editing : null;
  const mutation = useMutation({
    mutationFn: async ({
      method,
      id,
      data,
    }: {
      method: string;
      id?: number;
      data?: unknown;
    }) => {
      await apiRequest(method, "/api/" + kind + (id ? "/" + id : ""), data);
    },
    onSuccess: async () => {
      await client.invalidateQueries();
      setEditing(null);
      setRemove(null);
    },
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      title: String(f.get("title")),
      ...(isTask
        ? {
            description: String(f.get("description")),
            status: String(f.get("status")),
            priority: String(f.get("priority")),
            dueDate: String(f.get("dueDate")) || null,
          }
        : {
            content: String(f.get("content")),
            category: String(f.get("category")),
            isImportant: f.get("isImportant") === "on",
          }),
      ...(item ? {} : { providerId }),
    };
    mutation.mutate({ method: item ? "PATCH" : "POST", id: item?.id, data });
  };
  const records = (query.data ?? [])
    .filter(
      (i) =>
        (i.title + " " + ("content" in i ? i.content : (i.description ?? "")))
          .toLowerCase()
          .includes(term.toLowerCase()) &&
        (filter === "All" ||
          (isTask &&
            "status" in i &&
            (filter === "Open"
              ? i.status !== "completed"
              : i.status === "completed")) ||
          (!isTask && "isImportant" in i && i.isImportant)),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime(),
    );
  const edit = (value: Task | Memo | "new") => {
    mutation.reset();
    setEditing(value);
  };
  return (
    <>
      <PageHeader
        eyebrow={isTask ? "Move your day forward" : "A place for your thinking"}
        title={isTask ? "Tasks" : "Notes"}
        description={
          isTask
            ? "Keep the next step clear, one task at a time."
            : "Capture what matters. Keep useful details close."
        }
        actions={
          <button className="btn btn-primary" onClick={() => edit("new")}>
            <Plus size={17} />
            {isTask ? "New task" : "New note"}
          </button>
        }
      />
      <section className={isTask ? "card" : ""}>
        <div
          className={isTask ? "filters" : "spread"}
          style={isTask ? undefined : { marginBottom: 24, flexWrap: "wrap" }}
        >
          <div className="search-wrap">
            <Search size={17} />
            <input
              className="search-field"
              aria-label={isTask ? "Search tasks" : "Search notes"}
              placeholder={isTask ? "Find a task…" : "Find a note…"}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>
          <div className="segmented">
            {(isTask ? ["All", "Open", "Completed"] : ["All", "Important"]).map(
              (f) => (
                <button
                  key={f}
                  className={filter === f ? "active" : ""}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ),
            )}
          </div>
        </div>
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState retry={() => query.refetch()} />
        ) : !records.length ? (
          <div className={isTask ? "" : "card"}>
            <EmptyState
              icon={isTask ? ClipboardList : NotebookPen}
              title={
                isTask
                  ? "A clear list. A fresh start."
                  : "Save a thought for later."
              }
              description={
                term
                  ? "Nothing matches your search. Try another word or clear the filter."
                  : isTask
                    ? "Add your first task and make the next step a little easier."
                    : "Use private notes for ideas, reminders and details you want to keep."
              }
              action={
                <button
                  className="btn btn-secondary"
                  onClick={() => edit("new")}
                >
                  {isTask ? "Add a task" : "Write a note"}
                </button>
              }
            />
          </div>
        ) : isTask ? (
          <div>
            {records.map((record) => {
              const t = record as Task;
              return (
                <div
                  className={
                    "task-row " +
                    (t.status === "completed" ? "task-complete" : "")
                  }
                  key={t.id}
                >
                  <button
                    className={
                      "task-check " +
                      (t.status === "completed" ? "checked" : "")
                    }
                    disabled={mutation.isPending}
                    aria-label={
                      (t.status === "completed" ? "Reopen " : "Complete ") +
                      t.title
                    }
                    onClick={() =>
                      mutation.mutate({
                        method: "PATCH",
                        id: t.id,
                        data: {
                          status:
                            t.status === "completed" ? "pending" : "completed",
                        },
                      })
                    }
                  >
                    {t.status === "completed" && <Check size={16} />}
                  </button>
                  <div className="task-content">
                    <h3>{t.title}</h3>
                    {t.description && <p>{t.description}</p>}
                  </div>
                  <div className="task-meta">
                    {t.dueDate && (
                      <span>Due {prettyDate(t.dueDate, true)}</span>
                    )}
                    <StatusBadge status={t.priority ?? "medium"} />
                    <StatusBadge status={t.status ?? "pending"} />
                  </div>
                  <button
                    aria-label={"Edit " + t.title}
                    className="icon-button"
                    onClick={() => edit(t)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    aria-label={"Delete " + t.title}
                    className="icon-button"
                    onClick={() => {
                      mutation.reset();
                      setRemove(t);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="three-columns">
            {records.map((record) => {
              const n = record as Memo;
              return (
                <article className="card note-card" key={n.id}>
                  <div className="spread">
                    <div>
                      <span className="section-label">
                        {n.category ?? "General"}
                      </span>
                      <h2 style={{ margin: "9px 0 0" }}>{n.title}</h2>
                    </div>
                    {n.isImportant && <Pin size={17} color="#7394ce" />}
                  </div>
                  <p>{n.content}</p>
                  <div className="spread">
                    <time>
                      {n.updatedAt
                        ? new Date(n.updatedAt).toLocaleDateString("en-GB", {
                            timeZone: "Africa/Blantyre",
                          })
                        : ""}
                    </time>
                    <div className="inline">
                      <button
                        aria-label={"Edit " + n.title}
                        className="icon-button"
                        onClick={() => edit(n)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        aria-label={"Delete " + n.title}
                        className="icon-button"
                        onClick={() => {
                          mutation.reset();
                          setRemove(n);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {mutation.error && !editing && !remove && (
        <p role="alert" className="form-error section-space">
          {mutation.error.message}
        </p>
      )}
      <Dialog
        open={!!editing}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogTitle>
            {item ? "Edit" : "New"} {isTask ? "task" : "note"}
          </DialogTitle>
          <DialogDescription>
            {isTask
              ? "Set a clear next action for your working day."
              : "Private to your professional workspace."}
          </DialogDescription>
          <form
            onSubmit={submit}
            className="form-stack"
            key={item?.id ?? "new"}
          >
            <Field label="Title">
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={item?.title ?? ""}
              />
            </Field>
            <Field label={isTask ? "Description" : "Your note"}>
              <textarea
                name={isTask ? "description" : "content"}
                required={!isTask}
                maxLength={10000}
                defaultValue={
                  item
                    ? "content" in item
                      ? item.content
                      : (item.description ?? "")
                    : ""
                }
              />
            </Field>
            {isTask ? (
              <>
                <div className="form-grid">
                  <Field label="Status">
                    <select
                      name="status"
                      defaultValue={
                        item && "status" in item
                          ? (item.status ?? "pending")
                          : "pending"
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </Field>
                  <Field label="Priority">
                    <select
                      name="priority"
                      defaultValue={
                        item && "priority" in item
                          ? (item.priority ?? "medium")
                          : "medium"
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </Field>
                </div>
                <Field label="Due date (optional)">
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={
                      item && "dueDate" in item ? (item.dueDate ?? "") : ""
                    }
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Category">
                  <select
                    name="category"
                    defaultValue={
                      item && "category" in item
                        ? (item.category ?? "general")
                        : "general"
                    }
                  >
                    {["general", "ideas", "clients", "operations"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <label className="inline small">
                  <input
                    type="checkbox"
                    name="isImportant"
                    defaultChecked={
                      !!(item && "isImportant" in item && item.isImportant)
                    }
                  />
                  Pin as important
                </label>
              </>
            )}
            {mutation.error && (
              <p className="form-error" role="alert">
                {mutation.error.message}
              </p>
            )}
            <button className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending
                ? "Saving…"
                : "Save " + (isTask ? "task" : "note")}
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!remove}
        onOpenChange={(v) => {
          if (!v) setRemove(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Delete this {isTask ? "task" : "note"}?</DialogTitle>
          <DialogDescription>
            “{remove?.title}” will be permanently removed from your workspace.
          </DialogDescription>
          {mutation.error && (
            <p className="form-error">{mutation.error.message}</p>
          )}
          <div className="inline">
            <button
              className="btn btn-danger"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({ method: "DELETE", id: remove?.id })
              }
            >
              Delete {isTask ? "task" : "note"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setRemove(null)}
            >
              Keep it
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
