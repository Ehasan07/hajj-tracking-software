/**
 * SMS gateway. A real provider is wired in during M5; until then messages
 * are written to the server log so OTP flows can be tested locally.
 */
export async function sendSms(to: string, message: string): Promise<void> {
  if (process.env.NODE_ENV === "production" && !process.env.SMS_PROVIDER) {
    throw new Error("SMS_PROVIDER is not configured");
  }
  console.info(`[sms] to=${to} ${message}`);
}
