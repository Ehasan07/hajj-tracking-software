/** Runs once when the server starts: check the settings, then begin sending queued SMS and housekeeping. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      const { productionEnvProblems } = await import("./server/env");
      const problems = productionEnvProblems();
      if (problems.length) {
        console.error(`Refusing to start:\n  - ${problems.join("\n  - ")}`);
        process.exit(1);
      }
    }
    const { startSmsDispatcher } = await import("./server/sms-dispatcher");
    startSmsDispatcher();
    const { startMaintenance } = await import("./server/maintenance");
    startMaintenance();
  }
}
