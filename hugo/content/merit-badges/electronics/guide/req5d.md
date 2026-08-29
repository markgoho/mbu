---
title: "Through Hole vs. Surface Mount"
layout: guide
group_title: "5. Measurement & Components"
req_number: "5d"
prev: "/merit-badges/electronics/guide/req5c/"
prev_title: "Resistor Color Codes"
next: "/merit-badges/electronics/guide/req6/"
next_title: "Career Exploration"
---

{{< drg/requirement number="5d" >}}
Explain the differences between Through Hole and Surface Mount assembly technologies and give three advantages of each.
{{< /drg/requirement >}}

When you built your circuit in [Req 4c](/merit-badges/electronics/guide/req4c/), you probably pushed component leads through holes in a breadboard or circuit board. That method — sticking wire leads through holes — is one of two fundamental ways to assemble electronics. The other method skips the holes entirely and mounts components directly on the surface. Each approach has distinct advantages, and understanding both gives you a fuller picture of how the electronics around you are built.

## Through Hole Technology (THT)

Through Hole components have wire leads (legs) that pass **through** holes drilled in the circuit board. The leads poke out the other side, where they are soldered to copper pads. This is the technology you have been using throughout this badge.

### How It Works

1. Component leads are inserted through holes in the PCB from the top (component side).
2. The leads protrude from the bottom (solder side).
3. Solder is applied to the leads on the bottom, forming mechanical and electrical connections.

### Three Advantages of Through Hole

**Strong mechanical connections** — The leads pass completely through the board and are soldered on the other side, creating joints that are physically robust. Through Hole components can withstand vibration, shock, and mechanical stress much better than surface-mounted parts. This is why Through Hole is still used in aerospace, military, and industrial equipment where reliability under harsh conditions is critical.

**Easy for hand soldering and prototyping** — Through Hole components are large enough to handle with your fingers, and the holes guide placement. This makes them ideal for learning, prototyping on breadboards, and hand-assembly projects — exactly the kind of work you do for this merit badge.

**Simple to inspect and rework** — Because the components and solder joints are relatively large, you can visually inspect them without magnification. If a joint is bad or a component needs to be replaced, desoldering and reworking is straightforward with basic tools (as you demonstrated in [Req 3a](/merit-badges/electronics/guide/req3/)).

{{< drg/image src="images/through-hole-vs-smt-comparison.avif" alt="Side-by-side comparison showing a through-hole resistor next to a surface mount resistor on a circuit board, with the dramatic size difference clearly visible" >}}

## Surface Mount Technology (SMT)

Surface Mount components sit flat **on the surface** of the circuit board. Instead of leads that pass through holes, they have tiny metal pads or short tabs that are soldered directly to matching pads on the board's surface.

### How It Works

1. Solder paste (a mixture of tiny solder particles and flux) is applied to the board's surface pads.
2. A pick-and-place machine positions each component precisely on its pads.
3. The entire board passes through a reflow oven that melts the solder paste, bonding all components simultaneously.

### Three Advantages of Surface Mount

**Dramatically smaller size** — Surface Mount components are a fraction of the size of their Through Hole equivalents. A Through Hole resistor might be 6mm long; an SMT resistor can be smaller than a grain of sand (as small as 0.4mm x 0.2mm). This miniaturization is what makes smartphones, smartwatches, and wireless earbuds possible.

**Higher component density** — Because SMT components are small and can be placed on both sides of the board, engineers can pack far more components into the same board area. A modern smartphone motherboard contains thousands of components in a space smaller than a playing card.

**Better high-frequency performance** — SMT components have shorter electrical paths and smaller lead inductance compared to Through Hole parts. At high frequencies (radio, wireless, high-speed digital), these shorter paths reduce signal distortion and interference. This is why all modern wireless devices use SMT.

{{< drg/did-you-know >}}
A modern smartphone motherboard contains over 1,000 surface mount components, many of them smaller than the period at the end of this sentence. Automated pick-and-place machines in factories can place up to 80,000 components per hour — far beyond what any human hand could achieve.
{{< /drg/did-you-know >}}

## Side-by-Side Comparison

| Feature | Through Hole | Surface Mount |
|---|---|---|
| Component size | Large (millimeters to centimeters) | Tiny (fractions of a millimeter) |
| Assembly method | Hand soldering or wave solder | Solder paste + reflow oven |
| Board density | Lower | Much higher |
| Mechanical strength | Very strong | Adequate for most uses |
| Repairability | Easy with basic tools | Requires specialized tools |
| Cost at high volume | Higher (drilling holes is expensive) | Lower |
| Prototyping ease | Excellent | Difficult without equipment |
| High-frequency performance | Good | Excellent |

## The Modern Reality

Today's electronics use both technologies — often on the same board. Through Hole is used for components that need mechanical strength (connectors, large capacitors, power components) or are intended for hand assembly. Surface Mount is used for everything else. When you open a computer or game console, you will see both types working together.

{{< drg/tip >}}
Look inside any old desktop computer and compare it to a modern one. The difference in component size between boards from the 1990s (mostly Through Hole) and boards from today (almost entirely Surface Mount) is striking. If you have an old piece of electronics, ask your counselor if you can open it up and identify which assembly technology was used.
{{< /drg/tip >}}

{{< drg/external-link
    title="IPC — Association Connecting Electronics Industries"
    url="https://www.ipc.org/content-page/About-IPC"
    description="The global trade association for the electronics manufacturing industry. IPC sets the standards that define soldering quality, PCB design, and assembly methods used worldwide." >}}

{{< drg/next-page
    text="You now understand how circuits are designed, built, and assembled"
    teaser="explore the career paths where these skills can take you."
    url="/merit-badges/electronics/guide/req6/" >}}
