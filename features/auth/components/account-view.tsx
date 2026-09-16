"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { SubmitButton } from "@/components/ui/submit-button";
import { ROUTES } from "@/constants/routes";
import { EventModal } from "@/features/events/components/event-modal";
import {
  EventFormPageHeader,
  OrganizerBackRow,
} from "@/features/events/components/organizer-page-header";
import {
  useCurrentUser,
  useLogoutAllMutation,
} from "../hooks/use-auth-mutations";

const roleLabel = (role: string) =>
  role.charAt(0).toUpperCase() + role.slice(1).toLowerCase().replace(/_/g, " ");

function logoutAllMessage(error: unknown) {
  if (axios.isAxiosError(error) && !error.response)
    return "We couldn’t connect. Check your connection and try again.";
  return "We couldn’t log you out of every device. Please try again.";
}

export function AccountView() {
  const router = useRouter();
  const user = useCurrentUser();
  const logoutAll = useLogoutAllMutation();
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pending = logoutAll.isPending || logoutAll.isSuccess;

  return (
    <div className="site-container event-detail event-form-page">
      <OrganizerBackRow
        href={ROUTES.MY_EVENTS}
        label="Back to my events"
        eyebrow="Signed in"
      />
      <EventFormPageHeader
        eyebrow="Your account"
        title={
          <>
            Hello,
            <br />
            <em>{user.data ? `${user.data.firstName}.` : "there."}</em>
          </>
        }
        note="Your EventFlow profile and the sessions signed in to it."
      />
      <div className="event-detail-body">
        <section
          className="event-detail-section"
          aria-labelledby="account-profile-heading"
        >
          <p className="eyebrow">Profile</p>
          <h2 id="account-profile-heading">
            The <em>essentials.</em>
          </h2>
          {user.isPending ? (
            <div className="manage-event-facts" aria-hidden="true">
              {[0, 1, 2].map((index) => (
                <div key={index} className="space-y-3">
                  <div className="event-skeleton h-3 w-16 rounded" />
                  <div className="event-skeleton h-5 w-44 max-w-full rounded" />
                </div>
              ))}
            </div>
          ) : user.isError ? (
            <p className="explore-reference-error" role="status">
              We couldn’t load your profile.{" "}
              <button
                type="button"
                onClick={() => {
                  void user.refetch();
                }}
              >
                Try again
              </button>
            </p>
          ) : (
            <dl className="manage-event-facts">
              <div>
                <dt>Name</dt>
                <dd>{`${user.data.firstName} ${user.data.lastName}`.trim()}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user.data.email}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{roleLabel(user.data.role)}</dd>
              </div>
            </dl>
          )}
          <p className="manage-event-muted mt-6">
            Profile details can’t be changed from EventFlow yet.
          </p>
        </section>

        <aside className="event-detail-aside">
          <section
            className="event-detail-facts manage-lifecycle"
            aria-labelledby="account-security-heading"
          >
            <p className="eyebrow">Sessions & security</p>
            <h2 id="account-security-heading">Signed in here.</h2>
            <p className="manage-lifecycle-note">
              Signed in somewhere you no longer use? Log out everywhere to end
              every EventFlow session, including this one.
            </p>
            <div className="manage-lifecycle-danger">
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setConfirming(true)}
              >
                <LogOut size={15} aria-hidden="true" />
                Log out from all devices
              </button>
            </div>
          </section>
        </aside>
      </div>

      {confirming && (
        <EventModal
          eyebrow="Sessions & security"
          title="Log out from all devices?"
          description="Every EventFlow session ends, including this one. You’ll need to log in again."
          closeLabel="Close log out from all devices"
          busy={pending}
          onClose={() => {
            setConfirming(false);
            logoutAll.reset();
            triggerRef.current?.focus();
          }}
        >
          {(close) => (
            <form
              noValidate
              aria-busy={pending}
              onSubmit={(event) => {
                event.preventDefault();
                logoutAll.mutate(undefined, {
                  onSuccess: () => router.replace(ROUTES.LOGIN),
                });
              }}
            >
              {logoutAll.isError && (
                <div className="event-modal-feedback">
                  <FormError message={logoutAllMessage(logoutAll.error)} />
                </div>
              )}
              <div className="explore-dialog-actions">
                <Button variant="secondary" disabled={pending} onClick={close}>
                  Stay signed in
                </Button>
                <SubmitButton
                  pending={pending}
                  pendingLabel="Logging out…"
                  variant="danger"
                  className="min-w-44"
                >
                  Log out everywhere
                </SubmitButton>
              </div>
            </form>
          )}
        </EventModal>
      )}
    </div>
  );
}
