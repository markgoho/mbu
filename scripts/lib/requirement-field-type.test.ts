import { describe, expect, test } from "bun:test";
import {
  asksToExplainDrawing,
  classifySegment,
  parseCompletionClause,
} from "./requirement-field-type.ts";

describe("classifySegment", () => {
  test("a written plan is writing, not a drawing", () => {
    expect(
      classifySegment(
        "Make a written plan for an overnight trek and show how to get to your camping spot by using a topographical map and one of the following:",
      ),
    ).toBe("write-long");
    expect(classifySegment("Prepare a typical float plan.")).toBe("write-long");
    expect(
      classifySegment(
        "Make a duty roster showing how your patrol is organized for an actual overnight campout.",
      ),
    ).toBe("write-long");
  });

  test("real drawings still get a drawing space", () => {
    expect(
      classifySegment("Make a drawing to show the hydrologic cycle."),
    ).toBe("draw");
    expect(classifySegment("Sketch what you see.")).toBe("draw");
    expect(classifySegment("Make a sketch or model of your design.")).toBe(
      "draw",
    );
  });

  test("drawing verbs that name a skill are not drawings", () => {
    expect(classifySegment("Draw stroke")).not.toBe("draw");
    expect(classifySegment("Draw out by forging a taper.")).not.toBe("draw");
  });

  test("a model you build is a completion checkbox", () => {
    expect(classifySegment("Make a model of it.")).toBe("demonstrate");
    expect(
      classifySegment(
        "Make a model tooth out of soap, clay, paper-mache, or wax.",
      ),
    ).toBe("demonstrate");
  });

  test("only a single amount gets a one-line answer", () => {
    expect(classifySegment("Determine the percentage of live seeds.")).toBe(
      "compute",
    );
    expect(classifySegment("Measure the air temperature.")).toBe("compute");
    expect(classifySegment("Determine who should go on the expedition.")).toBe(
      "write-long",
    );
    expect(classifySegment("Determine the cost for each meal.")).toBe(
      "write-long",
    );
  });
});

describe("asksToExplainDrawing", () => {
  test("a drawing plus an explanation", () => {
    expect(
      asksToExplainDrawing(
        "Make a drawing and explain how a home hot- and cold-water supply system works.",
      ),
    ).toBe(true);
    expect(asksToExplainDrawing("Sketch what you see.")).toBe(false);
  });
});

describe("parseCompletionClause", () => {
  test("labels the clause, not the official sentences after it", () => {
    expect(
      parseCompletionClause(
        "Conduct a pre-expedition check, covering the steps in requirement 6, and share the results with your counselor. With your counselor, walk through the SAFE Checklist.",
      ),
    ).toBe("Shared the results with your counselor");
  });

  test("past tense of the clause verb", () => {
    expect(
      parseCompletionClause(
        "Learn a song, and teach it to a group of your friends.",
      ),
    ).toBe("Taught it to a group of your friends");
  });
});
