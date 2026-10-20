import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { outboxEnabled, readOutbox } from "@/server/mail";
import { readSmsOutbox, smsConfigured } from "@/server/sms";

/**
 * Local outbox: with MAIL_TRANSPORT=file, every email the app "sends" lands
 * here instead of in a real inbox. The page does not exist on a server that
 * sends real email.
 */
export default async function DevMailPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  if (!outboxEnabled()) notFound();
  const [mails, texts] = await Promise.all([readOutbox(20), smsConfigured() ? readSmsOutbox(20) : []]);
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-8">
      <h1 className="text-2xl font-bold">Dev outbox</h1>
      <p className="text-[14px] text-ink-3">Emails written by MAIL_TRANSPORT=file, newest first. Not available when real email is configured.</p>
      {texts.length ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">SMS</h2>
          {texts.map((s) => (
            <article key={s.id} className="flex flex-col gap-1 rounded-lg bg-paper p-4">
              <div className="flex flex-wrap justify-between gap-2 text-[13px] text-ink-3">
                <span>
                  To <b className="text-ink">{s.to}</b>
                </span>
                <time>{new Date(s.sentAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}</time>
              </div>
              <p className="text-[15px] whitespace-pre-line">{s.text}</p>
            </article>
          ))}
        </section>
      ) : null}
      <h2 className="text-lg font-bold">Email</h2>
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
