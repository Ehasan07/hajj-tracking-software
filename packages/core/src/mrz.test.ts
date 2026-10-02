import { describe, expect, it } from "vitest";
import { checkDigit, maskPassportNumber, normalizePassportNumber, parsePassportMrz, passportValidFor } from "./mrz";

// Specimen from ICAO Doc 9303 part 4.
const LINE1 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<";
const LINE2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<10";
const today = new Date("2026-10-02T00:00:00Z");

describe("passport MRZ", () => {
  it("computes ICAO check digits", () => {
    expect(checkDigit("L898902C3")).toBe(6);
    expect(checkDigit("740812")).toBe(2);
    expect(checkDigit("120415")).toBe(9);
  });

  it("parses the ICAO specimen", () => {
    const result = parsePassportMrz(`${LINE1}\n${LINE2}`, today);
    expect(result).toEqual({
      ok: true,
      value: {
        documentType: "P",
        issuingCountry: "UTO",
        surname: "ERIKSSON",
        givenNames: "ANNA MARIA",
        passportNumber: "L898902C3",
        nationality: "UTO",
        dateOfBirth: "1974-08-12",
        sex: "F",
        expiryDate: "2012-04-15",
        personalNumber: "ZE184226B",
      },
    });
  });

  it("accepts scanner output on one line, lowercase, with spaces", () => {
    const result = parsePassportMrz(` ${(LINE1 + LINE2).toLowerCase().replace("ANNA".toLowerCase(), "anna ")} `, today);
    expect(result.ok).toBe(true);
  });

  it("rejects a mistyped passport number by its check digit", () => {
    const broken = LINE2.replace("L898902C3", "L898902C4");
    expect(parsePassportMrz(`${LINE1}\n${broken}`, today)).toEqual({ ok: false, error: "CHECK_PASSPORT_NUMBER" });
  });

  it("rejects wrong lengths", () => {
    expect(parsePassportMrz(`${LINE1}\n${LINE2.slice(0, 40)}`, today)).toEqual({ ok: false, error: "FORMAT" });
  });

  it("puts a 2-digit birth year in the right century", () => {
    // Born '08 is 2008 when today is 2026; born '74 would be 1974.
    const number = "A12345678";
    const birth = "080101";
    const expiry = "310101";
    const personal = "<<<<<<<<<<<<<<";
    const head = `${number}${checkDigit(number)}BGD${birth}${checkDigit(birth)}M${expiry}${checkDigit(expiry)}${personal}<`;
    const line2 = head + String(checkDigit(head.slice(0, 10) + head.slice(13, 20) + head.slice(21, 43)));
    const result = parsePassportMrz(`P<BGDRAHMAN<<KARIM<<<<<<<<<<<<<<<<<<<<<<<<<<\n${line2}`, today);
    expect(result.ok && result.value.dateOfBirth).toBe("2008-01-01");
    expect(result.ok && result.value.expiryDate).toBe("2031-01-01");
    expect(result.ok && result.value.givenNames).toBe("KARIM");
  });

  it("checks six months of validity before travel", () => {
    expect(passportValidFor("2027-12-01", "2027-05-20")).toBe(true);
    expect(passportValidFor("2027-11-01", "2027-05-20")).toBe(false);
  });

  it("normalises and masks numbers", () => {
    expect(normalizePassportNumber(" a01 234-567 ")).toBe("A01234567");
    expect(maskPassportNumber("A01234567")).toBe("A0•••••67");
  });
});
