/**
 * The uptime monitor's rules (docs/uptime.md), kept pure so they can be
 * tested: a component is reported down after two failed checks in a row
 * (one slow answer isn't an outage), and reported again only when it
 * recovers.
 */

export type ComponentState = { up: boolean; failures: number; reportedDown: boolean };
export const FAILURES_BEFORE_ALERT = 2;

export function nextState(state: ComponentState | undefined, ok: boolean): { state: ComponentState; alert: "DOWN" | "RECOVERED" | null } {
  const prev = state ?? { up: true, failures: 0, reportedDown: false };
  if (ok) {
    return { state: { up: true, failures: 0, reportedDown: false }, alert: prev.reportedDown ? "RECOVERED" : null };
  }
  const failures = prev.failures + 1;
  const report = !prev.reportedDown && failures >= FAILURES_BEFORE_ALERT;
  return { state: { up: false, failures, reportedDown: prev.reportedDown || report }, alert: report ? "DOWN" : null };
}
