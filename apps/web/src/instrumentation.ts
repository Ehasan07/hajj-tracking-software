/** Runs once when the server starts: begin sending queued SMS. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSmsDispatcher } = await import("./server/sms-dispatcher");
    startSmsDispatcher();
  }
}
