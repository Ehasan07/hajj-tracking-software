import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { outboxEnabled, readOutbox } from "@/server/mail";

/**
 * Local outbox: with MAIL_TRANSPORT=file, every email the app "sends" lands
 * here instead of in a real inbox. The page does not exist on a server that
 * sends real email.
 */
export default async function DevMailPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  if (!outboxEnabled()) notFound();
  const mails = await readOutbox(20);
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-8">
      <h1 className="text-2xl font-bold">Dev outbox</h1>
      <p className="text-[14px] text-ink-3">Emails written by MAIL_TRANSPORT=file, newest first. Not available when real email is configured.</p>
      {mails.length === 0 ? <p className="text-ink-3">No emails yet.</p> : null}
      {mails.map((m) => (
        <article key={m.id} className="flex flex-col gap-2 rounded-lg bg-paper p-4">
          <div className="flex flex-wrap justify-between gap-2 text-[13px] text-ink-3">
            <span>
              To <b className="text-ink">{m.to}</b>
            </span>
            <time>{new Date(m.sentAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}</time>
          </div>
          <b>{m.subject}</b>
          <iframe title={m.subject} srcDoc={m.html} sandbox="" className="h-[520px] w-full rounded-md border border-line" />
        </article>
      ))}
    </main>
  );
}
