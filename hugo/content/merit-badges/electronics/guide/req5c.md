---
title: "Req 5c — Resistor Color Codes"
layout: guide
group_title: "Measurement & Components"
req_number: "5c"
prev: "/merit-badges/electronics/guide/req5b/"
prev_title: "Req 5b — Test Equipment"
next: "/merit-badges/electronics/guide/req5d/"
next_title: "Req 5d — Through Hole vs. Surface Mount"
---

{{< drg/requirement number="5c" >}}
Demonstrate to your counselor how to read the colored bands of a resistor to determine its resistance value.
{{< /drg/requirement >}}

Resistors are too small to print numbers on, so manufacturers use a system of colored bands painted around the body of the resistor to indicate its value. Once you learn the code, you can pick up any resistor and read its value in seconds — a skill that will serve you every time you build or repair a circuit.

## The Color Code

Each color represents a digit from 0 to 9:

| Color | Digit | Memory Aid |
|---|---|---|
| Black | 0 | Black = Zero, nothing |
| Brown | 1 | B comes after A, 1 comes after 0 |
| Red | 2 | Red has 2 letters after R |
| Orange | 3 | Orange has 3 more letters than Red |
| Yellow | 4 | Yellow — 4 letters in "yell" |
| Green | 5 | Green — 5 letters |
| Blue | 6 | Blue — 6 when you add "in" |
| Violet | 7 | Violet — 7 letters? Close enough |
| Gray | 8 | Gray — rhymes with eight |
| White | 9 | White — brightest, highest |

### The Mnemonic

A classic way to remember the order is:

**B**ad **B**oys **R**un **O**ver **Y**ellow **G**ardens **B**ut **V**iolets **G**row **W**ild

Each word's first letter matches the color: Black, Brown, Red, Orange, Yellow, Green, Blue, Violet, Gray, White.

## Reading a 4-Band Resistor

Most resistors you will encounter have four colored bands. Here is how to read them:

1. **Orient the resistor** so the band closest to one end is on the left. The tolerance band (usually gold or silver) should be on the right.
2. **Band 1** (leftmost) — First significant digit.
3. **Band 2** — Second significant digit.
4. **Band 3** — Multiplier (the number of zeros to add after the first two digits).
5. **Band 4** — Tolerance (how accurate the value is).

### Multiplier Band

The multiplier band uses the same color-to-number code, but the number tells you how many zeros to add (or equivalently, the power of 10 to multiply by):

| Color | Multiplier | Multiply by |
|---|---|---|
| Black | x1 | 1 |
| Brown | x10 | 10 |
| Red | x100 | 100 |
| Orange | x1,000 | 1K |
| Yellow | x10,000 | 10K |
| Green | x100,000 | 100K |
| Blue | x1,000,000 | 1M |
| Gold | x0.1 | 0.1 |
| Silver | x0.01 | 0.01 |

### Tolerance Band

| Color | Tolerance |
|---|---|
| Gold | ±5% |
| Silver | ±10% |
| None | ±20% |

## Worked Examples

### Example 1: Brown, Black, Red, Gold

- Band 1: Brown = **1**
- Band 2: Black = **0**
- Band 3: Red = **x100**
- Band 4: Gold = **±5%**

Value: 10 x 100 = **1,000 ohms (1K ohm) ±5%**

### Example 2: Yellow, Violet, Orange, Gold

- Band 1: Yellow = **4**
- Band 2: Violet = **7**
- Band 3: Orange = **x1,000**
- Band 4: Gold = **±5%**

Value: 47 x 1,000 = **47,000 ohms (47K ohm) ±5%**

### Example 3: Red, Red, Brown, Silver

- Band 1: Red = **2**
- Band 2: Red = **2**
- Band 3: Brown = **x10**
- Band 4: Silver = **±10%**

Value: 22 x 10 = **220 ohms ±10%**

{{< drg/image src="images/resistor-color-bands-example.avif" alt="Three through-hole resistors shown side by side with colored bands clearly visible and their resistance values labeled" >}}

{{< drg/did-you-know >}}
Why colors instead of printed numbers? When resistors were first mass-produced in the 1920s, they were too small for readable text, and printing technology could not reliably mark cylindrical parts. Colored bands could be applied by machine and read from any angle. The system worked so well that it has survived for over a century, even as printing technology has improved.
{{< /drg/did-you-know >}}

## 5-Band Resistors

Higher-precision resistors use five bands instead of four. The first three bands are significant digits, the fourth is the multiplier, and the fifth is tolerance. For example:

**Brown, Red, Green, Brown, Brown** = 1, 2, 5 x 10 = 1,250 ohms ±1%

## Verifying Your Reading

After reading the color code, always verify with your multimeter in resistance mode. Touch the probes to both leads and compare the displayed value to your reading. This confirms both your color-code interpretation and that the resistor has not been damaged by heat or overvoltage. You learned how to measure resistance in [Req 5b](/merit-badges/electronics/guide/req5b/).

{{< drg/tip >}}
Having trouble telling brown from red, or orange from yellow? You are not alone — the bands can be tricky under different lighting. Hold the resistor under bright, white light and compare it side by side with resistors you have already identified. With practice, the colors become unmistakable. If you are color blind, a multimeter is always the definitive check.
{{< /drg/tip >}}

{{< drg/external-link
    title="Digi-Key Resistor Color Code Calculator"
    url="https://www.digikey.com/en/resources/conversion-calculators/conversion-calculator-resistor-color-code"
    description="Interactive online tool — select band colors and see the resistance value calculated instantly. Great for double-checking your readings." >}}

{{< drg/next-page
    text="You can identify a resistor by its stripes"
    teaser="now learn about the two main ways electronic components are assembled onto circuit boards."
    url="/merit-badges/electronics/guide/req5d/" >}}
