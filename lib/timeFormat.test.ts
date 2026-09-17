import { test } from "node:test";
import assert from "node:assert/strict";
import {
  describeConfidence,
  describeFreshness,
  describeLaunchTime,
  describeOutcome,
  describeOverdueLaunch,
  describePastLaunchDate,
  describeShortDate,
  describeShortFreshness,
  describeShortTime,
} from "./timeFormat";

test("TBD (unknown confidence) never shows a fabricated date", () => {
  const text = describeLaunchTime(
    { net: "2026-09-30T00:00:00Z", precision: "Month", windowStart: null, windowEnd: null },
    "unknown",
  );
  assert.equal(text, "Date not yet set");
});

test("coarse Quarter precision never claims day/time-level accuracy", () => {
  const text = describeLaunchTime(
    { net: "2026-10-31T00:00:00Z", precision: "Quarter", windowStart: null, windowEnd: null },
    "confirmed",
  );
  assert.equal(text, "Q4 2026");
});

test("Month precision shows month+year only, not a fabricated day", () => {
  const text = describeLaunchTime(
    { net: "2026-12-31T00:00:00Z", precision: "Month", windowStart: null, windowEnd: null },
    "estimated",
  );
  assert.equal(text, "December 2026");
});

test("Minute precision shows a real date and time", () => {
  const text = describeLaunchTime(
    { net: "2026-09-16T01:00:00Z", precision: "Minute", windowStart: null, windowEnd: null },
    "confirmed",
  );
  assert.equal(text, "16 September 2026, 01:00 UTC");
});

test("missing net with any confidence still degrades honestly", () => {
  const text = describeLaunchTime(
    { net: null, precision: null, windowStart: null, windowEnd: null },
    "confirmed",
  );
  assert.equal(text, "Date not yet set");
});

test("past launch date formatting degrades honestly when net is missing", () => {
  assert.equal(describePastLaunchDate({ net: null, precision: null, windowStart: null, windowEnd: null }), "Date unknown");
  assert.equal(
    describePastLaunchDate({ net: "2026-09-13T18:49:00Z", precision: "Minute", windowStart: null, windowEnd: null }),
    "13 September 2026",
  );
});

test("confidence labels", () => {
  assert.equal(describeConfidence("confirmed"), "Confirmed");
  assert.equal(describeConfidence("estimated"), "Estimated");
  assert.equal(describeConfidence("unknown"), null);
});

test("outcome labels never editorialize beyond a plain factual statement", () => {
  assert.equal(describeOutcome("success"), "Launched successfully");
  assert.equal(describeOutcome("failure"), "Launch failed");
  assert.equal(describeOutcome("partial_failure"), "Partial failure");
  assert.equal(describeOutcome(null), "Outcome unknown");
});

test("freshness degrades honestly when there is no cache yet", () => {
  assert.equal(describeFreshness(null), "No data yet");
  assert.equal(describeFreshness("2026-09-14T14:32:11.354Z"), "As of 14 September 2026, 14:32 UTC");
});

test("describeOverdueLaunch: shows honest 'awaiting update' language with the expected time, never an invented outcome", () => {
  const text = describeOverdueLaunch({
    net: "2026-09-16T06:00:00Z",
    precision: "Minute",
    windowStart: null,
    windowEnd: null,
  });
  assert.equal(text, "Awaiting update · expected 16 September 2026, 06:00 UTC");
});

test("describeOverdueLaunch degrades honestly when net is somehow missing", () => {
  assert.equal(describeOverdueLaunch({ net: null, precision: null, windowStart: null, windowEnd: null }), "Awaiting update");
});

test("describeShortTime keeps precision honest in compact form", () => {
  const t = (net: string | null, precision: string | null) => ({ net, precision, windowStart: null, windowEnd: null });
  assert.equal(describeShortTime(t("2026-09-18T03:15:00Z", "Minute"), "confirmed"), "18 Sep · 03:15");
  assert.equal(describeShortTime(t("2026-09-22T00:00:00Z", "Day"), "estimated"), "22 Sep");
  assert.equal(describeShortTime(t("2026-10-31T00:00:00Z", "Month"), "estimated"), "Oct 2026");
  assert.equal(describeShortTime(t("2026-12-31T00:00:00Z", "Quarter"), "estimated"), "Q4 2026");
  assert.equal(describeShortTime(t("2026-09-30T00:00:00Z", "Month"), "unknown"), "Date TBD");
  assert.equal(describeShortDate(t("2026-09-13T22:41:00Z", "Minute")), "13 Sep");
  assert.equal(describeShortFreshness("2026-09-14T18:12:00Z"), "As of 14 Sep, 18:12 UTC");
  assert.equal(describeShortFreshness(null), "No data yet");
});
