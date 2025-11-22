import { describe, it, expect } from "vitest";
import { calculateSplit } from "@shared/calculations";

describe("Group assignment calculations", () => {
  it("should correctly calculate with group assignments - test case A, B, C", () => {
    // Test case from requirements:
    // 3 participants: A, B, C
    // 2 dishes:
    // - Плов 100000 → group A + B
    // - Мясо 140000 → group B + C
    // Expected:
    // A: 50000
    // B: 50000 + 70000 = 120000
    // C: 70000

    const participants = [
      { id: "p1", name: "A" },
      { id: "p2", name: "B" },
      { id: "p3", name: "C" },
    ];

    const groups = [
      {
        id: "g1",
        name: "A, B",
        memberIds: ["p1", "p2"],
      },
      {
        id: "g2",
        name: "B, C",
        memberIds: ["p2", "p3"],
      },
    ];

    const dishes = [
      {
        id: "d1",
        name: "Плов",
        qty: 1,
        totalPrice: 100000,
        assignments: [
          // Unit 1: assigned to group g1 (A, B)
          [{ type: "group" as const, id: "g1" }],
        ],
      },
      {
        id: "d2",
        name: "Мясо",
        qty: 1,
        totalPrice: 140000,
        assignments: [
          // Unit 1: assigned to group g2 (B, C)
          [{ type: "group" as const, id: "g2" }],
        ],
      },
    ];

    const result = calculateSplit(dishes, participants, groups, 0);

    console.log("Result:", result);

    // Check expected values
    expect(result["p1"]).toBe(50000); // A
    expect(result["p2"]).toBe(120000); // B
    expect(result["p3"]).toBe(70000); // C
  });

  it("should handle mixed participant and group assignments", () => {
    const participants = [
      { id: "p1", name: "A" },
      { id: "p2", name: "B" },
      { id: "p3", name: "C" },
    ];

    const groups = [
      {
        id: "g1",
        name: "A, B",
        memberIds: ["p1", "p2"],
      },
    ];

    // Dish with 2 units:
    // Unit 1: assigned to participant p1
    // Unit 2: assigned to group g1 (A, B)
    const dishes = [
      {
        id: "d1",
        name: "Pizza",
        qty: 2,
        totalPrice: 200, // 100 per unit
        assignments: [
          [{ type: "participant" as const, id: "p1" }],
          [{ type: "group" as const, id: "g1" }],
        ],
      },
    ];

    const result = calculateSplit(dishes, participants, groups, 0);

    // Unit 1 (100): p1 gets 100
    // Unit 2 (100): split between A and B = 50 each
    // Result: p1 = 100 + 50 = 150, p2 = 50, p3 = 0
    expect(result["p1"]).toBe(150);
    expect(result["p2"]).toBe(50);
    expect(result["p3"]).toBe(0);
  });

  it("should handle unassigned units divided equally", () => {
    const participants = [
      { id: "p1", name: "A" },
      { id: "p2", name: "B" },
      { id: "p3", name: "C" },
    ];

    const groups: any[] = [];

    const dishes = [
      {
        id: "d1",
        name: "Bread",
        qty: 3,
        totalPrice: 300, // 100 per unit
        assignments: [
          [{ type: "participant" as const, id: "p1" }], // Unit 1: p1
          [], // Unit 2: unassigned
          [], // Unit 3: unassigned
        ],
      },
    ];

    const result = calculateSplit(dishes, participants, groups, 0);

    // Unit 1 (100): p1 gets 100
    // Units 2 & 3 (200): divided equally among all 3 = 200/3 ≈ 66.67 each
    // Result: p1 = 100 + 66.67 = 166.67, p2 = 66.67, p3 = 66.67
    expect(Math.abs(result["p1"] - 166.67)).toBeLessThan(0.01);
    expect(Math.abs(result["p2"] - 66.67)).toBeLessThan(0.01);
    expect(Math.abs(result["p3"] - 66.67)).toBeLessThan(0.01);
  });
});
