import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, Plus, Clock3, Pencil, Archive } from "lucide-react";
import type { Service } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useServices } from "@/hooks/useWorkspace";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { money } from "@/lib/booking-utils";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  ErrorState,
  Field,
} from "@/components/product-ui";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export default function Services() {
  const { providerId } = useAuth();
  const query = useServices();
  const client = useQueryClient();
  const { toast } = useToast();
  const [editor, setEditor] = useState<Service | "new" | null>(null);
  const [archive, setArchive] = useState<Service | null>(null);
  const edit = editor && editor !== "new" ? editor : null;
  const mutation = useMutation({
    mutationFn: async ({
      method,
      url,
      data,
    }: {
      method: string;
      url: string;
      data?: unknown;
    }) => {
      await apiRequest(method, url, data);
    },
    onSuccess: async () => {
      await client.invalidateQueries();
      setEditor(null);
      setArchive(null);
      toast({
        title: "Services updated",
        description: "Your booking page is up to date.",
      });
    },
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    mutation.mutate({
      method: edit ? "PATCH" : "POST",
      url: edit ? "/api/services/" + edit.id : "/api/services",
      data: {
        ...(edit ? {} : { providerId }),
        name: String(data.get("name")),
        description: String(data.get("description")),
        duration: Number(data.get("duration")),
        price: String(data.get("price")),
      },
    });
  };
  const add = () => {
    mutation.reset();
    setEditor("new");
  };
  return (
    <>
      <PageHeader
        eyebrow="What you do best"
        title="Services"
        description="Give every appointment a clear purpose, duration and price."
        actions={
          <button className="btn btn-primary" onClick={add}>
            <Plus size={17} />
            Add service
          </button>
        }
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState retry={() => query.refetch()} />
      ) : !query.data?.length ? (
        <section className="card">
          <EmptyState
            icon={BriefcaseBusiness}
            title="Make room for your first service."
            description="Publish the services clients can book, with a duration and price for each."
            action={
              <button className="btn btn-primary" onClick={add}>
                Add a service
              </button>
            }
          />
        </section>
      ) : (
        <div className="three-columns">
          {query.data.map((s) => (
            <article className="card service-card" key={s.id}>
              <div className="spread">
                <span
                  className="empty-icon"
                  style={{ width: 42, height: 42, borderRadius: 12, margin: 0 }}
                >
                  <BriefcaseBusiness size={20} />
                </span>
                <span className="status-badge status-confirmed">Bookable</span>
              </div>
              <h2>{s.name}</h2>
              <p>
                {s.description ||
                  "Clients can choose this service on your public booking page."}
              </p>
              <div className="inline small muted">
                <Clock3 size={16} />
                {s.duration} minutes
              </div>
              <div className="service-price">{money(s.price)}</div>
              <div className="card-actions">
                <button
                  className="btn btn-quiet btn-small"
                  onClick={() => {
                    mutation.reset();
                    setEditor(s);
                  }}
                >
                  <Pencil size={14} />
                  Edit service
                </button>
                <button
                  className="icon-button"
                  aria-label={"Archive " + s.name}
                  onClick={() => {
                    mutation.reset();
                    setArchive(s);
                  }}
                >
                  <Archive size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="small muted section-space">
        Service prices appear in MWK. Updating a price applies to new bookings;
        existing booking values stay as recorded.
      </p>
      <Dialog
        open={!!editor}
        onOpenChange={(v) => {
          if (!v) setEditor(null);
        }}
      >
        <DialogContent>
          <DialogTitle>{edit ? "Edit service" : "Add a service"}</DialogTitle>
          <DialogDescription>
            Details appear on your public booking page.
          </DialogDescription>
          <form
            className="form-stack"
            onSubmit={submit}
            key={edit?.id ?? "new"}
          >
            <Field label="Service name">
              <input
                name="name"
                defaultValue={edit?.name}
                required
                maxLength={200}
              />
            </Field>
            <Field label="Description">
              <textarea
                name="description"
                defaultValue={edit?.description ?? ""}
                maxLength={2000}
              />
            </Field>
            <div className="form-grid">
              <Field label="Duration in minutes">
                <input
                  name="duration"
                  type="number"
                  min={1}
                  max={720}
                  required
                  defaultValue={edit?.duration ?? 30}
                />
              </Field>
              <Field label="Price (MWK)">
                <input
                  name="price"
                  type="number"
                  min={0}
                  max={99999999.99}
                  step="0.01"
                  required
                  defaultValue={edit?.price}
                />
              </Field>
            </div>
            {mutation.error && (
              <p className="form-error" role="alert">
                {mutation.error.message}
              </p>
            )}
            <button disabled={mutation.isPending} className="btn btn-primary">
              {mutation.isPending ? "Saving…" : "Save service"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!archive}
        onOpenChange={(v) => {
          if (!v) setArchive(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Archive this service?</DialogTitle>
          <DialogDescription>
            {archive?.name} will no longer accept new bookings. Existing
            appointment records are kept.
          </DialogDescription>
          {mutation.error && (
            <p className="form-error">{mutation.error.message}</p>
          )}
          <div className="inline">
            <button
              className="btn btn-danger"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({
                  method: "DELETE",
                  url: "/api/services/" + archive?.id,
                })
              }
            >
              Archive service
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setArchive(null)}
            >
              Keep service
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
