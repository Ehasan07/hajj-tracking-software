import { describe, expect, it } from "vitest";
import { ageOn, documentsFor, readiness, type DocumentState } from "./documents";

const today = "2026-10-02";

describe("documents a pilgrim must hand in", () => {
  it("counts full years of age", () => {
    expect(ageOn("2008-10-03", today)).toBe(17);
    expect(ageOn("2008-10-02", today)).toBe(18);
  });

  it("asks adults for an NID and minors for a birth certificate", () => {
    const adult = documentsFor({ kind: "hajj", gender: "male", dateOfBirth: "1970-01-01" }, today).map((d) => d.code);
    expect(adult).toContain("nid");
    expect(adult).not.toContain("birth_certificate");
    const child = documentsFor({ kind: "umrah", gender: "male", dateOfBirth: "2015-05-05" }, today).map((d) => d.code);
    expect(child).toContain("birth_certificate");
    expect(child).not.toContain("nid");
  });

  it("asks Hajj-only papers only for Hajj", () => {
    const umrah = documentsFor({ kind: "umrah", gender: "male" }, today).map((d) => d.code);
    expect(umrah).not.toContain("prp_slip");
    expect(umrah).not.toContain("medical");
  });

  it("offers the mahram proof for women only", () => {
    expect(documentsFor({ kind: "hajj", gender: "female" }, today).map((d) => d.code)).toContain("mahram_proof");
    expect(documentsFor({ kind: "hajj", gender: "male" }, today).map((d) => d.code)).not.toContain("mahram_proof");
  });
});

describe("readiness to finalise", () => {
  const verified = (codes: string[]): DocumentState[] => codes.map((code) => ({ code, status: "verified" }));
  const base = {
    kind: "hajj" as const,
    gender: "male" as const,
    dateOfBirth: "1970-01-01",
    hasPassportNumber: true,
    passportExpiry: "2028-01-01",
    due: 0,
    prpNumber: "PRP-123",
  };

  it("is ready when every required paper is verified, paid in full and passport valid", () => {
    const result = readiness(
      { ...base, documents: verified(["photo", "passport", "nid", "vaccination", "medical", "prp_slip"]) },
      today,
    );
    expect(result).toEqual({ ready: true, issues: [] });
  });

  it("lists everything that is still missing", () => {
    const result = readiness(
      {
        ...base,
        documents: [
          { code: "photo", status: "verified" },
          { code: "passport", status: "received" },
          { code: "nid", status: "rejected" },
        ],
        passportExpiry: "2027-01-01",
        due: 50_000_00,
        prpNumber: "",
      },
      today,
    );
    expect(result.ready).toBe(false);
    expect(result.issues).toEqual([
      { kind: "document_unverified", code: "passport" },
      { kind: "document_rejected", code: "nid" },
      { kind: "document_missing", code: "vaccination" },
      { kind: "document_missing", code: "medical" },
      { kind: "document_missing", code: "prp_slip" },
      { kind: "passport_validity", expiry: "2027-01-01" },
      { kind: "payment_due", due: 50_000_00 },
      { kind: "prp_missing" },
    ]);
  });

  it("uses the newest upload of a document", () => {
    const result = readiness(
      {
        ...base,
        kind: "umrah",
        documents: [
          { code: "photo", status: "verified" },
          { code: "passport", status: "verified" },
          { code: "nid", status: "rejected" },
          { code: "nid", status: "verified" },
          { code: "vaccination", status: "verified" },
        ],
      },
      today,
    );
    expect(result.ready).toBe(true);
  });

  it("flags an expired vaccination certificate", () => {
    const docs = verified(["photo", "passport", "nid", "medical", "prp_slip"]);
    docs.push({ code: "vaccination", status: "verified", expiresOn: "2026-01-01" });
    expect(readiness({ ...base, documents: docs }, today).issues).toEqual([{ kind: "document_expired", code: "vaccination" }]);
  });

  it("checks passport validity against the travel date when known", () => {
    const docs = verified(["photo", "passport", "nid", "vaccination", "medical", "prp_slip"]);
    expect(readiness({ ...base, documents: docs, passportExpiry: "2027-06-01", travelDate: "2027-05-20" }, today).ready).toBe(false);
  });
});
