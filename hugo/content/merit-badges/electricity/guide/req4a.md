---
title: "Req 4a — DC vs. AC Current"
layout: guide
group_title: "How Electricity Works"
req_number: "4a"
prev: "/merit-badges/electricity/guide/req3/"
prev_title: "Req 3 — Build an Electromagnet"
next: "/merit-badges/electricity/guide/req4b/"
next_title: "Req 4b — Generating Electricity"
---

{{< drg/requirement number="4a" >}}
Explain the difference between direct current and alternating current, the advantages and disadvantages of each, and give a practical example of the use of each type.
{{< /drg/requirement >}}

Every electrical device you use runs on one of two types of current. The battery in your flashlight produces one kind. The outlet in your wall delivers another. Understanding the difference between direct current (DC) and alternating current (AC) — and why we use each one — is fundamental to understanding electricity.

## Direct Current (DC)

In a **direct current** circuit, electrons flow in one direction only — from the negative terminal of the source, through the circuit, and back to the positive terminal. The flow is steady and constant, like water running through a pipe in one direction.

**Sources of DC:**
- Batteries (AA, D-cell, car battery, phone battery)
- Solar panels
- USB chargers (convert AC to DC)
- Fuel cells

**Advantages:**
- Simple and easy to understand
- Ideal for low-voltage electronics (phones, computers, LED lights)
- Batteries naturally produce DC
- Easier to store (batteries are DC by nature)

**Disadvantages:**
- Difficult to transmit over long distances — DC loses significant energy as heat in the wires
- Hard to step up or step down to different voltages (requires expensive electronic converters)
- Edison's DC power plants in the 1880s could only serve customers within about one mile

**Practical example:** Your smartphone runs on DC power from its lithium-ion battery. When you plug in the charger, the charger converts the AC power from the wall outlet into the DC power your phone needs.

## Alternating Current (AC)

In an **alternating current** circuit, electrons reverse direction many times per second. In the United States, AC switches direction 120 times per second (60 complete cycles per second, or 60 Hz). The current does not flow steadily — it surges forward, slows, stops, reverses, surges the other way, and repeats.

**Sources of AC:**
- Power plants (coal, natural gas, nuclear, hydroelectric, wind)
- Generators
- Wall outlets (in homes and buildings)

**Advantages:**
- Easy to transmit over long distances — transformers can step AC voltage up to hundreds of thousands of volts for efficient long-distance transmission, then step it back down for home use
- Transformers are simple, inexpensive, and highly efficient
- AC motors are simpler and cheaper to build than DC motors
- Powers the entire electrical grid

**Disadvantages:**
- More complex to understand (the voltage is constantly changing)
- Cannot be stored directly — you need a battery (DC) or some other storage method
- More dangerous at the same voltage because the alternating nature can cause muscles to lock onto the source

**Practical example:** The electricity that powers your home's lights, refrigerator, and HVAC system is AC, delivered at 120 volts and 60 Hz through the wiring in your walls.

{{< drg/did-you-know >}}
Nikola Tesla did not just invent the AC system — he held the patents for AC motors, transformers, and polyphase power distribution. George Westinghouse bought Tesla's patents and built the first major AC power plant at Niagara Falls in 1895. That plant transmitted electricity 26 miles to Buffalo, New York — a feat impossible with Edison's DC system.
{{< /drg/did-you-know >}}

## AC vs. DC: Side-by-Side

| Feature | Direct Current (DC) | Alternating Current (AC) |
|---|---|---|
| **Electron flow** | One direction | Reverses direction constantly |
| **Voltage** | Constant | Rises and falls in a wave pattern |
| **Long-distance transmission** | Poor — high energy loss | Excellent — transformers step voltage up/down |
| **Storage** | Easy (batteries) | Cannot be stored directly |
| **Typical uses** | Electronics, batteries, solar, vehicles | Power grid, home wiring, appliances |
| **Voltage change** | Requires electronic converters | Simple, cheap transformers |

## The Modern Twist

Today, the line between AC and DC is blurring. Solar panels produce DC. Electric vehicle batteries store DC. Your laptop, phone, and LED lights all run on DC. Data centers — the backbone of the internet — run almost entirely on DC internally. Some engineers argue that a DC grid would be more efficient for modern needs, since we keep converting AC to DC at every device. The truth is, we need both: AC for long-distance transmission and DC for the electronics that define modern life.

{{< drg/image src="images/ac-vs-dc-waveform.avif" alt="A side-by-side comparison diagram showing DC current as a flat horizontal line at constant voltage, and AC current as a smooth sine wave oscillating above and below zero" >}}

{{< drg/external-link
    title="U.S. Department of Energy — Electricity 101"
    url="https://www.energy.gov/oe/electricity-101"
    description="A clear overview of how electricity is generated, transmitted, and delivered to homes and businesses." >}}

{{< drg/next-page
    text="You now understand the fundamental difference between DC and AC current."
    teaser="Explore three ways that electricity is produced — from spinning turbines to sunlight hitting silicon."
    url="/merit-badges/electricity/guide/req4b/" >}}
