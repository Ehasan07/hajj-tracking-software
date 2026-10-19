import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, rawSql, withTenant } from "@hajj/db";
import { member, organization, siteReviews, sitePosts, user } from "@hajj/db/schema";
import { appRouter } from "./root";
import { createCallerFactory, createContext } from "./trpc";

const createCaller = createCallerFactory(appRouter);
const a = { tenant: randomUUID(), owner: randomUUID(), staff: randomUUID() };
const b = { tenant: randomUUID(), owner: randomUUID() };

const as = (userId: string, tenantId: string) => createCaller(createContext({ session: { userId, activeOrganizationId: tenantId } }));
const ownerA = () => as(a.owner, a.tenant);
const staffA = () => as(a.staff, a.tenant);
const ownerB = () => as(b.owner, b.tenant);
const image = (tenantId: string) => `tenants/${tenantId}/site/${randomUUID()}.webp`;

beforeAll(async () => {
  await db.insert(user).values([
    { id: a.owner, name: "Owner A", email: `${a.owner}@test.local` },
    { id: a.staff, name: "Staff A", email: `${a.staff}@test.local` },
    { id: b.owner, name: "Owner B", email: `${b.owner}@test.local` },
  ]);
  await db.insert(organization).values([
    { id: a.tenant, name: "Site A", slug: `site-a-${a.tenant.slice(0, 8)}`, createdAt: new Date() },
    { id: b.tenant, name: "Site B", slug: `site-b-${b.tenant.slice(0, 8)}`, createdAt: new Date() },
  ]);
  await db.insert(member).values([
    { id: randomUUID(), organizationId: a.tenant, userId: a.owner, role: "owner", createdAt: new Date() },
    { id: randomUUID(), organizationId: a.tenant, userId: a.staff, role: "staff", createdAt: new Date() },
    { id: randomUUID(), organizationId: b.tenant, userId: b.owner, role: "owner", createdAt: new Date() },
  ]);
  for (const [who, tenantId, prefix] of [
    [ownerA, a.tenant, "SA"],
    [ownerB, b.tenant, "SB"],
  ] as const) {
    await who().tenant.initialize({ organizationId: tenantId, legalName: `Agency ${prefix}`, referencePrefix: prefix, defaultLocale: "bn", enabledUnits: ["hajj", "office"] });
  }
});

afterAll(async () => {
  const { default: postgres } = await import("postgres");
  const ownerDb = postgres(process.env.DATABASE_OWNER_URL!, { max: 1 });
  await ownerDb`delete from organization where id in (${a.tenant}, ${b.tenant})`;
  await ownerDb`delete from "user" where id in (${a.owner}, ${a.staff}, ${b.owner})`;
  await ownerDb.end();
  await rawSql.end();
});

describe("website settings", () => {
  it("saves the look, contact details and section order; only managers may", async () => {
    await expect(staffA().website.get()).rejects.toThrow(/FORBIDDEN/);
    await ownerA().website.save({
      published: true,
      theme: "night",
      customColor: "#9B2D4B",
      taglineBn: "বিশ্বস্ত হজ সেবা",
      whatsapp: "01712-345678",
      facebookUrl: "https://www.facebook.com/site.a",
      phone: "01812345678",
      email: "info@site-a.test",
      address: "Motijheel, Dhaka",
    });
    await ownerA().website.saveSections({
      sections: [
        { id: "faq", visible: true },
        { id: "steps", visible: false },
      ],
    });
    const got = await ownerA().website.get();
    expect(got.settings.customColor).toBe("#9b2d4b");
    expect(got.settings.whatsapp).toBe("+8801712345678");
    expect(got.settings.sections.slice(0, 2)).toEqual([
      { id: "faq", visible: true },
      { id: "steps", visible: false },
    ]);
    expect(got.contact?.phone).toBe("+8801812345678");
  });

  it("refuses links to other sites and images from another agency", async () => {
    const base = { published: true, theme: "zamzam" };
    await expect(ownerA().website.save({ ...base, facebookUrl: "https://evil.example/facebook.com" })).rejects.toThrow(/INVALID_LINK/);
    await expect(ownerA().website.save({ ...base, youtubeUrl: "http://youtube.com/x" })).rejects.toThrow(/INVALID_LINK/);
    await expect(ownerA().website.setImage({ slot: "logo", key: image(b.tenant) })).rejects.toThrow(/BAD_IMAGE/);
    await expect(ownerA().website.setImage({ slot: "logo", key: "tenants/../x.webp" })).rejects.toThrow(/BAD_IMAGE/);
    const logo = image(a.tenant);
    await ownerA().website.setImage({ slot: "logo", key: logo });
    expect((await ownerA().website.get()).settings.logoKey).toBe(logo);
    const [{ visible }] = (await db.execute(sql`select site_media_visible(${a.tenant}, ${logo}) as visible`)) as unknown as [{ visible: boolean }];
    expect(visible).toBe(true);
    await ownerA().website.setImage({ slot: "logo", key: null });
    const [{ gone }] = (await db.execute(sql`select site_media_visible(${a.tenant}, ${logo}) as gone`)) as unknown as [{ gone: boolean }];
    expect(gone).toBe(false);
  });

  it("changes the website address, refusing reserved and taken ones", async () => {
    const mine = `agency-a-${a.tenant.slice(0, 6)}`;
    await ownerA().website.setSlug({ slug: mine });
    expect((await ownerA().website.get()).slug).toBe(mine);
    await expect(ownerB().website.setSlug({ slug: mine })).rejects.toThrow(/SLUG_TAKEN/);
    await expect(ownerB().website.setSlug({ slug: "admin" })).rejects.toThrow(/SLUG_RESERVED/);
    await expect(ownerB().website.setSlug({ slug: "No Spaces" })).rejects.toThrow(/SLUG_FORMAT/);
  });
});

