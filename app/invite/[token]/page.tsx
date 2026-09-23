import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/SignOutButton";
import {
  hashInvitationToken,
  normalizeInvitationEmail,
} from "@/lib/invitations";
import { prisma } from "@/lib/prisma";
import { continueWithInvitation } from "./actions";

export const metadata: Metadata = {
  title: "Your invitation",
  description:
    "Accept an invitation to create My Top 100 charts.",
};

type InvitationPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

function maskedEmail(email: string) {
  const [localPart, domain] = email.split("@");

  if (!domain) {
    return email;
  }

  const visibleStart = localPart.slice(0, 1);
  const maskLength = Math.max(localPart.length - 1, 3);

  return `${visibleStart}${"•".repeat(maskLength)}@${domain}`;
}

function InvitationUnavailable({
  heading,
  message,
}: {
  heading: string;
  message: string;
}) {
  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-neutral-950 px-4 py-12 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center shadow-2xl sm:p-8">
        <div
          aria-hidden="true"
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-xl font-bold text-amber-300"
        >
          !
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          {heading}
        </h1>

        <p className="mt-4 leading-7 text-neutral-400">
          {message}
        </p>

        <a
          href="/signin"
          className="mt-7 flex h-12 w-full items-center justify-center rounded-xl border border-neutral-700 px-5 font-semibold text-neutral-300 transition hover:border-neutral-600 hover:bg-neutral-800 hover:text-white"
        >
          Go to sign in
        </a>
      </section>
    </main>
  );
}

export default async function InvitationPage({
  params,
  searchParams,
}: InvitationPageProps) {
  const { token } = await params;
  const parameters = await searchParams;
  const session = await auth();

  const invitation =
    await prisma.invitation.findUnique({
      where: {
        tokenHash: hashInvitationToken(token),
      },
      select: {
        email: true,
        expiresAt: true,
        acceptedAt: true,
        acceptedById: true,
        revokedAt: true,
      },
    });

  if (!invitation) {
    return (
      <InvitationUnavailable
        heading="Invitation not found"
        message="This invitation link is invalid. Ask the person who invited you to create a new one."
      />
    );
  }

  if (invitation.revokedAt) {
    return (
      <InvitationUnavailable
        heading="Invitation revoked"
        message="This invitation is no longer active. Ask the person who invited you to create a new one."
      />
    );
  }

  if (invitation.expiresAt <= new Date()) {
    return (
      <InvitationUnavailable
        heading="Invitation expired"
        message="This invitation has expired. Ask the person who invited you to create a new one."
      />
    );
  }

  if (invitation.acceptedAt) {
    if (
      session?.user?.id &&
      invitation.acceptedById === session.user.id
    ) {
      if (session.user.status === "SUSPENDED") {
        redirect("/suspended");
      }

      redirect(
        session.user.username ? "/" : "/onboarding",
      );
    }

    return (
      <InvitationUnavailable
        heading="Invitation already used"
        message="This invitation has already been accepted and cannot be used again."
      />
    );
  }

  const sessionEmail = session?.user?.email
    ? normalizeInvitationEmail(session.user.email)
    : null;
  const emailMatches =
    !sessionEmail || sessionEmail === invitation.email;
  const errorValue = Array.isArray(parameters.error)
    ? parameters.error[0]
    : parameters.error;

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-neutral-950 px-4 py-12 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
          You&apos;re invited
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Create your Top 100 charts
        </h1>

        <p className="mt-4 leading-7 text-neutral-400">
          This invitation is for {maskedEmail(invitation.email)}.
          Continue with that Google account to create your
          profile and begin building your lists.
        </p>

        {!emailMatches && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm leading-6 text-red-200"
          >
            You are currently signed in as {sessionEmail}.
            Sign out and use the Google account that received
            this invitation.
          </div>
        )}

        {errorValue === "email" && emailMatches && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm leading-6 text-red-200"
          >
            The signed-in Google account does not match this
            invitation, or the invitation is no longer active.
          </div>
        )}

        <div className="mt-7">
          {emailMatches ? (
            <form action={continueWithInvitation}>
              <input
                type="hidden"
                name="token"
                value={token}
              />

              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white px-5 font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 text-sm font-bold"
                >
                  G
                </span>

                {sessionEmail
                  ? "Accept invitation"
                  : "Continue with Google"}
              </button>
            </form>
          ) : (
            <SignOutButton
              className="h-12 w-full rounded-xl border border-neutral-700 px-5 font-semibold text-neutral-300 transition hover:border-neutral-600 hover:bg-neutral-800 hover:text-white"
              label="Sign out and use another account"
              redirectTo={`/invite/${encodeURIComponent(token)}`}
            />
          )}
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-neutral-500">
          The link can be used once and expires on{" "}
          {invitation.expiresAt.toLocaleDateString("en-GB", {
            dateStyle: "medium",
            timeZone: "UTC",
          })}
          .
        </p>
      </section>
    </main>
  );
}
