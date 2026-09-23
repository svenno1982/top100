import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to create and manage your Top 100 charts.",
};

export default async function SignInPage() {
  const session = await auth();

  if (session?.user?.id) {
    if (session.user.status === "SUSPENDED") {
      redirect("/suspended");
    }

    if (!session.user.username) {
      redirect("/onboarding");
    }

    if (session.user.status === "PENDING") {
      redirect("/pending");
    }

    if (session.user.status === "APPROVED") {
      redirect("/");
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-neutral-950 px-4 py-12 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
          My Top 100
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Build your definitive lists
        </h1>

        <p className="mt-4 leading-7 text-neutral-400">
          Sign in with Google to create your own album,
          film and song charts.
        </p>

        <div className="my-7 grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-4">
            Albums
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-4">
            Films
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-4">
            Songs
          </div>
        </div>

        <form
          action={async () => {
            "use server";

            await signIn("google", {
              redirectTo: "/",
            });
          }}
        >
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

            Continue with Google
          </button>
        </form>

        <p className="mt-5 text-center text-xs leading-5 text-neutral-500">
          New accounts choose a username and remain
          private until they have been approved.
        </p>
      </section>
    </main>
  );
}