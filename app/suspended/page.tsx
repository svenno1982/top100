import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata: Metadata = {
  title: "Account suspended",
  description:
    "This My Top 100 account is currently suspended.",
};

export default async function SuspendedPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  if (session.user.status === "APPROVED") {
    redirect("/");
  }

  if (
    session.user.status === "PENDING" &&
    !session.user.username
  ) {
    redirect("/onboarding");
  }

  if (session.user.status === "PENDING") {
    redirect("/pending");
  }

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-neutral-950 px-4 py-12 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center shadow-2xl sm:p-8">
        <div
          aria-hidden="true"
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 text-xl font-bold text-red-300"
        >
          !
        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Account unavailable
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Your account is suspended
        </h1>

        <p className="mt-4 leading-7 text-neutral-400">
          Your charts have not been deleted, but you cannot
          view or edit them while the account is suspended.
          Contact Svenno if you think this is a mistake.
        </p>

        <div className="mt-7">
          <SignOutButton
            className="h-12 w-full rounded-xl border border-neutral-700 px-5 font-semibold text-neutral-300 transition hover:border-neutral-600 hover:bg-neutral-800 hover:text-white"
          />
        </div>
      </section>
    </main>
  );
}