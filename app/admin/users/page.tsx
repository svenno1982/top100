import type { Metadata } from "next";
import Link from "next/link";
import {
  approveUser,
  suspendUser,
} from "./actions";
import { InvitationManager } from "./InvitationManager";
import { prisma } from "@/lib/prisma";
import { requireAdminPageUser } from "@/lib/page-access";

export const metadata: Metadata = {
  title: "User administration",
  description:
    "Review and manage My Top 100 accounts.",
};

type ManagedUser = {
  id: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  applicationMessage: string | null;
  isProfilePublic: boolean;
  isSiteOwner: boolean;
  role: "USER" | "ADMIN";
  status: "PENDING" | "APPROVED" | "SUSPENDED";
  createdAt: Date;
  _count: {
    albums: number;
    films: number;
    songs: number;
  };
};

const dateFormatter = new Intl.DateTimeFormat(
  "en-GB",
  {
    dateStyle: "medium",
    timeZone: "UTC",
  },
);

function statusClasses(status: ManagedUser["status"]) {
  if (status === "APPROVED") {
    return "border-emerald-700 bg-emerald-950/60 text-emerald-300";
  }

  if (status === "SUSPENDED") {
    return "border-red-800 bg-red-950/60 text-red-300";
  }

  return "border-amber-700 bg-amber-950/60 text-amber-300";
}

function UserCard({
  user,
}: {
  user: ManagedUser;
}) {
  return (
    <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-bold">
              {user.displayName ??
                user.username ??
                "Profile incomplete"}
            </h2>

            {user.isSiteOwner && (
              <svg
                viewBox="0 0 24 24"
                role="img"
                aria-label="Site owner"
                className="h-5 w-5 fill-amber-300"
              >
                <path d="M3 6l4.5 4L12 4l4.5 6L21 6l-2 12H5L3 6Zm3.7 10h10.6l1-6.1-2.1 1.9L12 6.2l-4.2 5.6-2.1-1.9 1 6.1Z" />
              </svg>
            )}

            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${statusClasses(
                user.status,
              )}`}
            >
              {user.status.toLowerCase()}
            </span>
          </div>

          <p className="mt-1 text-sm text-neutral-400">
            {user.username
              ? `@${user.username}`
              : "Username not selected"}
            {" · "}
            {user.email ?? "No email recorded"}
          </p>

          <p className="mt-2 text-xs text-neutral-500">
            Joined {dateFormatter.format(user.createdAt)}
            {" · "}
            {user.isProfilePublic
              ? "Public profile"
              : "Private profile"}
            {" · "}
            {user.role.toLowerCase()}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          {user.username && (
            <Link
              href={`/users/${encodeURIComponent(
                user.username,
              )}`}
              className="flex h-10 items-center rounded-xl border border-neutral-700 px-4 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
            >
              View charts
            </Link>
          )}

          {user.status !== "APPROVED" &&
            user.username && (
              <form action={approveUser}>
                <input
                  type="hidden"
                  name="userId"
                  value={user.id}
                />

                <button
                  type="submit"
                  className="h-10 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-300"
                >
                  {user.status === "SUSPENDED"
                    ? "Restore"
                    : "Approve"}
                </button>
              </form>
            )}

          {user.status === "APPROVED" &&
            !user.isSiteOwner && (
              <form action={suspendUser}>
                <input
                  type="hidden"
                  name="userId"
                  value={user.id}
                />

                <button
                  type="submit"
                  className="h-10 rounded-xl border border-red-800 px-4 text-sm font-semibold text-red-300 transition hover:bg-red-950"
                >
                  Suspend
                </button>
              </form>
            )}
        </div>
      </div>

      {user.applicationMessage && (
        <blockquote className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm leading-6 text-neutral-300">
          {user.applicationMessage}
        </blockquote>
      )}

      {!user.username && (
        <p className="mt-4 rounded-xl border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          This user has signed in but has not completed
          profile setup.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-400">
        <span className="rounded-lg bg-neutral-800 px-3 py-2">
          {user._count.albums} albums
        </span>

        <span className="rounded-lg bg-neutral-800 px-3 py-2">
          {user._count.films} films
        </span>

        <span className="rounded-lg bg-neutral-800 px-3 py-2">
          {user._count.songs} songs
        </span>
      </div>
    </article>
  );
}

export default async function UsersAdminPage() {
  await requireAdminPageUser();

  const [users, invitations] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        applicationMessage: true,
        isProfilePublic: true,
        isSiteOwner: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            albums: true,
            films: true,
            songs: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.invitation.findMany({
      select: {
        id: true,
        email: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        createdAt: true,
        createdBy: {
          select: {
            username: true,
            email: true,
          },
        },
        acceptedBy: {
          select: {
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    }),
  ]);

  const now = new Date();
  const invitationSummaries = invitations.map(
    (invitation) => ({
      id: invitation.id,
      email: invitation.email,
      status: invitation.acceptedAt
        ? ("ACCEPTED" as const)
        : invitation.revokedAt
          ? ("REVOKED" as const)
          : invitation.expiresAt <= now
            ? ("EXPIRED" as const)
            : ("PENDING" as const),
      createdAt: invitation.createdAt.toISOString(),
      expiresAt: invitation.expiresAt.toISOString(),
      acceptedAt:
        invitation.acceptedAt?.toISOString() ?? null,
      createdBy:
        invitation.createdBy.username ??
        invitation.createdBy.email ??
        "Administrator",
      acceptedBy:
        invitation.acceptedBy?.username ??
        invitation.acceptedBy?.email ??
        null,
    }),
  );

  const pendingUsers = users.filter(
    (user) => user.status === "PENDING",
  );

  const approvedUsers = users.filter(
    (user) => user.status === "APPROVED",
  );

  const suspendedUsers = users.filter(
    (user) => user.status === "SUSPENDED",
  );

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
            Administration
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            User approvals
          </h1>

          <p className="mt-4 text-neutral-400">
            Review new applications and manage existing
            accounts.
          </p>
        </header>

        <InvitationManager
          invitations={invitationSummaries}
        />

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Awaiting approval
            </h2>

            <span className="text-sm text-neutral-500">
              {pendingUsers.length}
            </span>
          </div>

          <div className="space-y-4">
            {pendingUsers.length > 0 ? (
              pendingUsers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                />
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-neutral-800 px-5 py-8 text-center text-neutral-500">
                No accounts are awaiting approval.
              </p>
            )}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Approved users
            </h2>

            <span className="text-sm text-neutral-500">
              {approvedUsers.length}
            </span>
          </div>

          <div className="space-y-4">
            {approvedUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
              />
            ))}
          </div>
        </section>

        {suspendedUsers.length > 0 && (
          <section className="mt-12">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Suspended users
              </h2>

              <span className="text-sm text-neutral-500">
                {suspendedUsers.length}
              </span>
            </div>

            <div className="space-y-4">
              {suspendedUsers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
