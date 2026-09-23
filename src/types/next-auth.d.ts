import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string | null;
      role: "USER" | "ADMIN";
      status:
        | "PENDING"
        | "APPROVED"
        | "SUSPENDED";
      isSiteOwner: boolean;
    } & DefaultSession["user"];
  }
}