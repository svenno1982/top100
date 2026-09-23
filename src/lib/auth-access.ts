import { NextResponse } from "next/server";
import { auth } from "@/auth";

type ApprovedApiAccess = {
  userId: string;
  role: "USER" | "ADMIN";
  response: null;
};

type DeniedApiAccess = {
  userId: null;
  role: null;
  response: NextResponse;
};

export async function requireApprovedApiUser(): Promise<
  ApprovedApiAccess | DeniedApiAccess
> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      userId: null,
      role: null,
      response: NextResponse.json(
        { error: "Authentication is required" },
        { status: 401 },
      ),
    };
  }

  if (session.user.status !== "APPROVED") {
    const message =
      session.user.status === "SUSPENDED"
        ? "This account has been suspended"
        : "This account is awaiting approval";

    return {
      userId: null,
      role: null,
      response: NextResponse.json(
        { error: message },
        { status: 403 },
      ),
    };
  }

  return {
    userId: session.user.id,
    role: session.user.role,
    response: null,
  };
}

export async function requireAdminApiUser(): Promise<
  ApprovedApiAccess | DeniedApiAccess
> {
  const access = await requireApprovedApiUser();

  if (access.response) {
    return access;
  }

  if (access.role !== "ADMIN") {
    return {
      userId: null,
      role: null,
      response: NextResponse.json(
        { error: "Administrator access is required" },
        { status: 403 },
      ),
    };
  }

  return access;
}