---
title: "Req 7 — Air, Fuel & Injection"
layout: guide
group_title: "Fuel System"
req_number: "7"
prev: "/merit-badges/automotive-maintenance/guide/req6/"
prev_title: "Req 6 — Coolant & Cooling"
next: "/merit-badges/automotive-maintenance/guide/req8a/"
next_title: "Req 8a — Electrical System Diagrams"
---

{{< drg/requirement number="7a" >}}
Explain how the air and fuel systems work together and why it is necessary to have an air filter and fuel filter.
{{< /drg/requirement >}}

An engine needs three things to run: fuel, air, and a spark (or compression, in a diesel). The air system and fuel system work together to deliver exactly the right mixture of clean air and clean fuel to the engine's cylinders at exactly the right time.

### How Air and Fuel Work Together

The engine needs a precise **air-fuel ratio** to burn efficiently. For a gasoline engine, the ideal ratio is approximately **14.7 parts air to 1 part fuel** by weight — this is called the **stoichiometric ratio**. Too much fuel (a "rich" mixture) wastes gas and increases emissions. Too little fuel (a "lean" mixture) can cause overheating, misfires, and engine damage.

**The air path:**
1. Air enters through the **air intake** (usually a large opening at the front of the engine bay).
2. It passes through the **engine air filter**, which removes dirt, dust, and debris.
3. Clean air flows through the **intake manifold** to the cylinders.

**The fuel path:**
1. Fuel is stored in the **fuel tank** (usually under the rear of the vehicle).
2. The **fuel pump** pushes fuel through the **fuel lines** toward the engine.
3. Fuel passes through the **fuel filter**, which removes dirt and contaminants.
4. Clean fuel reaches the **fuel injectors**, which spray a precise amount of fuel into the air stream or directly into the cylinders.

### Why the Air Filter Matters

The air filter is a barrier between dirty outdoor air and the engine's precisely engineered internals. Without it:

- Dust and dirt particles would be sucked into the cylinders, acting like sandpaper on the piston walls and rings.
- Insects, leaves, and other debris could damage or clog engine components.
- Engine wear would increase dramatically, shortening the engine's life.

A clean air filter ensures maximum airflow for efficient combustion. As discussed in [Requirement 2e](/merit-badges/automotive-maintenance/guide/req2d/), a dirty air filter restricts airflow and reduces performance.

### Why the Fuel Filter Matters

Even though gasoline and diesel fuel are refined products, they can pick up contaminants:

- Rust and sediment from the inside of fuel tanks and storage containers
- Moisture from condensation
- Dirt that enters during refueling

The fuel filter traps these particles before they reach the fuel injectors. Fuel injectors have extremely tiny openings — sometimes as small as a human hair — and even microscopic debris can clog them, causing misfires, reduced power, and poor fuel economy.

{{< drg/did-you-know >}}
A single fuel injector can spray fuel at pressures up to 2,000 PSI (pounds per square inch) in a modern gasoline direct injection (GDI) engine. Diesel injectors operate at even higher pressures — up to 30,000 PSI or more. At those pressures, keeping the fuel absolutely clean is critical.
{{< /drg/did-you-know >}}

{{< drg/image src="images/air-fuel-system-diagram.avif" alt="A simplified diagram showing the air path (air intake to air filter to intake manifold) and fuel path (fuel tank to fuel pump to fuel filter to fuel injectors) converging at the engine cylinders" >}}

---

{{< drg/requirement number="7b" >}}
Explain how a how a fuel injection system works and how an onboard computer works with the fuel injection system.
{{< /drg/requirement >}}

### How Fuel Injection Works

Fuel injection replaced carburetors (which mechanically mixed air and fuel) in the 1980s and 1990s. It is far more precise, efficient, and responsive. There are two main types:

**Port Fuel Injection (PFI):**
- Fuel injectors are mounted in the intake manifold, one per cylinder.
- Each injector sprays fuel into the intake port just above the intake valve.
- The fuel mixes with air in the port and enters the cylinder as a pre-mixed charge.

**Gasoline Direct Injection (GDI):**
- Fuel injectors spray fuel directly into the combustion chamber at very high pressure.
- This allows more precise control of the air-fuel mixture and can improve fuel efficiency and power.
- GDI engines can even vary the injection timing and fuel volume within a single combustion cycle.

### The Brain: The Engine Control Unit (ECU)

The **ECU** (Engine Control Unit), also called the **PCM** (Powertrain Control Module), is the onboard computer that controls the fuel injection system. It is the brain that makes sure the engine runs efficiently under all conditions.

The ECU receives real-time data from dozens of **sensors** placed throughout the engine and exhaust system:

- **Mass airflow sensor (MAF)** — Measures how much air is entering the engine
- **Throttle position sensor (TPS)** — Tells the ECU how far the accelerator pedal is pressed
- **Oxygen sensors (O2)** — Measure the oxygen content in the exhaust to determine if the air-fuel mixture is rich or lean
- **Coolant temperature sensor** — Adjusts the mixture based on engine temperature (cold engines need richer mixtures)
- **Crankshaft position sensor** — Tells the ECU the engine's RPM and the position of each piston
- **Manifold absolute pressure sensor (MAP)** — Measures intake vacuum/pressure

Using all this data, the ECU calculates the **exact amount of fuel** each injector should spray and the **exact timing** of each spray — multiple times per second. It adjusts continuously as conditions change: accelerating, decelerating, idling, climbing a hill, or cruising on a flat highway.

### The Feedback Loop

The ECU uses a **closed-loop feedback system**. The oxygen sensors in the exhaust tell the ECU whether the last combustion cycle was too rich or too lean. The ECU immediately adjusts the next injection pulse to correct it. This constant cycle of measure-adjust-measure-adjust keeps emissions low and fuel economy high.

When a sensor fails or detects a problem, the ECU stores a **trouble code** and turns on the **check engine light**. A technician (or you, with an OBD-II scanner) can read these codes to diagnose the problem.

{{< drg/tip >}}
If the check engine light comes on, do not panic — but do not ignore it either. A steady light usually means a non-emergency issue like a loose gas cap or a failing sensor. A flashing check engine light means a serious misfire is occurring and you should reduce speed and get the vehicle checked as soon as possible.
{{< /drg/tip >}}

{{< drg/image src="images/ecu-sensor-network.avif" alt="A diagram showing the ECU at the center with lines connecting to various sensors around the engine: MAF sensor, throttle position sensor, O2 sensors, coolant temperature sensor, and fuel injectors" >}}

{{< drg/video title="How a Car Fuel Injection System Works" url="https://youtu.be/DI4Oci7U2lA?si=gXVRcMg3qzrhN7g9" >}}

{{< drg/external-link title="How Stuff Works — Fuel Injection" url="https://auto.howstuffworks.com/fuel-injection.htm" description="An accessible explanation of fuel injection systems with diagrams and animations." >}}

{{< drg/next-page text="You now understand how air and fuel work together and how the engine computer controls it all." teaser="Time to explore the ignition and electrical systems that bring the engine to life." url="/merit-badges/automotive-maintenance/guide/req8a/" >}}
