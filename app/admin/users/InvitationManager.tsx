"use client";

import {
  useActionState,
  useState,
} from "react";
import {
  createInvitation,
  revokeInvitation,
} from "./invitation-actions";
import type { CreateInvitationState } from "./invitation-actions";

const initialCreateInvitationState: CreateInvitationState = {
  error: null,
  inviteLink: null,
  invitedEmail: null,
};

type InvitationSummary = {
  id: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdBy: string;
  acceptedBy: string | null;
};

type InvitationManagerProps = {
  invitations: InvitationSummary[];
};

const dateFormatter = new Intl.DateTimeFormat(
  "en-GB",
  {
    dateStyle: "medium",
    timeStyle: "short",
  },
);

function statusClasses(
  status: InvitationSummary["status"],
) {
  if (status === "ACCEPTED") {
    return "border-emerald-700 bg-emerald-950/60 text-emerald-300";
  }

  if (status === "PENDING") {
    return "border-sky-700 bg-sky-950/60 text-sky-300";
  }

  if (status === "REVOKED") {
    return "border-red-800 bg-red-950/60 text-red-300";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-400";
}

export function InvitationManager({
  invitations,
}: InvitationManagerProps) {
  const [state, formAction, isPending] =
    useActionState(
      createInvitation,
      initialCreateInvitationState,
    );
  const [copyResult, setCopyResult] = useState<{
    link: string;
    status: "copied" | "failed";
  } | null>(null);

  async function copyInviteLink() {
    if (!state.inviteLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        state.inviteLink,
      );
      setCopyResult({
        link: state.inviteLink,
        status: "copied",
      });
    } catch {
      setCopyResult({
        link: state.inviteLink,
        status: "failed",
      });
    }
  }

  return (
    <section className="mb-12">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">
          Invitations
        </h2>

        <p className="mt-2 text-sm leading-6 text-neutral-400">
          Create a single-use invitation tied to the
          recipient&apos;s verified Google email address.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <form
          action={formAction}
          className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem_auto] md:items-end"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Email address
            </span>

            <input
              required
              name="email"
              type="email"
              autoComplete="off"
              placeholder="person@example.com"
              className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 outline-none transition focus:border-sky-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Expires after
            </span>

            <select
              name="expiryDays"
              defaultValue="7"
              className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 outline-none transition focus:border-sky-400"
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="h-11 rounded-xl bg-sky-400 px-5 font-semibold text-neutral-950 transition hover:bg-sky-300 disabled:cursor-wait disabled:opacity-60"
          >
            {isPending
              ? "Creating…"
              : "Create invitation"}
          </button>
        </form>

        {state.error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-200"
          >
            {state.error}
          </p>
        )}

        {state.inviteLink && (
          <div className="mt-5 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4">
            <p className="text-sm font-semibold text-emerald-300">
              Invitation created for {state.invitedEmail}
            </p>

            <p className="mt-1 text-xs leading-5 text-neutral-400">
              Copy this link now. For security, the usable
              token is not stored and cannot be displayed
              again.
            </p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={state.inviteLink}
                aria-label="Invitation link"
                className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-neutral-300"
              />

              <button
                type="button"
                onClick={() => void copyInviteLink()}
                className="h-11 rounded-xl border border-emerald-700 px-4 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-950"
              >
                {copyResult?.link === state.inviteLink &&
                copyResult.status === "copied"
                  ? "Copied"
                  : "Copy link"}
              </button>
            </div>

            {copyResult?.link === state.inviteLink &&
              copyResult.status === "failed" && (
              <p className="mt-2 text-xs text-amber-300">
                Automatic copying failed. Select and copy
                the link manually.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {invitations.length > 0 ? (
          invitations.map((invitation) => (
            <article
              key={invitation.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">
                      {invitation.email}
                    </p>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${statusClasses(
                        invitation.status,
                      )}`}
                    >
                      {invitation.status.toLowerCase()}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-neutral-500">
                    Created {dateFormatter.format(new Date(invitation.createdAt))}
                    {" by "}
                    {invitation.createdBy}
                    {" · Expires "}
                    {dateFormatter.format(new Date(invitation.expiresAt))}
                  </p>

                  {invitation.acceptedAt && (
                    <p className="mt-1 text-xs text-neutral-500">
                      Accepted {dateFormatter.format(new Date(invitation.acceptedAt))}
                      {invitation.acceptedBy
                        ? ` by ${invitation.acceptedBy}`
                        : ""}
                    </p>
                  )}
                </div>

                {invitation.status === "PENDING" && (
                  <form action={revokeInvitation}>
                    <input
                      type="hidden"
                      name="invitationId"
                      value={invitation.id}
                    />

                    <button
                      type="submit"
                      className="h-10 rounded-xl border border-red-800 px-4 text-sm font-semibold text-red-300 transition hover:bg-red-950"
                    >
                      Revoke
                    </button>
                  </form>
                )}
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-neutral-800 px-5 py-8 text-center text-neutral-500">
            No invitations have been created yet.
          </p>
        )}
      </div>
    </section>
  );
}
