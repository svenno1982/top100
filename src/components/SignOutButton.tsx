import { signOut } from "@/auth";

type SignOutButtonProps = {
  className?: string;
  label?: string;
  redirectTo?: string;
};

export function SignOutButton({
  className = "",
  label = "Sign out",
  redirectTo = "/signin",
}: SignOutButtonProps) {
  return (
    <form
      action={async () => {
        "use server";

        await signOut({
          redirectTo,
        });
      }}
    >
      <button
        type="submit"
        className={className}
      >
        {label}
      </button>
    </form>
  );
}
