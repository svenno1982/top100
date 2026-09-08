"use client";

type ConfirmDeleteModalProps = {
  title: string;
  artist: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmDeleteModal({
  title,
  artist,
  isDeleting,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
      >
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-950 text-xl text-red-300">
          !
        </div>

        <h2
          id="delete-dialog-title"
          className="text-2xl font-semibold"
        >
          Delete album?
        </h2>

        <p className="mt-3 text-neutral-400">
          Are you sure you want to remove{" "}
          <span className="font-semibold text-white">
            {title}
          </span>{" "}
          by {artist} from the chart?
        </p>

        <p className="mt-2 text-sm text-neutral-500">
          The albums beneath it will move up automatically.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="rounded-lg border border-neutral-700 px-5 py-3 font-semibold text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : "Delete album"}
          </button>
        </div>
      </div>
    </div>
  );
}