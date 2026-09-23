import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { completeOnboarding } from "./actions";

export const metadata: Metadata = {
  title: "Create your profile",
  description:
    "Choose your My Top 100 username and profile visibility.",
};

type OnboardingPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  if (session.user.status === "SUSPENDED") {
    redirect("/suspended");
  }

  if (session.user.username) {
    redirect(
      session.user.status === "APPROVED"
        ? "/"
        : "/pending",
    );
  }

  const parameters = await searchParams;

  const error = Array.isArray(parameters.error)
    ? parameters.error[0]
    : parameters.error;

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-neutral-950 px-4 py-12 text-white">
      <section className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
          One last step
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Create your profile
        </h1>

        <p className="mt-4 leading-7 text-neutral-400">
          Choose how you will appear on My Top 100.
          Your three charts will start empty once your
          account has been approved.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        <form
          action={completeOnboarding}
          className="mt-7 space-y-6"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Username
            </span>

            <input
              required
              name="username"
              type="text"
              minLength={3}
              maxLength={24}
              pattern="[A-Za-z0-9_-]+"
              autoComplete="username"
              placeholder="Choose a username"
              className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 outline-none transition focus:border-sky-400"
            />

            <span className="mt-2 block text-xs leading-5 text-neutral-500">
              3–24 characters using letters, numbers,
              underscores or hyphens.
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              A short note for Svenno
            </span>

            <textarea
              name="applicationMessage"
              maxLength={500}
              rows={4}
              placeholder="Let Svenno know who you are…"
              className="w-full resize-y rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none transition focus:border-sky-400"
            />

            <span className="mt-2 block text-xs leading-5 text-neutral-500">
              Optional. This will only be visible during
              account approval.
            </span>
          </label>

          <label className="flex cursor-pointer gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <input
              name="isProfilePublic"
              type="checkbox"
              className="mt-1 h-4 w-4 accent-sky-400"
            />

            <span>
              <span className="block text-sm font-semibold">
                Make my profile public
              </span>

              <span className="mt-1 block text-xs leading-5 text-neutral-500">
                Other people will be able to view your
                charts, but only you can edit them. You can
                change this later.
              </span>
            </span>
          </label>

          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-sky-400 px-5 font-semibold text-neutral-950 transition hover:bg-sky-300"
          >
            Submit for approval
          </button>
        </form>
      </section>
    </main>
  );
}