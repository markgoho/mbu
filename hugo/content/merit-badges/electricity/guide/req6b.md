---
title: "Req 6b — Calculating Current Draw"
layout: guide
group_title: "Circuit Protection"
req_number: "6b"
prev: "/merit-badges/electricity/guide/req6a/"
prev_title: "Req 6a — Circuit Overloading"
next: "/merit-badges/electricity/guide/req6c/"
next_title: "Req 6c — Fuses & Circuit Breakers"
---

{{< drg/requirement number="6b" >}}
Determine if there is an overload on a branch circuit by either getting the current draw from all the equipment plugged into the circuit or use the power equation to calculate the current draws.
{{< /drg/requirement >}}

Knowing that overloading is dangerous is one thing. Being able to prove whether a specific circuit in your home is overloaded — with actual numbers — is where real understanding begins. This requirement teaches you two practical methods.

## Method 1: Read the Labels

Every electrical device has a label, plate, or stamp that tells you how much power it draws. This information is usually on the bottom of the device, on the back, or near the power cord. Look for:

- **Amps (A)** — Some devices list current draw directly (e.g., "5A" or "12.5A")
- **Watts (W)** — Other devices list power consumption (e.g., "1500W")

To determine if a circuit is overloaded, add up the current draw (in amps) of everything plugged into that circuit.

### Example: Kitchen Circuit

| Device | Rating |
|---|---|
| Toaster | 7.5 A |
| Coffee maker | 8.3 A |
| Overhead light | 0.5 A |

**Total: 16.3 A** on a 15-amp circuit — that is overloaded. The breaker would trip when both the toaster and coffee maker are running simultaneously.

## Method 2: Use the Power Equation

When a device lists only watts (not amps), you can calculate the current draw using the **power equation**:

**Power = Voltage x Current**

Or rearranged to find current:

**Current (Amps) = Power (Watts) / Voltage (Volts)**

For a standard U.S. outlet, voltage is 120V. So:

**Amps = Watts / 120**

### Example Calculations

| Device | Watts | Calculation | Amps |
|---|---|---|---|
| Space heater | 1,500 W | 1500 / 120 | 12.5 A |
| Hair dryer | 1,875 W | 1875 / 120 | 15.6 A |
| Desktop computer | 300 W | 300 / 120 | 2.5 A |
| Table lamp (LED) | 10 W | 10 / 120 | 0.08 A |
| Window AC unit | 1,200 W | 1200 / 120 | 10.0 A |

{{< drg/tip >}}
You can find the wattage of almost any home device by checking its label, searching for the model number online, or using a plug-in watt meter (like a Kill A Watt meter, available at most hardware stores for about $25). A watt meter plugs into the outlet and your device plugs into the meter — it shows real-time power consumption.
{{< /drg/tip >}}

## Doing the Calculation for Your Home

Here is how to check a specific circuit:

1. **Identify a circuit.** Turn off one breaker at your panel and walk through the house to find every outlet and light that lost power. Write them down.
2. **List everything plugged in.** For each outlet on that circuit, note every device and its wattage or amperage.
3. **Convert to amps if needed.** If a device lists watts, divide by 120 to get amps.
4. **Add up the total.** Sum all the ampere values.
5. **Compare to the breaker rating.** A 15-amp breaker should carry no more than 12 amps (80% rule). A 20-amp breaker should carry no more than 16 amps.

### Sample Circuit Analysis

**Circuit: Bedroom #2 (15-amp breaker)**

| Device | Watts | Amps |
|---|---|---|
| Desk lamp | 60 W | 0.5 A |
| Laptop charger | 65 W | 0.54 A |
| Phone charger | 20 W | 0.17 A |
| Gaming console | 200 W | 1.67 A |
| Monitor | 45 W | 0.38 A |
| **Total** | **390 W** | **3.26 A** |

This circuit is well within the 15-amp limit — only 22% loaded. No risk of overloading.

Now imagine you add a 1,500W space heater to the same circuit: 3.26 + 12.5 = **15.76 A**. That exceeds the 15-amp breaker rating and would cause it to trip.

{{< drg/did-you-know >}}
The 80% rule is not just a guideline — it is part of the National Electrical Code (NEC). Article 210.20 requires that the continuous load on a circuit not exceed 80% of the breaker's rating. This safety margin has prevented countless fires since the NEC was first published in 1897.
{{< /drg/did-you-know >}}

{{< drg/image src="images/power-equation-calculation.avif" alt="The power equation triangle with P at the top, V at the bottom left, and I at the bottom right, with example calculations converting watts to amps" >}}

{{< drg/external-link
    title="OSHA — Electrical Safety Overview"
    url="https://www.osha.gov/electrical"
    description="Occupational Safety and Health Administration resources on electrical safety, including circuit loading and protective devices." >}}

{{< drg/next-page
    text="You can now calculate the current draw on any circuit in your home and determine if it is overloaded."
    teaser="Learn how fuses and circuit breakers actually protect your home — and why one blows while the other trips."
    url="/merit-badges/electricity/guide/req6c/" >}}
