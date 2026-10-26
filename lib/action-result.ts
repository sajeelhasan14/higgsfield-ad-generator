/** What a dashboard button's server action reports back: shown next to the button. */
export type ActionResult = { ok: boolean; message: string } | null;

/** Runs an action and turns any error into a message, so a failed click shows a reason instead of crashing the page. */
export async function toResult(work: () => Promise<string>): Promise<ActionResult> {
  try {
    return { ok: true, message: await work() };
  } catch (err) {
    console.error(err);
    return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong' };
  }
}
