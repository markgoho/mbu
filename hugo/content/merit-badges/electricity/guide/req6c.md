---
title: "Req 6c — Fuses & Circuit Breakers"
layout: guide
group_title: "Circuit Protection"
req_number: "6c"
prev: "/merit-badges/electricity/guide/req6b/"
prev_title: "Req 6b — Calculating Current Draw"
next: "/merit-badges/electricity/guide/req6d/"
next_title: "Req 6d — Finding & Resetting Breakers"
---

{{< drg/requirement number="6c" >}}
Explain why a fuse blows and a circuit breaker trips.
{{< /drg/requirement >}}

Fuses and circuit breakers are the bodyguards of your home's wiring. Their sole job is to detect when too much current is flowing through a circuit and to cut the power before the wires overheat and start a fire. They accomplish this in different ways, but the trigger is the same: excessive current.

## Why Excessive Current Is Dangerous

Wires have resistance. When current flows through a wire with resistance, the wire heats up. A little heat is normal and harmless. But when the current exceeds the wire's safe capacity, the heat builds until the wire's insulation melts, charring surrounding materials. Inside a wall, surrounded by wood framing and insulation, a hot wire can start a fire that burns undetected until it is too late.

Two situations cause excessive current:

1. **Overloading** — Too many devices drawing power from the same circuit. You learned about this in [Req 6a](/merit-badges/electricity/guide/req6a/).
2. **Short circuit** — A "hot" wire accidentally contacts a neutral wire or a ground, creating a path with almost zero resistance. With near-zero resistance, the current surges to enormous levels almost instantly. Short circuits can produce sparks, arcs, and intense heat in milliseconds.

## How a Fuse Works

A fuse contains a thin strip of metal (usually a zinc or tin alloy) designed to melt at a specific current level. When the current exceeds the fuse's rating, the metal strip heats up, melts, and breaks — physically severing the circuit. No circuit means no current, and the overload stops.

A blown fuse must be replaced with a new one. You cannot reset it. This is actually a safety feature — it forces someone to investigate why the fuse blew before restoring power.

### Types of Fuses

| Type | Description | Common Use |
|---|---|---|
| **Screw-in (Edison base)** | Glass cylinder with a metal strip visible through a window | Older home fuse boxes |
| **Cartridge** | Cylindrical tube with metal caps on each end | Large appliances (dryer, range) |
| **Type S (tamper-resistant)** | Threaded adapter prevents installing the wrong fuse size | Upgraded older fuse boxes |

When a screw-in fuse blows from an overload, the window will look cloudy or you may see the broken metal strip. When a fuse blows from a short circuit, the window will often be blackened from the sudden, intense arc.

## How a Circuit Breaker Works

A circuit breaker does the same job as a fuse, but it can be reset instead of replaced. Inside a circuit breaker, there are two mechanisms that detect excess current:

**Thermal trip (for overloads):** A bimetallic strip heats up as current flows through it. When the current exceeds the rated amount for a sustained period, the strip bends enough to release a spring-loaded mechanism that opens the circuit. This protects against slow, sustained overloads.

**Magnetic trip (for short circuits):** An electromagnet inside the breaker reacts to sudden surges of current. A massive spike (like a short circuit) creates a strong enough magnetic field to instantly trip the breaker. This protects against sudden, dangerous surges.

Most modern breakers use both mechanisms together, providing protection against both slow overloads and instantaneous short circuits.

{{< drg/did-you-know >}}
A short circuit can produce current of 10,000 amps or more — hundreds of times the circuit's normal capacity. The magnetic trip in a circuit breaker can open the circuit in as little as 1/30th of a second, fast enough to prevent the wiring from being damaged. Fuses can blow even faster — in as little as 1/1000th of a second for high-current faults.
{{< /drg/did-you-know >}}

## Fuses vs. Circuit Breakers

| Feature | Fuse | Circuit Breaker |
|---|---|---|
| **Reusable** | No — must be replaced | Yes — can be reset |
| **Response time** | Very fast (especially for short circuits) | Fast, but slightly slower than fuses |
| **Cost** | Inexpensive per unit | Higher initial cost, but no replacements needed |
| **Common in** | Older homes (pre-1960s) | Modern homes |
| **Failure mode** | Always fails safely (the metal strip melts) | Can occasionally fail to trip if worn |

{{< drg/tip >}}
If a breaker trips or a fuse blows repeatedly, do not keep resetting or replacing it. The protection device is telling you something is wrong — either the circuit is overloaded (reduce the load) or there is a short circuit somewhere (which requires an electrician to find and fix).
{{< /drg/tip >}}

{{< drg/image src="images/fuse-vs-breaker-internals.avif" alt="A side-by-side diagram showing the internal workings of a screw-in fuse with its thin metal strip, and a circuit breaker with its bimetallic strip and electromagnetic coil" >}}

{{< drg/external-link
    title="International Association of Certified Home Inspectors — Fuses and Breakers"
    url="https://www.nachi.org/electrical-inspection.htm"
    description="Technical overview of fuse boxes and circuit breaker panels, including common defects and safety concerns." >}}

{{< drg/next-page
    text="You now understand the mechanics behind fuses and circuit breakers."
    teaser="Learn how to locate a blown fuse or tripped breaker in your home — and how to safely reset it."
    url="/merit-badges/electricity/guide/req6d/" >}}
