/**
 * Demo agency for local development and previews of the public website.
 * Idempotent: running it again updates the same rows. Runs as the owner role.
 *
 *   pnpm db:seed
 */
import postgres from "postgres";

const url = process.env.DATABASE_OWNER_URL;
if (!url) throw new Error("DATABASE_OWNER_URL is not set");
const sql = postgres(url, { max: 1 });

const DEMO_ID = "00000000-0000-4000-8000-00000000d3e0";

await sql.begin(async (tx) => {
  await tx`
    insert into organization (id, name, slug, created_at)
    values (${DEMO_ID}, 'Demo Hajj Agency', 'demo', now())
    on conflict (id) do update set name = excluded.name, slug = excluded.slug`;

  await tx`
    insert into tenant_settings (tenant_id, legal_name, reference_prefix, license_number, address, phone, email, enabled_units, show_draft_meanings)
    values (
      ${DEMO_ID}, 'বায়তুল্লাহ ট্রাভেলস (ডেমো)', 'BT', 'RL-0000',
      'বাড়ি ১২, রোড ৫, মিরপুর ১০, ঢাকা ১২১৬', '+8801700000000', 'info@example.com',
      '{hajj,zamzam,coffee,office}'::business_unit[], true
    )
    on conflict (tenant_id) do update set
      legal_name = excluded.legal_name, license_number = excluded.license_number,
      address = excluded.address, phone = excluded.phone, email = excluded.email,
      show_draft_meanings = excluded.show_draft_meanings`;

  await tx`delete from travel_packages where tenant_id = ${DEMO_ID}
    and not exists (select 1 from pilgrims p where p.package_id = travel_packages.id)`;
  const packages = [
    { kind: "hajj", name: "সাধারণ হজ প্যাকেজ", season: "১৪৪৮", price: 6_95_000_00, days: 40, notes: "মক্কায় হারাম থেকে হাঁটা দূরত্বে হোটেল, মদিনায় ৮ দিন, তিন বেলা খাবার" },
    { kind: "hajj", name: "প্রিমিয়াম হজ প্যাকেজ", season: "১৪৪৮", price: 8_50_000_00, days: 30, notes: "হারামের কাছে হোটেল, মিনায় উন্নত তাঁবু, অভিজ্ঞ গাইড সঙ্গে" },
    { kind: "umrah", name: "ওমরা প্যাকেজ", season: "সারা বছর", price: 1_45_000_00, days: 14, notes: "মক্কায় ৭ রাত, মদিনায় ৫ রাত, ভিসা ও বিমান টিকিটসহ" },
  ];
  for (const p of packages) {
    await tx`
      insert into travel_packages (tenant_id, kind, name, season, price, currency, days, notes, active)
      values (${DEMO_ID}, ${p.kind}, ${p.name}, ${p.season}, ${p.price}, 'BDT', ${p.days}, ${p.notes}, true)`;
  }
});

await sql.end();
console.info("Demo agency ready: slug 'demo'. Set PUBLIC_TENANT_SLUG=demo to show it on the public site.");