describe("posts, gallery and questions", () => {
  it("keeps each agency's content to itself", async () => {
    const post = await ownerA().website.savePost({ kind: "notice", titleBn: "২০২৭ হজের নিবন্ধন শুরু", bodyBn: "নিবন্ধনের শেষ তারিখ ৩০ নভেম্বর।", published: true, pinned: true });
    expect(post.slug).toMatch(/^2027-[0-9a-f]{6}$/);
    expect(post.publishedAt).toBeInstanceOf(Date);
    expect(await ownerB().website.posts()).toHaveLength(0);
    await ownerB().website.deletePost({ id: post.id }); // another agency's row: nothing happens
    expect(await ownerA().website.posts()).toHaveLength(1);
    await expect(ownerB().website.savePost({ id: post.id, kind: "news", titleBn: "দখল", bodyBn: "অন্যের পোস্ট বদলানো যাবে না", published: true })).rejects.toThrow(/NOT_FOUND/);
  });

  it("orders photos and questions and moves them", async () => {
    const one = await ownerA().website.addPhoto({ key: image(a.tenant), captionBn: "আরাফা ২০২৫" });
    const two = await ownerA().website.addPhoto({ key: image(a.tenant) });
    await ownerA().website.movePhoto({ id: two.id, dir: "up" });
    expect((await ownerA().website.gallery()).map((p) => p.id)).toEqual([two.id, one.id]);

    const q1 = await ownerA().website.saveFaq({ questionBn: "কত টাকা লাগে?", answerBn: "প্যাকেজ দেখুন।" });
    const q2 = await ownerA().website.saveFaq({ questionBn: "কী কী কাগজ লাগে?", answerBn: "পাসপোর্ট, ছবি, NID।" });
    await ownerA().website.moveFaq({ id: q1.id, dir: "down" });
    expect((await ownerA().website.faqs()).map((f) => f.id)).toEqual([q2.id, q1.id]);
  });
});

describe("reviews", () => {
  it("lands a visitor's review as pending whatever it claims, and visitors can change nothing else", async () => {
    await withTenant(db, { tenantId: a.tenant, userId: "public-website" }, (tx) =>
      tx.insert(siteReviews).values({ name: "Karim", rating: 5, body: "খুব ভালো ব্যবস্থা ছিল, আলহামদুলিল্লাহ।", status: "approved", source: "office" }),
    );
    const [review] = await ownerA().website.reviews({ status: "pending" });
    expect(review).toMatchObject({ name: "Karim", status: "pending", source: "website" });

    await expect(
      withTenant(db, { tenantId: a.tenant, userId: "public-website" }, (tx) => tx.update(siteReviews).set({ status: "approved" }).where(eq(siteReviews.id, review!.id))),
    ).rejects.toThrow();
    await expect(
      withTenant(db, { tenantId: a.tenant, userId: "public-website" }, (tx) => tx.insert(sitePosts).values({ slug: "spam", titleBn: "spam", bodyBn: "spam spam spam" })),
    ).rejects.toThrow();

    expect((await ownerA().website.get()).pendingReviews).toBe(1);
    await ownerA().website.setReviewStatus({ id: review!.id, status: "approved" });
    expect(await ownerA().website.reviews({ status: "approved" })).toHaveLength(1);
    expect(await ownerB().website.reviews()).toHaveLength(0);
  });
});

describe("package photos", () => {
  it("accepts only the agency's own images", async () => {
    const pkg = await ownerA().packages.create({ kind: "umrah", name: "Umrah Economy", season: "2026", price: "185000" });
    await expect(ownerA().packages.setImage({ id: pkg.id, imageKey: image(b.tenant) })).rejects.toThrow(/BAD_IMAGE/);
    const key = image(a.tenant);
    expect((await ownerA().packages.setImage({ id: pkg.id, imageKey: key })).imageKey).toBe(key);
    await expect(ownerB().packages.setImage({ id: pkg.id, imageKey: null })).rejects.toThrow(/NOT_FOUND/);
  });
});
