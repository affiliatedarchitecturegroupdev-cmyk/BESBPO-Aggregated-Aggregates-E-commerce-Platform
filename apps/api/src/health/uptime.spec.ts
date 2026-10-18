import { nextState } from "./uptime";

describe("uptime monitor", () => {
  it("alerts after two failures in a row, once, and again on recovery", () => {
    let s = nextState(undefined, false);
    expect(s.alert).toBeNull();
    s = nextState(s.state, false);
    expect(s.alert).toBe("DOWN");
    s = nextState(s.state, false);
    expect(s.alert).toBeNull();
    s = nextState(s.state, true);
    expect(s.alert).toBe("RECOVERED");
    expect(nextState(nextState(undefined, false).state, true).alert).toBeNull(); // one blip isn't news
  });
});
