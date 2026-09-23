"use server";

import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import {
  hashInvitationToken,
  normalizeInvitationEmail,
} from "@/lib/invitations";
import { prisma } from "@/lib/prisma";

export async function continueWithInvitation(
  formData: FormData,
) {
  const tokenValue = formData.get("token");

  if (
    typeof tokenValue !== "string" ||
    !tokenValue
  ) {
    redirect("/signin");
  }

  const invitationPath = `/invite/${encodeURIComponent(
    tokenValue,
  )}`;
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    await signIn("google", {
      redirectTo: invitationPath,
    });

    return;
  }

  if (session.user.status === "SUSPENDED") {
    redirect("/suspended");
  }

  const now = new Date();
  const email = normalizeInvitationEmail(
    session.user.email,
  );
  const tokenHash = hashInvitationToken(tokenValue);

  const invitation =
    await prisma.invitation.findFirst({
      where: {
        tokenHash,
        email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      select: {
        id: true,
        createdById: true,
      },
    });

  if (!invitation) {
    redirect(`${invitationPath}?error=email`);
  }

  const accepted = await prisma.$transaction(
    async (transaction) => {
      const result =
        await transaction.invitation.updateMany({
          where: {
            id: invitation.id,
            acceptedAt: null,
            revokedAt: null,
            expiresAt: {
              gt: now,
            },
          },
          data: {
            acceptedAt: now,
            acceptedById: session.user.id,
          },
        });

      if (result.count !== 1) {
        return false;
      }

      await transaction.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          status: "APPROVED",
          approvedAt: now,
          approvedById: invitation.createdById,
        },
      });

      return true;
    },
  );

  if (!accepted) {
    redirect(invitationPath);
  }

  redirect(
    session.user.username ? "/" : "/onboarding",
  );
}
