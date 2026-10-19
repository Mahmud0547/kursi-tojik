/** Sharing through the phone's own share sheet; on computers the text is copied instead. */

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareText(text: string, url: string): Promise<ShareResult> {
  if (navigator.share) {
    try {
      await navigator.share({ text, url });
      return "shared";
    } catch (error) {
      if ((error as DOMException).name === "AbortError") return "cancelled";
    }
  }
  return (await copyText(`${text}\n${url}`)) ? "copied" : "failed";
}
