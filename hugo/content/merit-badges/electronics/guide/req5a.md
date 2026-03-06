---
title: "Req 5a — Ohm's Law"
layout: guide
group_title: "Measurement & Components"
req_number: "5a"
prev: "/merit-badges/electronics/guide/req4c/"
prev_title: "Req 4c — Build a Circuit Project"
next: "/merit-badges/electronics/guide/req5b/"
next_title: "Req 5b — Test Equipment"
---

{{< drg/requirement number="5a" >}}
Show how to solve a simple problem involving current, voltage, and resistance using Ohm's law.
{{< /drg/requirement >}}

If electronics has one law you absolutely must know, this is it. Ohm's law describes the relationship between voltage, current, and resistance in every electrical circuit. Once you understand it, you can predict how a circuit will behave, calculate the right component values, and troubleshoot problems logically instead of guessing.

## The Three Variables

Before diving into the math, make sure you understand what each variable means:

**Voltage (V)** — The electrical "pressure" that pushes current through a circuit. Measured in **volts**. Think of it as the height of a waterfall — the higher the falls, the more force the water has.

**Current (I)** — The flow of electrical charge through a circuit. Measured in **amperes** (amps). Think of it as the amount of water flowing over the waterfall — gallons per second.

**Resistance (R)** — The opposition to current flow. Measured in **ohms** (the Greek letter omega). Think of it as a narrow pipe that restricts water flow — the narrower the pipe, the less water gets through.

## The Formula

Ohm's law is expressed in three equivalent forms:

- **V = I x R** (Voltage equals Current times Resistance)
- **I = V / R** (Current equals Voltage divided by Resistance)
- **R = V / I** (Resistance equals Voltage divided by Current)

All three say the same thing — they are just rearranged depending on which variable you need to find. Cover up the variable you are solving for, and the remaining two tell you what to do.

{{< drg/image src="images/ohms-law-triangle.avif" alt="Ohm's law reference showing V, I, and R in labeled boxes with the three formula variations displayed beneath" >}}

## Solving Problems

### Example 1: Find the Current

**A 9V battery powers a circuit with 450 ohms of resistance. How much current flows?**

Given: V = 9V, R = 450 ohms
Find: I

I = V / R = 9 / 450 = 0.02 amps = **20 milliamps (mA)**

### Example 2: Find the Resistance

**You want to limit current through an LED to 20mA using a 5V power supply. What resistor do you need?**

Given: V = 5V, I = 20mA = 0.02A
Find: R

R = V / I = 5 / 0.02 = **250 ohms**

(In practice, you would use the nearest standard resistor value: 270 ohms.)

### Example 3: Find the Voltage

**A circuit has a 1,000-ohm resistor with 5mA of current flowing through it. What is the voltage across the resistor?**

Given: R = 1,000 ohms, I = 5mA = 0.005A
Find: V

V = I x R = 0.005 x 1,000 = **5 volts**

{{< drg/did-you-know >}}
Georg Simon Ohm published his law in 1827, but the scientific community initially rejected it. His work was criticized, and he lost his teaching position. It took over a decade before other scientists confirmed his findings and recognized the importance of his discovery. Today, the unit of electrical resistance — the ohm — bears his name.
{{< /drg/did-you-know >}}

## Why It Matters

Ohm's law is not just an equation for a test — it is a tool you will use every time you design or troubleshoot a circuit. When you calculated the resistor for the LED example above, you did exactly what a working engineer does. Without that calculation, you would either burn out the LED (too much current) or get a dim, barely visible light (too little current).

In your [circuit project](/merit-badges/electronics/guide/req4c/), Ohm's law determined the value of every resistor in the schematic. And when you use a [multimeter](/merit-badges/electronics/guide/req5b/) to measure voltage and current in a circuit, you are verifying that Ohm's law holds true.

{{< drg/tip >}}
When working with milliamps (mA), convert to amps first by dividing by 1,000. Working with 20mA? That is 0.020A. This avoids the most common Ohm's law mistake — forgetting to convert units and getting an answer that is off by a factor of 1,000.
{{< /drg/tip >}}

## Practice Problems

Try these on your own before your counselor meeting. Work through the formula and check your answers:

1. A 12V battery powers a 600-ohm circuit. What is the current?
2. You need 50mA through a circuit powered by 3.3V. What resistance do you need?
3. A 2,200-ohm resistor carries 10mA of current. What voltage is across it?

{{< drg/external-link
    title="PhET Circuit Construction Kit"
    url="https://phet.colorado.edu/en/simulations/circuit-construction-kit-dc"
    description="Free interactive circuit simulator from the University of Colorado. Build virtual circuits and see Ohm's law in action — change a resistor value and watch the current change in real time." >}}

{{< drg/next-page
    text="Ohm's law tells you what should be happening in a circuit"
    teaser="but you need test equipment to measure what is actually happening. Learn about the tools of the trade."
    url="/merit-badges/electronics/guide/req5b/" >}}
