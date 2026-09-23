"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdministrator() {
  const session = await auth();

  if (
    !session?.user?.id ||
    session.user.status !== "APPROVED" ||
    session.user.role !== "ADMIN"
  ) {
    throw new Error(
      "Administrator access is required",
    );
  }

  return session.user;
}

function getUserId(formData: FormData) {
  const value = formData.get("userId");

  return typeof value === "string" && value
    ? value
    : null;
}

export async function approveUser(
  formData: FormData,
) {
  const administrator =
    await requireAdministrator();

  const userId = getUserId(formData);

  if (!userId) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      username: true,
    },
  });

  if (!user?.username) {
    return;
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedById: administrator.id,
    },
  });

  revalidatePath("/admin/users");
}

export async function suspendUser(
  formData: FormData,
) {
  const administrator =
    await requireAdministrator();

  const userId = getUserId(formData);

  if (!userId || userId === administrator.id) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      isSiteOwner: true,
    },
  });

  if (!user || user.isSiteOwner) {
    return;
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      status: "SUSPENDED",
    },
  });

  revalidatePath("/admin/users");
}