import { describe, it, expect } from "vitest";
import { scrubEvent } from "./sentryScrub";

describe("scrubEvent", () => {
  it("removes the cookie jar (the sb-* session lives there)", () => {
    const e = scrubEvent({ request: { cookies: { "sb-access-token": "secret" } } });
    expect(e.request?.cookies).toBeUndefined();
  });

  it("removes Cookie / Authorization / sb-* headers, case-insensitively, keeping the rest", () => {
    const e = scrubEvent({
      request: {
        headers: {
          Cookie: "sb-access-token=secret",
          authorization: "Bearer x",
          "SB-Refresh": "r",
          "user-agent": "Mozilla/5.0",
        },
      },
    });
    expect(e.request?.headers).toEqual({ "user-agent": "Mozilla/5.0" });
  });

  it("removes email and ip_address but keeps id", () => {
    const e = scrubEvent({ user: { id: "u1", email: "a@b.com", ip_address: "1.2.3.4" } });
    expect(e.user).toEqual({ id: "u1" });
  });

  it("is a no-op on an event with no request or user", () => {
    const e = scrubEvent({ message: "boom" });
    expect(e).toEqual({ message: "boom" });
  });
});
