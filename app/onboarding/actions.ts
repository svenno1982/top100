"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function returnWithError(message: string): never {
  redirect(
    `/onboarding?error=${encodeURIComponent(message)}`,
  );
}

export async function completeOnboarding(
  formData: FormData,
) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      username: true,
      status: true,
    },
  });

  if (!user) {
    redirect("/signin");
  }

  if (user.status === "SUSPENDED") {
    redirect("/suspended");
  }

  if (user.username) {
    redirect(
      user.status === "APPROVED" ? "/" : "/pending",
    );
  }

  const usernameValue = formData.get("username");
  const applicationMessageValue = formData.get(
    "applicationMessage",
  );

  const username =
    typeof usernameValue === "string"
      ? usernameValue.trim()
      : "";

  const applicationMessage =
    typeof applicationMessageValue === "string"
      ? applicationMessageValue.trim()
      : "";

  if (
    username.length < 3 ||
    username.length > 24 ||
    !/^[A-Za-z0-9_-]+$/.test(username)
  ) {
    returnWithError(
      "Usernames must be 3–24 characters and use only letters, numbers, underscores or hyphens.",
    );
  }

  if (applicationMessage.length > 500) {
    returnWithError(
      "Your introduction must be 500 characters or fewer.",
    );
  }

  const usernameKey = username.toLowerCase();

  const existingUsername = await prisma.user.findUnique({
    where: {
      usernameKey,
    },
    select: {
      id: true,
    },
  });

  if (
    existingUsername &&
    existingUsername.id !== user.id
  ) {
    returnWithError(
      "That username has already been taken.",
    );
  }

  try {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        username,
        usernameKey,
        displayName: username,
        applicationMessage:
          applicationMessage || null,
        isProfilePublic:
          formData.get("isProfilePublic") === "on",
      },
    });
  } catch (error) {
    console.error(
      "Unable to complete onboarding:",
      error,
    );

    returnWithError(
      "Your profile could not be saved. Please try again.",
    );
  }

  redirect(
    user.status === "APPROVED" ? "/" : "/pending",
  );
}