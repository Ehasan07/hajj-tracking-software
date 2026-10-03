import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, lt, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { addDays, bookingTotal, nights, parseAmount, ROOM_CAPACITY } from "@hajj/core";
import { expenses, hotelBookings, hotels, pilgrims, roomAssignments } from "@hajj/db/schema";
import { recordExpense } from "../services/money-out";
import { entryDate, getSettings, nextReference } from "../services/tenant";
import { router, withRoles } from "../trpc";
import { amountInput, amountOrZero, dateKey, optionalText, paymentMethods } from "./shared";

const office = withRoles("admin", "accountant", "staff");
const ROOM_TYPES = ["double", "triple", "quad", "quint"] as const;

const paidSql = sql<number>`(select coalesce(sum(e.amount), 0)::bigint from ${expenses} e
  where e.hotel_booking_id = "hotel_bookings"."id" and e.voided_at is null and e.currency = "hotel_bookings"."currency")`.mapWith(
  Number,
);
const assignedSql = sql<number>`(select count(*)::int from ${roomAssignments} a where a.booking_id = "hotel_bookings"."id")`;

export const hotelsRouter = router({
  hotels: office.query(({ ctx }) =>
    ctx.tx
      .select({
        hotel: hotels,
        bookings: sql<number>`(select count(*)::int from ${hotelBookings} b where b.hotel_id = "hotels"."id" and b.status <> 'cancelled')`,
      })
      .from(hotels)
      .orderBy(desc(hotels.active), asc(hotels.city), asc(hotels.name))
      .then((rows) => rows.map((r) => ({ ...r.hotel, bookings: r.bookings }))),
  ),

  saveHotel: office
    .input(
      z.object({
        id: z.uuid().optional(),
        name: z.string().trim().min(2).max(160),
        city: z.enum(["makkah", "madinah", "other"]),
        address: optionalText(240),
        distance: optionalText(80),
        phone: optionalText(40),
        notes: optionalText(400),
        active: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...values } = input;
      if (id) {
        const [row] = await ctx.tx
          .update(hotels)
          .set(values)
          .where(eq(hotels.id, id))
          .returning({ id: hotels.id });
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }
      const [row] = await ctx.tx.insert(hotels).values(values).returning({ id: hotels.id });
      return row!;
    }),

  bookings: office
    .input(
      z
        .object({ hotelId: z.uuid().optional(), includeCancelled: z.boolean().default(false) })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.tx
        .select({
          booking: hotelBookings,
          hotelName: hotels.name,
          city: hotels.city,
          paid: paidSql,
          assigned: assignedSql,
        })
        .from(hotelBookings)
        .innerJoin(hotels, eq(hotels.id, hotelBookings.hotelId))
        .where(
          and(
            input?.hotelId ? eq(hotelBookings.hotelId, input.hotelId) : undefined,
            input?.includeCancelled ? undefined : ne(hotelBookings.status, "cancelled"),
          ),
        )
        .orderBy(asc(hotelBookings.checkIn));
      return rows.map((r) => ({
        ...r.booking,
        hotelName: r.hotelName,
        city: r.city,
        paid: r.paid,
        assigned: r.assigned,
        beds: r.booking.rooms * ROOM_CAPACITY[r.booking.roomType],
        nights: nights(r.booking.checkIn, r.booking.checkOut),
      }));
    }),

  booking: office.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.tx
      .select({ booking: hotelBookings, hotel: hotels, paid: paidSql })
      .from(hotelBookings)
      .innerJoin(hotels, eq(hotels.id, hotelBookings.hotelId))
      .where(eq(hotelBookings.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    const [assigned, payments, candidates] = await Promise.all([
      ctx.tx
        .select({
          id: roomAssignments.id,
          roomNo: roomAssignments.roomNo,
          pilgrimId: pilgrims.id,
          ref: pilgrims.ref,
          fullName: pilgrims.fullName,
          gender: pilgrims.gender,
        })
        .from(roomAssignments)
        .innerJoin(pilgrims, eq(pilgrims.id, roomAssignments.pilgrimId))
        .where(eq(roomAssignments.bookingId, input.id))
        .orderBy(asc(roomAssignments.roomNo), asc(pilgrims.fullName)),
      ctx.tx
        .select()
        .from(expenses)
        .where(eq(expenses.hotelBookingId, input.id))
        .orderBy(desc(expenses.spentAt)),
      ctx.tx
        .select({
          id: pilgrims.id,
          ref: pilgrims.ref,
          fullName: pilgrims.fullName,
          gender: pilgrims.gender,
        })
        .from(pilgrims)
        .where(
          and(
            ne(pilgrims.status, "cancelled"),
            sql`not exists (select 1 from ${roomAssignments} a where a.booking_id = ${input.id} and a.pilgrim_id = ${pilgrims.id})`,
          ),
        )
        .orderBy(asc(pilgrims.fullName))
        .limit(500),
    ]);
    const capacity = ROOM_CAPACITY[row.booking.roomType];
    const rooms = Array.from({ length: row.booking.rooms }, (_, i) => {
      const roomNo = String(i + 1);
      return { roomNo, capacity, people: assigned.filter((a) => a.roomNo === roomNo) };
    });
    return {
      ...row,
      nights: nights(row.booking.checkIn, row.booking.checkOut),
      capacity,
      beds: capacity * row.booking.rooms,
      rooms,
      assigned,
      payments,
      candidates,
    };
  }),

  saveBooking: office
    .input(
      z.object({
        id: z.uuid().optional(),
        hotelId: z.uuid(),
        checkIn: dateKey,
        checkOut: dateKey,
        roomType: z.enum(ROOM_TYPES),
        rooms: z.number().int().min(1).max(500),
        rate: amountOrZero,
        currency: z.enum(["SAR", "BDT"]).default("SAR"),
        supplier: optionalText(120),
        status: z.enum(["tentative", "confirmed", "cancelled"]).default("tentative"),
        notes: optionalText(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.checkOut <= input.checkIn)
        throw new TRPCError({ code: "BAD_REQUEST", message: "INVALID_DATES" });
      const [hotel] = await ctx.tx
        .select({ id: hotels.id })
        .from(hotels)
        .where(eq(hotels.id, input.hotelId));
      if (!hotel) throw new TRPCError({ code: "NOT_FOUND" });
      const rate = parseAmount(input.rate);
      const total = bookingTotal({
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        rooms: input.rooms,
        rate,
      });
      const values = {
        hotelId: input.hotelId,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        roomType: input.roomType,
        rooms: input.rooms,
        rate,
        currency: input.currency,
        total,
        supplier: input.supplier ?? null,
        status: input.status,
        notes: input.notes ?? null,
      };
      if (input.id) {
        const [current] = await ctx.tx
          .select()
          .from(hotelBookings)
          .where(eq(hotelBookings.id, input.id))
          .for("update");
        if (!current) throw new TRPCError({ code: "NOT_FOUND" });
        // Fewer or smaller rooms must still hold everyone already placed.
        const placed = await ctx.tx
          .select({ roomNo: roomAssignments.roomNo, n: sql<number>`count(*)::int` })
          .from(roomAssignments)
          .where(eq(roomAssignments.bookingId, input.id))
          .groupBy(roomAssignments.roomNo);
        const cap = ROOM_CAPACITY[input.roomType];
        if (placed.some((p) => Number(p.roomNo) > input.rooms || p.n > cap)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "ROOMS_IN_USE" });
        }
        await ctx.tx.update(hotelBookings).set(values).where(eq(hotelBookings.id, input.id));
        return { id: input.id, ref: current.ref, total };
      }
      const settings = await getSettings(ctx.tx);
      const ref = await nextReference(ctx.tx, settings, "booking");
      const [row] = await ctx.tx
        .insert(hotelBookings)
        .values({ ...values, ref })
        .returning({ id: hotelBookings.id, ref: hotelBookings.ref });
      return { ...row!, total };
    }),

  /** Put a pilgrim in a room. A pilgrim can't sleep in two hotels on the same night. */
  assign: office
    .input(
      z.object({ bookingId: z.uuid(), pilgrimId: z.uuid(), roomNo: z.string().regex(/^\d{1,3}$/) }),
    )
    .mutation(async ({ ctx, input }) => {
      const [booking] = await ctx.tx
        .select()
        .from(hotelBookings)
        .where(eq(hotelBookings.id, input.bookingId))
        .for("update");
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      if (booking.status === "cancelled")
        throw new TRPCError({ code: "BAD_REQUEST", message: "BOOKING_CANCELLED" });
      const room = Number(input.roomNo);
      if (room < 1 || room > booking.rooms)
        throw new TRPCError({ code: "BAD_REQUEST", message: "ROOM_OUT_OF_RANGE" });

      const [pilgrim] = await ctx.tx
        .select({ id: pilgrims.id, status: pilgrims.status })
        .from(pilgrims)
        .where(eq(pilgrims.id, input.pilgrimId));
      if (!pilgrim) throw new TRPCError({ code: "NOT_FOUND" });
      if (pilgrim.status === "cancelled")
        throw new TRPCError({ code: "BAD_REQUEST", message: "PILGRIM_CANCELLED" });

      const [inRoom] = await ctx.tx
        .select({ n: sql<number>`count(*)::int` })
        .from(roomAssignments)
        .where(
          and(eq(roomAssignments.bookingId, booking.id), eq(roomAssignments.roomNo, String(room))),
        );
      if ((inRoom?.n ?? 0) >= ROOM_CAPACITY[booking.roomType])
        throw new TRPCError({ code: "BAD_REQUEST", message: "ROOM_FULL" });

      const [clash] = await ctx.tx
        .select({ ref: hotelBookings.ref })
        .from(roomAssignments)
        .innerJoin(hotelBookings, eq(hotelBookings.id, roomAssignments.bookingId))
        .where(
          and(
            eq(roomAssignments.pilgrimId, pilgrim.id),
            ne(hotelBookings.id, booking.id),
            ne(hotelBookings.status, "cancelled"),
            lt(hotelBookings.checkIn, booking.checkOut),
            gt(hotelBookings.checkOut, booking.checkIn),
          ),
        )
        .limit(1);
      if (clash)
        throw new TRPCError({ code: "BAD_REQUEST", message: `PILGRIM_DOUBLE_BOOKED:${clash.ref}` });

      await ctx.tx
        .insert(roomAssignments)
        .values({ bookingId: booking.id, pilgrimId: pilgrim.id, roomNo: String(room) })
        .onConflictDoUpdate({
          target: [roomAssignments.bookingId, roomAssignments.pilgrimId],
          set: { roomNo: String(room) },
        });
      return { ok: true };
    }),

  unassign: office.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.tx.delete(roomAssignments).where(eq(roomAssignments.id, input.id));
    return { ok: true };
  }),

  /** Pay the hotel (or its agent) against a booking. Goes to the ledger as a Hajj expense. */
  pay: withRoles("admin", "accountant")
    .input(
      z.object({
        bookingId: z.uuid(),
        amount: amountInput,
        method: z.enum(paymentMethods),
        reference: optionalText(80),
        note: optionalText(200),
        date: dateKey.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [booking] = await ctx.tx
        .select({ booking: hotelBookings, hotelName: hotels.name, paid: paidSql })
        .from(hotelBookings)
        .innerJoin(hotels, eq(hotels.id, hotelBookings.hotelId))
        .where(eq(hotelBookings.id, input.bookingId))
        .for("update", { of: hotelBookings });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      const amount = parseAmount(input.amount);
      const due = booking.booking.total - booking.paid;
      if (amount > due)
        throw new TRPCError({ code: "BAD_REQUEST", message: `OVERPAYMENT:${Math.max(due, 0)}` });
      const settings = await getSettings(ctx.tx);
      const row = await recordExpense(ctx.tx, {
        unit: "hajj",
        category: "hotel",
        payee: booking.booking.supplier ?? booking.hotelName,
        amount,
        currency: booking.booking.currency,
        method: input.method,
        reference: input.reference,
        note: input.note ?? booking.booking.ref,
        day: entryDate(settings, ctx.role, input.date),
        hotelBookingId: booking.booking.id,
      });
      return { id: row.id, due: due - amount };
    }),

  /** Beds held and beds filled for each night in a range, by city. */
  occupancy: office
    .input(z.object({ from: dateKey, days: z.number().int().min(1).max(62).default(31) }))
    .query(async ({ ctx, input }) => {
      const to = addDays(input.from, input.days);
      const rows = await ctx.tx
        .select({
          id: hotelBookings.id,
          checkIn: hotelBookings.checkIn,
          checkOut: hotelBookings.checkOut,
          rooms: hotelBookings.rooms,
          roomType: hotelBookings.roomType,
          city: hotels.city,
          assigned: assignedSql,
        })
        .from(hotelBookings)
        .innerJoin(hotels, eq(hotels.id, hotelBookings.hotelId))
        .where(
          and(
            ne(hotelBookings.status, "cancelled"),
            lt(hotelBookings.checkIn, to),
            gt(hotelBookings.checkOut, input.from),
          ),
        );
      const days = Array.from({ length: input.days }, (_, i) => addDays(input.from, i));
      return days.map((day) => {
        const tonight = rows.filter((r) => r.checkIn <= day && r.checkOut > day);
        const by = (city: string) => {
          const list = tonight.filter((r) => r.city === city);
          return {
            beds: list.reduce((a, r) => a + r.rooms * ROOM_CAPACITY[r.roomType], 0),
            filled: list.reduce((a, r) => a + r.assigned, 0),
          };
        };
        return { day, makkah: by("makkah"), madinah: by("madinah"), other: by("other") };
      });
    }),

  /** Where a pilgrim sleeps, for their profile page. */
  forPilgrim: office.input(z.object({ pilgrimId: z.uuid() })).query(({ ctx, input }) =>
    ctx.tx
      .select({
        bookingId: hotelBookings.id,
        ref: hotelBookings.ref,
        hotelName: hotels.name,
        city: hotels.city,
        checkIn: hotelBookings.checkIn,
        checkOut: hotelBookings.checkOut,
        roomNo: roomAssignments.roomNo,
        roomType: hotelBookings.roomType,
      })
      .from(roomAssignments)
      .innerJoin(hotelBookings, eq(hotelBookings.id, roomAssignments.bookingId))
      .innerJoin(hotels, eq(hotels.id, hotelBookings.hotelId))
      .where(
        and(eq(roomAssignments.pilgrimId, input.pilgrimId), ne(hotelBookings.status, "cancelled")),
      )
      .orderBy(asc(hotelBookings.checkIn)),
  ),
});
