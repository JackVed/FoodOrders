import { describe, expect, it } from "vitest";

import { buildSelectionDeltas } from "./pricing.js";

describe("buildSelectionDeltas", () => {
  it("uses option deltas for sum_options", () => {
    expect(
      buildSelectionDeltas(
        "sum_options",
        2,
        {
          firstSelectedDeltaCents: null,
          additionalSelectedDeltaCents: null,
          anySelectedDeltaCents: null,
          perSelectedDeltaCents: null,
        },
        [100, 150],
      ),
    ).toEqual([100, 150]);
  });

  it("charges only once for any_selected", () => {
    expect(
      buildSelectionDeltas(
        "any_selected",
        3,
        {
          firstSelectedDeltaCents: null,
          additionalSelectedDeltaCents: null,
          anySelectedDeltaCents: 50,
          perSelectedDeltaCents: null,
        },
        [0, 0, 0],
      ),
    ).toEqual([50, 0, 0]);
  });

  it("applies first and additional deltas", () => {
    expect(
      buildSelectionDeltas(
        "first_and_additional",
        3,
        {
          firstSelectedDeltaCents: 100,
          additionalSelectedDeltaCents: 150,
          anySelectedDeltaCents: null,
          perSelectedDeltaCents: null,
        },
        [0, 0, 0],
      ),
    ).toEqual([100, 150, 150]);
  });

  it("applies the same delta to each selected option for per_selected", () => {
    expect(
      buildSelectionDeltas(
        "per_selected",
        2,
        {
          firstSelectedDeltaCents: null,
          additionalSelectedDeltaCents: null,
          anySelectedDeltaCents: null,
          perSelectedDeltaCents: 25,
        },
        [0, 0],
      ),
    ).toEqual([25, 25]);
  });
});