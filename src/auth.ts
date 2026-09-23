import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

function getBootstrapAdministratorEmail() {
  return process.env.AUTH_BOOTSTRAP_ADMIN_EMAIL
    ?.trim()
    .toLowerCase();
}

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),

  providers: [
    Google({
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified
            ? new Date()
            : null,
        };
      },
    }),
  ],

  session: {
    strategy: "database",
  },

    pages: {
    signIn: "/signin",
  },

  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider !== "google") {
        return false;
      }

      const googleProfile = profile as {
        email?: string;
        email_verified?: boolean;
      };

      return Boolean(
        googleProfile.email &&
          googleProfile.email_verified,
      );
    },

    async session({ session, user }) {
      const databaseUser =
        await prisma.user.findUnique({
          where: {
            id: user.id,
          },
          select: {
            id: true,
            username: true,
            role: true,
            status: true,
            isSiteOwner: true,
          },
        });

      if (session.user && databaseUser) {
        session.user.id = databaseUser.id;
        session.user.username =
          databaseUser.username;
        session.user.role = databaseUser.role;
        session.user.status =
          databaseUser.status;
        session.user.isSiteOwner =
          databaseUser.isSiteOwner;
      }

      return session;
    },
  },



    events: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return;
      }

      const administratorEmail =
        getBootstrapAdministratorEmail();

      const userEmail =
        user.email?.trim().toLowerCase();

      const isBootstrapAdministrator =
        Boolean(administratorEmail) &&
        userEmail === administratorEmail;

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          emailVerified: new Date(),
          ...(isBootstrapAdministrator
            ? {
                username: "Svenno",
                usernameKey: "svenno",
                displayName: "Svenno",
                role: "ADMIN",
                status: "APPROVED",
                isSiteOwner: true,
                approvedAt: new Date(),
              }
            : {}),
        },
      });
    },
  },
});