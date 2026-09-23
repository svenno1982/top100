"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import {
  createInvitationToken,
  hashInvitationToken,
  invitationBaseUrl,
  invitationExpiryDate,
  isInvitationExpiryOption,
  normalizeInvitationEmail,
} from "@/lib/invitations";
import { prisma } from "@/lib/prisma";

export type CreateInvitationState = {
  error: string | null;
  inviteLink: string | null;
  invitedEmail: string | null;
};

const invitationEmailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address")
  .max(254, "The email address is too long");

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

export async function createInvitation(
  _previousState: CreateInvitationState,
  formData: FormData,
): Promise<CreateInvitationState> {
  const administrator =
    await requireAdministrator();

  const emailResult = invitationEmailSchema.safeParse(
    formData.get("email"),
  );

  if (!emailResult.success) {
    return {
      error:
        emailResult.error.issues[0]?.message ??
        "Enter a valid email address",
      inviteLink: null,
      invitedEmail: null,
    };
  }

  const expiryDays = Number(
    formData.get("expiryDays"),
  );

  if (!isInvitationExpiryOption(expiryDays)) {
    return {
      error: "Select a valid invitation expiry",
      inviteLink: null,
      invitedEmail: null,
    };
  }

  const email = normalizeInvitationEmail(
    emailResult.data,
  );

  const existingUser = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: {
      status: true,
    },
  });

  if (existingUser?.status === "APPROVED") {
    return {
      error: "That email already has an approved account",
      inviteLink: null,
      invitedEmail: null,
    };
  }

  if (existingUser?.status === "SUSPENDED") {
    return {
      error:
        "That account is suspended. Restore it from the user list instead.",
      inviteLink: null,
      invitedEmail: null,
    };
  }

  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = invitationExpiryDate(expiryDays);
  const baseUrl = invitationBaseUrl();

  await prisma.$transaction([
    prisma.invitation.updateMany({
      where: {
        email,
        acceptedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    }),
    prisma.invitation.create({
      data: {
        email,
        tokenHash,
        expiresAt,
        createdById: administrator.id,
      },
    }),
  ]);

  revalidatePath("/admin/users");

  return {
    error: null,
    inviteLink: `${baseUrl}/invite/${token}`,
    invitedEmail: email,
  };
}

export async function revokeInvitation(
  formData: FormData,
) {
  await requireAdministrator();

  const invitationId = formData.get("invitationId");

  if (
    typeof invitationId !== "string" ||
    !invitationId
  ) {
    return;
  }

  await prisma.invitation.updateMany({
    where: {
      id: invitationId,
      acceptedAt: null,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  revalidatePath("/admin/users");
}
