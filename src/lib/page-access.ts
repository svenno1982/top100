import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireApprovedPageUser() {
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

  if (session.user.status !== "APPROVED") {
    redirect("/pending");
  }

  return session.user;
}

export async function requireAdminPageUser() {
  const user = await requireApprovedPageUser();

  if (user.role !== "ADMIN") {
    redirect("/");
  }

  return user;
}