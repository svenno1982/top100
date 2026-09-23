"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireApprovedPageUser } from "@/lib/page-access";

export async function updateProfileVisibility(
  formData: FormData,
) {
  const user = await requireApprovedPageUser();
  const visibility = formData.get("visibility");

  if (
    visibility !== "public" &&
    visibility !== "private"
  ) {
    throw new Error("Invalid profile visibility.");
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      isProfilePublic: visibility === "public",
    },
  });

  revalidatePath(`/users/${user.username}`);
  revalidatePath("/admin/users");
}
