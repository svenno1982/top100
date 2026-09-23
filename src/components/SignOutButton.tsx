import { signOut } from "@/auth";

type SignOutButtonProps = {
  className?: string;
  label?: string;
};

export function SignOutButton({
  className = "",
  label = "Sign out",
}: SignOutButtonProps) {
  return (
    <form
      action={async () => {
        "use server";

        await signOut({
          redirectTo: "/signin",
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