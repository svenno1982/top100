import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata: Metadata = {
  title: "Approval pending",
  description:
    "Your My Top 100 account is awaiting approval.",
};

export default async function PendingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  if (session.user.status === "SUSPENDED") {
    redirect("/suspended");
  }

  if (!session.user.username) {
    redirect("/onboarding");
  }

  if (session.user.status === "APPROVED") {
    redirect("/");
  }

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-neutral-950 px-4 py-12 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center shadow-2xl sm:p-8">
        <div
          aria-hidden="true"
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-xl font-bold text-amber-300"
        >
          …
        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
          Approval pending
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Thanks, {session.user.username}
        </h1>

        <p className="mt-4 leading-7 text-neutral-400">
          Your profile has been submitted. Svenno will
          review your request before your three Top 100
          charts become available.
        </p>

        <div className="mt-7 space-y-3">
          <Link
            href="/pending"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-400 px-5 font-semibold text-neutral-950 transition hover:bg-sky-300"
          >
            Check approval status
          </Link>

          <SignOutButton
            className="h-12 w-full rounded-xl border border-neutral-700 px-5 font-semibold text-neutral-300 transition hover:border-neutral-600 hover:bg-neutral-800 hover:text-white"
          />
        </div>
      </section>
    </main>
  );
}