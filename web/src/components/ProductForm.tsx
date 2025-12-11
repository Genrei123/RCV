// ...existing code...
import { showSuccessToast, showErrorToast } from "@/lib/toasts"; // existing or adapt to your toast helper
import { api } from "@/lib/api"; // central api helper

// ...existing code...

// Updated submit handler: use api.postJson (returns parsed payload or throws {status,payload})
async function handleSubmit(formValues: any) {
  try {
    const payload = await api.postJson("/products", formValues);

    // success — show toast and do post-create actions (close modal / refresh list)
    showSuccessToast("Product created successfully.");

    // existing code to close modal / refresh list / navigate...
    // e.g. props.onClose?.(); props.onSuccess?.(payload); or trigger SWR/mutate
  } catch (err: any) {
    // api.postJson throws { status, payload } for non-ok responses
    if (err && typeof err === "object" && "status" in err) {
      const payload = err.payload;
      // try to extract useful message(s)
      const serverMessage =
        payload?.message ||
        (payload?.errors && JSON.stringify(payload.errors)) ||
        (typeof payload === "string" ? payload : null) ||
        `Request failed with status ${err.status}`;

      showErrorToast(
        typeof serverMessage === "string"
          ? serverMessage
          : JSON.stringify(serverMessage)
      );
      return;
    }

    // fallback network / unexpected error
    showErrorToast(err?.message || "Network or server error");
  }
}
// ...existing code...