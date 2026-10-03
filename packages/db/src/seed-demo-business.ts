/**
 * Sample side-business activity for the demo agency: Zamzam routes and shop
 * deliveries, a medicine shelf with batches, Naba Coffee and Supernova sales,
 * staff with a paid salary sheet, hotel bookings with rooms filled, and office
 * expenses. Everything goes through the real API, dated over the last two
 * weeks with the owner's back-dating. Every name and number is invented.
 */

type Trpc = <T>(proc: string, input: unknown, kind?: "mutation" | "query") => Promise<T>;

/** Small deterministic generator so every demo looks the same. */
function seeded(seed: number) {
  let s = seed;
  return (min: number, max: number) => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return min + (s % (max - min + 1));
  };
}

function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const weekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();

export async function seedBusiness(trpc: Trpc) {
  const existing = await trpc<unknown[]>("shop.products", { unit: "zamzam" }, "query");
  if (existing.length > 0) return false;
  const rand = seeded(1448);
  const { day: today } = await trpc<{ day: string }>("shop.overview", { unit: "zamzam" }, "query");
  const back = (n: number) => (n === 0 ? undefined : addDays(today, -n));

  /* ---------------------------------------------------------------- Zamzam */
  const jars: { id: string; price: number }[] = [];
  for (const p of [
    { name: "জমজম পানি ৫ লিটার", unitLabel: "জার", price: "450", cost: "380", qty: 600 },
    { name: "জমজম পানি ১০ লিটার", unitLabel: "জার", price: "850", cost: "720", qty: 300 },
    {
      name: "জমজম ৩৩০ মি.লি. (২৪টির কার্টন)",
      unitLabel: "কার্টন",
      price: "1200",
      cost: "1000",
      qty: 80,
    },
  ]) {
    const { id } = await trpc<{ id: string }>("shop.saveProduct", {
      unit: "zamzam",
      name: p.name,
      unitLabel: p.unitLabel,
      price: p.price,
      cost: p.cost,
      category: "পানি",
      trackStock: true,
      usesBatches: false,
      active: true,
      reorderLevel: 40,
    });
    await trpc("shop.receiveStock", { unit: "zamzam", productId: id, qty: p.qty, cost: p.cost });
    jars.push({ id, price: Number(p.price) });
  }

  const routes = await trpc<{ id: string; weekday: number }[]>(
    "shop.routes",
    { unit: "zamzam" },
    "query",
  );
  const areas: Record<number, { name: string; shops: [string, string, string?][] }> = {
    6: {
      name: "মিরপুর ১০ ও ১১",
      shops: [
        ["আল-আমিন আতর হাউস", "মিরপুর ১০ গোলচত্বর", "500"],
        ["মদিনা টুপি ঘর", "মিরপুর ১১"],
        ["নূর জেনারেল স্টোর", "পল্লবী"],
      ],
    },
    0: {
      name: "মোহাম্মদপুর ও ধানমন্ডি",
      shops: [
        ["বায়তুস সালাম স্টোর", "টাউন হল মার্কেট"],
        ["রহমানিয়া ইসলামিক লাইব্রেরি", "মোহাম্মদপুর", "1200"],
        ["সাফা-মারওয়া ট্রেডার্স", "ধানমন্ডি ১৫"],
      ],
    },
    1: {
      name: "মতিঝিল ও পল্টন",
      shops: [
        ["হেরা ট্রাভেল কর্নার", "পুরানা পল্টন"],
        ["তাকওয়া খেজুর ঘর", "মতিঝিল"],
        ["আল-হারামাইন স্টোর", "দৈনিক বাংলা"],
      ],
    },
    2: {
      name: "উত্তরা",
      shops: [
        ["উত্তরা ইসলামিক সেন্টার শপ", "সেক্টর ৭", "800"],
        ["জান্নাত সুপার শপ", "সেক্টর ১১"],
        ["মক্কা ফুড কর্নার", "আজমপুর"],
      ],
    },
    3: {
      name: "গুলশান ও বাড্ডা",
      shops: [
        ["গুলশান মসজিদ মার্কেট দোকান", "গুলশান ২"],
        ["বাড্ডা খেজুর ভান্ডার", "মধ্য বাড্ডা"],
        ["আরাফাত স্টোর", "রামপুরা"],
      ],
    },
    4: {
      name: "বায়তুল মোকাররম মার্কেট",
      shops: [
        ["মোকাররম আতর ও তসবিহ", "উত্তর গেট", "1500"],
        ["আল-কাবা ইসলামিক শপ", "দক্ষিণ গেট"],
        ["হাজী ক্যাপ সেন্টার", "পূর্ব গেট"],
      ],
    },
    5: {
      name: "যাত্রাবাড়ী ও সায়েদাবাদ",
      shops: [
        ["যাত্রাবাড়ী মডেল স্টোর", "যাত্রাবাড়ী চৌরাস্তা"],
        ["সায়েদাবাদ খাদেম স্টোর", "সায়েদাবাদ"],
        ["দয়াগঞ্জ জেনারেল", "দয়াগঞ্জ"],
      ],
    },
  };
  const shopsByRoute = new Map<string, string[]>();
  for (const r of routes) {
    const area = areas[r.weekday]!;
    await trpc("shop.saveRoute", { unit: "zamzam", id: r.id, name: area.name });
    const ids: string[] = [];
    for (const [i, [name, place, due]] of area.shops.entries()) {
      const phone = `017${String(10000000 + r.weekday * 1000 + i * 37).padStart(8, "0")}`;
      const { id } = await trpc<{ id: string }>("shop.saveCustomer", {
        unit: "zamzam",
        name,
        area: place,
        phone,
        routeId: r.id,
        openingDue: due,
        sortOrder: i + 1,
        active: true,
      });
      ids.push(id);
    }
    shopsByRoute.set(r.id, ids);
  }
  // Two weeks on the road, ending today. Shops pay part on delivery and clear dues now and then.
  for (let n = 13; n >= 0; n--) {
    const day = addDays(today, -n);
    const route = routes.find((r) => r.weekday === weekday(day))!;
    for (const shop of shopsByRoute.get(route.id)!) {
      if (n === 0 && rand(0, 2) === 0) continue; // a few of today's stops still to come
      const items = [{ productId: jars[0]!.id, qty: rand(4, 14) }];
      if (rand(0, 2) === 0) items.push({ productId: jars[1]!.id, qty: rand(1, 5) });
      const total = items.reduce(
        (a, i) => a + i.qty * jars.find((j) => j.id === i.productId)!.price,
        0,
      );
      const paid = [0, Math.floor(total / 2 / 50) * 50, total][rand(0, 2)]!;
      await trpc("shop.sell", {
        unit: "zamzam",
        customerId: shop,
        routeId: route.id,
        items,
        paid: String(paid),
        method: "cash",
        date: back(n),
      });
      if (rand(0, 3) === 0) {
        const { balance } = await trpc<{ customer: unknown; balance: number }>(
          "shop.customer",
          { unit: "zamzam", id: shop },
          "query",
        );
        const take = Math.floor(balance / 100 / 2 / 100) * 100;
        if (take > 0)
          await trpc("shop.collect", {
            unit: "zamzam",
            customerId: shop,
            amount: String(take),
            method: rand(0, 1) ? "cash" : "bkash",
            reference: "DEMO-BK",
            date: back(n),
          });
      }
    }
  }
  // Counter sales to pilgrims walking in.
  for (let n = 6; n >= 0; n--) {
    for (let k = rand(1, 3); k > 0; k--)
      await trpc("shop.sell", {
        unit: "zamzam",
        items: [{ productId: jars[rand(0, 2)]!.id, qty: rand(1, 3) }],
        method: "cash",
        date: back(n),
      });
  }

  /* -------------------------------------------------------------- Medicine */
  const medicines = [
    {
      name: "প্যারাসিটামল ৫০০",
      genericName: "Paracetamol",
      strength: "500 mg",
      category: "ব্যথা ও জ্বর",
      price: "12",
      cost: "9",
      unitLabel: "পাতা",
      batches: [
        ["PCM-2611", 40, 380],
        ["PCM-2603", 25, 35],
      ],
    },
    {
      name: "ওমিপ্রাজল ২০",
      genericName: "Omeprazole",
      strength: "20 mg",
      category: "গ্যাস্ট্রিক",
      price: "60",
      cost: "48",
      unitLabel: "পাতা",
      batches: [["OMZ-2702", 30, 420]],
    },
    {
      name: "সেটিরিজিন ১০",
      genericName: "Cetirizine",
      strength: "10 mg",
      category: "অ্যালার্জি",
      price: "30",
      cost: "22",
      unitLabel: "পাতা",
      batches: [["CTZ-2612", 30, 300]],
    },
    {
      name: "খাবার স্যালাইন",
      genericName: "Oral rehydration salts",
      strength: "১০.২৫ গ্রাম",
      category: "পানিশূন্যতা",
      price: "6",
      cost: "4.5",
      unitLabel: "প্যাকেট",
      batches: [
        ["ORS-2701", 200, 500],
        ["ORS-2511", 60, 28],
      ],
    },
    {
      name: "অ্যান্টাসিড সাসপেনশন",
      genericName: "Aluminium + Magnesium hydroxide",
      strength: "২০০ মি.লি.",
      category: "গ্যাস্ট্রিক",
      price: "95",
      cost: "75",
      unitLabel: "বোতল",
      batches: [["ANT-2705", 20, 400]],
    },
    {
      name: "ভিটামিন সি ২৫০",
      genericName: "Ascorbic acid",
      strength: "250 mg",
      category: "ভিটামিন",
      price: "25",
      cost: "18",
      unitLabel: "পাতা",
      batches: [["VTC-2609", 40, 50]],
    },
    {
      name: "কাশির সিরাপ",
      genericName: "Dextromethorphan",
      strength: "১০০ মি.লি.",
      category: "সর্দি-কাশি",
      price: "85",
      cost: "65",
      unitLabel: "বোতল",
      batches: [["CGH-2704", 24, 350]],
    },
    {
      name: "পায়ের ফোসকার ব্যান্ডেজ",
      genericName: "Hydrocolloid plaster",
      strength: "১০ পিস",
      category: "প্রাথমিক চিকিৎসা",
      price: "180",
      cost: "140",
      unitLabel: "প্যাক",
      batches: [["BND-2812", 30, 700]],
    },
    {
      name: "সার্জিক্যাল মাস্ক",
      genericName: "Surgical mask",
      strength: "৫০ পিস",
      category: "প্রাথমিক চিকিৎসা",
      price: "250",
      cost: "190",
      unitLabel: "বক্স",
      batches: [["MSK-2810", 25, 800]],
    },
  ] as const;
  const meds: { id: string; price: number }[] = [];
  for (const m of medicines) {
    const { id } = await trpc<{ id: string }>("shop.saveProduct", {
      unit: "medicine",
      name: m.name,
      genericName: m.genericName,
      strength: m.strength,
      category: m.category,
      unitLabel: m.unitLabel,
      price: m.price,
      cost: m.cost,
      trackStock: true,
      usesBatches: true,
      reorderLevel: 10,
      active: true,
    });
    for (const [batchNo, qty, days] of m.batches) {
      await trpc("shop.receiveStock", {
        unit: "medicine",
        productId: id,
        qty,
        batchNo,
        expiresOn: addDays(today, days),
        cost: m.cost,
      });
    }
    meds.push({ id, price: Number(m.price) });
  }
  for (let n = 6; n >= 0; n--) {
    for (let k = rand(3, 6); k > 0; k--) {
      const picks = new Set([rand(0, meds.length - 1), rand(0, meds.length - 1)]);
      await trpc("shop.sell", {
        unit: "medicine",
        items: [...picks].map((i) => ({ productId: meds[i]!.id, qty: rand(1, 3) })),
        method: rand(0, 3) ? "cash" : "bkash",
        reference: "DEMO-MD",
        date: back(n),
      });
    }
  }

  /* ------------------------------------------------------------ Naba Coffee */
  const menu = [
    ["আরবি কাহওয়া", "কফি", "80"],
    ["এসপ্রেসো", "কফি", "150"],
    ["ক্যাপুচিনো", "কফি", "180"],
    ["ক্যাফে লাটে", "কফি", "200"],
    ["কোল্ড কফি", "কফি", "220"],
    ["মসলা চা", "চা", "40"],
    ["লেবু চা", "চা", "30"],
    ["আজওয়া খেজুর (প্লেট)", "নাস্তা", "150"],
    ["চিকেন স্যান্ডউইচ", "নাস্তা", "160"],
  ] as const;
  const cups: string[] = [];
  for (const [name, category, price] of menu) {
    const { id } = await trpc<{ id: string }>("shop.saveProduct", {
      unit: "coffee",
      name,
      category,
      unitLabel: "কাপ",
      price,
      trackStock: false,
      usesBatches: false,
      active: true,
    });
    cups.push(id);
  }
  for (let n = 9; n >= 0; n--) {
    for (let k = rand(6, 12); k > 0; k--) {
      const lines = new Map<string, number>();
      for (let j = rand(1, 3); j > 0; j--) {
        const id = cups[rand(0, cups.length - 1)]!;
        lines.set(id, (lines.get(id) ?? 0) + rand(1, 2));
      }
      await trpc("shop.sell", {
        unit: "coffee",
        items: [...lines].map(([productId, qty]) => ({ productId, qty })),
        method: ["cash", "cash", "bkash", "nagad"][rand(0, 3)],
        reference: "DEMO-NC",
        date: back(n),
      });
    }
  }
  await trpc("shop.expense", {
    unit: "coffee",
    category: "supplies",
    payee: "কফি বিন সরবরাহকারী",
    amount: "6500",
    method: "cash",
    date: back(3),
  });

  /* -------------------------------------------------------------- Supernova */
  const nova = [
    ["সুপারনোভা আতর ১২ মি.লি.", "আতর", "350", 120],
    ["সুপারনোভা ইহরাম সেট", "ইহরাম", "1450", 60],
    ["সুপারনোভা জায়নামাজ", "জায়নামাজ", "650", 80],
    ["সুপারনোভা তসবিহ (৯৯ দানা)", "তসবিহ", "180", 150],
    ["সুপারনোভা হজ ব্যাগ", "ব্যাগ", "950", 50],
    ["সুপারনোভা হিজাব", "পোশাক", "480", 90],
  ] as const;
  const novaIds: string[] = [];
  for (const [name, category, price, qty] of nova) {
    const { id } = await trpc<{ id: string }>("shop.saveProduct", {
      unit: "supernova",
      name,
      category,
      unitLabel: "পিস",
      price,
      code: `SN-${String(novaIds.length + 101)}`,
      trackStock: true,
      usesBatches: false,
      active: true,
      reorderLevel: 15,
    });
    await trpc("shop.receiveStock", { unit: "supernova", productId: id, qty });
    novaIds.push(id);
  }
  for (let n = 6; n >= 0; n--) {
    for (let k = rand(2, 4); k > 0; k--) {
      await trpc("shop.sell", {
        unit: "supernova",
        items: [{ productId: novaIds[rand(0, novaIds.length - 1)]!, qty: rand(1, 2) }],
        method: rand(0, 1) ? "cash" : "card",
        reference: "DEMO-SN",
        date: back(n),
      });
    }
  }

  /* --------------------------------------------------------------- Payroll */
  const staff = [
    {
      name: "মো. শফিকুল ইসলাম",
      designation: "ম্যানেজার",
      basic: "35000",
      allowances: [
        { label: "বাড়ি ভাড়া", amount: "8000" },
        { label: "যাতায়াত", amount: "2000" },
      ],
      payoutMethod: "ব্যাংক",
    },
    {
      name: "নাসিমা খাতুন",
      designation: "হিসাবরক্ষক",
      basic: "25000",
      allowances: [{ label: "বাড়ি ভাড়া", amount: "6000" }],
      payoutMethod: "ব্যাংক",
    },
    {
      name: "আব্দুর রহিম",
      designation: "হজ গাইড",
      basic: "22000",
      allowances: [{ label: "যাতায়াত", amount: "3000" }],
      payoutMethod: "bKash",
    },
    {
      name: "জাকির হোসেন",
      designation: "জমজম ডেলিভারি",
      basic: "14000",
      allowances: [{ label: "যাতায়াত", amount: "2500" }],
      payoutMethod: "নগদ",
    },
    {
      name: "রুবিনা আক্তার",
      designation: "ঔষধের দোকান",
      basic: "16000",
      allowances: [],
      payoutMethod: "bKash",
    },
    {
      name: "সাইফুল আলম",
      designation: "কফি বারিস্তা",
      basic: "15000",
      allowances: [{ label: "খাবার", amount: "1500" }],
      payoutMethod: "নগদ",
    },
  ];
  const staffIds: string[] = [];
  for (const s of staff)
    staffIds.push((await trpc<{ id: string }>("payroll.saveEmployee", { ...s, active: true })).id);
  await trpc("payroll.giveAdvance", {
    employeeId: staffIds[3],
    amount: "6000",
    method: "cash",
    note: "ঈদের আগে অগ্রিম",
    date: back(20),
  });

  const thisMonth = today.slice(0, 7);
  const lastMonthDate = new Date(`${thisMonth}-01T12:00:00Z`);
  lastMonthDate.setUTCMonth(lastMonthDate.getUTCMonth() - 1);
  const lastMonth = lastMonthDate.toISOString().slice(0, 7);
  await trpc("payroll.generate", { month: lastMonth, workingDays: 26 });
  const sheet = await trpc<{
    sheet: { id: string };
    lines: { id: string; employeeId: string; allowances: unknown[] }[];
  }>("payroll.sheet", { month: lastMonth }, "query");
  const delivery = sheet.lines.find((l) => l.employeeId === staffIds[3])!;
  await trpc("payroll.updateLine", {
    lineId: delivery.id,
    allowances: [{ label: "যাতায়াত", amount: "2500" }],
    deductions: [],
    unpaidAbsentDays: 1,
    overtimeHours: 6,
    overtimeRate: "100",
    advanceRecovery: "2000",
    note: "১ দিন ছুটি, ৬ ঘণ্টা ওভারটাইম",
  });
  await trpc("payroll.lock", { id: sheet.sheet.id });
  // Salaries for last month, paid on the 1st of this month.
  await trpc("payroll.pay", {
    id: sheet.sheet.id,
    method: "bank",
    date: `${thisMonth}-01` === today ? undefined : `${thisMonth}-01`,
  });
  await trpc("payroll.generate", { month: thisMonth, workingDays: 26 });

  /* ---------------------------------------------------------------- Hotels */
  const hotel = async (name: string, city: string, distance: string) =>
    (await trpc<{ id: string }>("hotels.saveHotel", { name, city, distance, active: true })).id;
  const makkahA = await hotel("আল-নূর টাওয়ার হোটেল (ডেমো)", "makkah", "হারাম থেকে ৩৫০ মিটার");
  const makkahB = await hotel("বাব আস-সালাম রেসিডেন্স (ডেমো)", "makkah", "হারাম থেকে ৮০০ মিটার");
  const madinah = await hotel(
    "কাসর আল-মদিনা হোটেল (ডেমো)",
    "madinah",
    "মসজিদে নববী থেকে ২০০ মিটার",
  );

  const pilgrims = await trpc<
    { id: string; fullName: string; gender: string | null; packageName: string | null }[]
  >("pilgrims.list", {}, "query");
  const umrahGuests = pilgrims.filter((p) => p.packageName?.includes("ওমরা"));
  const hajjGuests = pilgrims.filter((p) => !p.packageName?.includes("ওমরা"));

  const year = Number(today.slice(0, 4));
  const umrahIn = `${year}-12-10`;
  const umrahMakkah = await trpc<{ id: string }>("hotels.saveBooking", {
    hotelId: makkahA,
    checkIn: umrahIn,
    checkOut: addDays(umrahIn, 7),
    roomType: "quad",
    rooms: 3,
    rate: "380",
    currency: "SAR",
    supplier: "রিয়াদ ট্যুরস এজেন্ট (ডেমো)",
    status: "confirmed",
  });
  const umrahMadinah = await trpc<{ id: string }>("hotels.saveBooking", {
    hotelId: madinah,
    checkIn: addDays(umrahIn, 7),
    checkOut: addDays(umrahIn, 12),
    roomType: "quad",
    rooms: 2,
    rate: "320",
    currency: "SAR",
    status: "tentative",
  });
  const hajjIn = `${year + 1}-05-08`;
  const hajjMakkah = await trpc<{ id: string }>("hotels.saveBooking", {
    hotelId: makkahA,
    checkIn: hajjIn,
    checkOut: addDays(hajjIn, 20),
    roomType: "quad",
    rooms: 4,
    rate: "520",
    currency: "SAR",
    supplier: "রিয়াদ ট্যুরস এজেন্ট (ডেমো)",
    status: "confirmed",
  });
  // Spare rooms held nearby in case more pilgrims sign up.
  await trpc("hotels.saveBooking", {
    hotelId: makkahB,
    checkIn: hajjIn,
    checkOut: addDays(hajjIn, 20),
    roomType: "triple",
    rooms: 2,
    rate: "410",
    currency: "SAR",
    status: "tentative",
    notes: "অতিরিক্ত হাজীর জন্য রাখা",
  });

  for (const [i, p] of umrahGuests.entries()) {
    await trpc("hotels.assign", { bookingId: umrahMakkah.id, pilgrimId: p.id, roomNo: "1" });
    await trpc("hotels.assign", {
      bookingId: umrahMadinah.id,
      pilgrimId: p.id,
      roomNo: String(1 + Math.floor(i / 4)),
    });
  }
  // Men and women in separate rooms.
  const men = hajjGuests.filter((p) => p.gender !== "female");
  const women = hajjGuests.filter((p) => p.gender === "female");
  for (const [i, p] of men.entries())
    await trpc("hotels.assign", {
      bookingId: hajjMakkah.id,
      pilgrimId: p.id,
      roomNo: String(1 + Math.floor(i / 4)),
    });
  for (const [i, p] of women.entries())
    await trpc("hotels.assign", {
      bookingId: hajjMakkah.id,
      pilgrimId: p.id,
      roomNo: String(3 + Math.floor(i / 4)),
    });

  await trpc("hotels.pay", {
    bookingId: umrahMakkah.id,
    amount: "4000",
    method: "bank",
    reference: "DEMO-WIRE-01",
    date: back(5),
  });
  await trpc("hotels.pay", {
    bookingId: hajjMakkah.id,
    amount: "15000",
    method: "bank",
    reference: "DEMO-WIRE-02",
    date: back(2),
  });

  /* -------------------------------------------------------------- Expenses */
  for (const e of [
    {
      category: "rent",
      payee: "বাড়ির মালিক",
      amount: "45000",
      method: "bank",
      reference: "DEMO-RENT",
      day: 2,
    },
    {
      category: "utility",
      payee: "বিদ্যুৎ ও ইন্টারনেট বিল",
      amount: "6200",
      method: "bkash",
      reference: "DEMO-BILL",
      day: 4,
    },
    {
      category: "visa",
      payee: "ভিসা প্রসেসিং ফি",
      amount: "18500",
      method: "bank",
      reference: "DEMO-VISA",
      day: 6,
    },
    { category: "transport", payee: "বিমানবন্দর যাতায়াত", amount: "2400", method: "cash", day: 1 },
    { category: "food", payee: "অফিস আপ্যায়ন", amount: "850", method: "cash", day: 0 },
  ]) {
    await trpc("expenses.create", {
      unit: "office",
      category: e.category,
      payee: e.payee,
      amount: e.amount,
      method: e.method,
      reference: e.reference,
      date: back(e.day),
    });
  }
  await trpc("shop.expense", {
    unit: "zamzam",
    category: "transport",
    payee: "ভ্যান ভাড়া",
    amount: "600",
    method: "cash",
  });

  return true;
}
