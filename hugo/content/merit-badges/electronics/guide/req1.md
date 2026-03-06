---
title: "Req 1 — Safety Precautions"
layout: guide
group_title: "Electrical Safety"
req_number: "1"
prev: "/merit-badges/electronics/guide/"
prev_title: "Introduction & Overview"
next: "/merit-badges/electronics/guide/req2/"
next_title: "Req 2 — Reading & Drawing Schematics"
---

{{< drg/requirement number="1" >}}
Describe the safety precautions you must exercise when using, building, altering, or repairing electronic devices.
{{< /drg/requirement >}}

A short circuit can destroy a component in a fraction of a second. A soldering iron tip reaches over 600 degrees Fahrenheit. A capacitor can hold a dangerous charge long after a device has been unplugged. Electronics work is rewarding, but it demands respect for the real hazards involved. Understanding these precautions is not just a requirement — it is the foundation that makes everything else in this badge possible.

## Electrical Hazards

### Shock and Electrocution

Electric shock occurs when current flows through your body. The severity depends on the amount of current, the path it takes, and how long the exposure lasts. As little as 10 milliamps (0.01 amps) can cause painful muscle contractions. At 100 milliamps, the current can stop your heart.

- **Never work on a live circuit.** Always unplug devices or disconnect power before opening them up.
- **Capacitors store charge.** Large capacitors in televisions, monitors, and power supplies can hold a lethal charge for hours or even days after the device is unplugged. Never touch capacitor leads without properly discharging them first.
- **Use one hand when possible.** If current enters one hand and exits the other, it passes through your heart. Working with one hand behind your back (or in your pocket) is an old electrician's trick that reduces this risk.
- **Keep your work area dry.** Water conducts electricity. Wet hands, damp floors, or spilled drinks near your workbench create a direct path for current to flow through your body.

{{< drg/safety-first >}}
Wall outlet voltage (120V AC in the United States) is more than enough to kill. Even low-voltage battery-powered circuits can cause burns or start fires if shorted. Treat every circuit with respect, regardless of the voltage level.
{{< /drg/safety-first >}}

### Burns

Soldering irons operate between 600 and 800 degrees Fahrenheit. Burns are one of the most common injuries in electronics work.

- **Always return the iron to its stand** when you are not actively soldering.
- **Never touch the tip or the metal barrel** of a hot iron.
- **Let solder joints cool** before touching them — freshly soldered connections can cause blistering burns.
- **Wear safety glasses.** Solder can occasionally spit or splatter.

### Fumes and Ventilation

When solder melts, the flux core releases fumes that can irritate your eyes, nose, and lungs. Lead-based solder (still used in many hobby applications) also releases small amounts of lead vapor.

- **Work in a ventilated area.** Open a window, use a fan to push fumes away from your face, or use a fume extractor.
- **Wash your hands** after handling solder, especially lead-based solder. Never eat or drink at your electronics workbench.
- **Consider lead-free solder** — it is slightly harder to work with, but it eliminates lead exposure.

{{< drg/image src="images/electronics-safety-gear.avif" alt="A well-organized electronics workbench showing safety glasses, a soldering iron in its stand, a fume extractor fan, and anti-static wrist strap laid out neatly" >}}

## Component Protection

Electronics safety is not just about protecting yourself — it is also about protecting the components you are working with.

### Electrostatic Discharge (ESD)

Static electricity that you barely feel — the kind that shocks you when you touch a doorknob — carries thousands of volts. That tiny spark can permanently destroy sensitive components like integrated circuits and transistors.

- **Use an anti-static wrist strap** connected to a grounded surface when handling sensitive components.
- **Touch a grounded metal object** before reaching into a bag of components.
- **Store sensitive parts** in anti-static bags (the gray or pink bags components come in).
- **Avoid working on carpet** — shuffling your feet on carpet generates significant static charge.

{{< drg/did-you-know >}}
A static shock you can feel is at least 3,000 volts. Some integrated circuits can be destroyed by as little as 100 volts of static discharge — a charge so small you would never notice it. ESD damage is one of the leading causes of premature electronic failures.
{{< /drg/did-you-know >}}

### Heat Damage

Excessive heat from a soldering iron can destroy components before you even finish assembling your circuit. You will learn specific techniques for preventing heat damage in [Req 3b](/merit-badges/electronics/guide/req3/), but the general rule is simple: get the solder joint done quickly and move on.

### Polarity and Voltage

Many components are **polarized** — they must be installed in the correct direction. Inserting an LED, electrolytic capacitor, or diode backwards can destroy it instantly or cause it to fail later.

- **Check polarity markings** before inserting components. Look for flat edges on LEDs, stripe markings on diodes, and plus/minus markings on capacitors.
- **Double-check voltage ratings.** Applying too much voltage to a component rated for a lower value will damage or destroy it.

## Workspace Safety

{{< drg/checklist title="Safe Electronics Workspace" subtitle="Set up your workbench for safe, productive work" >}}
- Well-lit work surface: Good lighting prevents mistakes and eye strain.
- Ventilation: A small fan or fume extractor positioned to carry fumes away from your face.
- Heat-resistant surface: A silicone soldering mat or ceramic tile protects your table.
- Organized tools: Each tool has a designated spot so you never reach blindly.
- Clear of clutter: Stray wires, loose components, and drinks do not belong near active circuits.
- Fire extinguisher nearby: A Class C extinguisher (rated for electrical fires) should be within reach.
- First-aid kit: Burns are the most common electronics injury — have burn gel and bandages ready.
{{< /drg/checklist >}}

{{< drg/be-prepared title="What If Something Goes Wrong?" >}}
Even with precautions, accidents can happen. Know what to do:

- **Electrical shock:** Do NOT touch the person if they are still in contact with the electrical source. Disconnect the power first, or use a non-conductive object (wooden broom handle, dry towel) to separate them from the source. Call 911 immediately.
- **Burn from soldering iron:** Run cool (not cold) water over the burn for at least 10 minutes. Do not apply ice or butter. Cover with a sterile bandage. Seek medical attention for severe burns.
- **Electrical fire:** Use a Class C fire extinguisher. Never use water on an electrical fire — water conducts electricity and can make the fire worse or shock you.
- **Fume inhalation:** Move to fresh air immediately. If symptoms like dizziness, headache, or difficulty breathing persist, seek medical attention.
{{< /drg/be-prepared >}}

{{< drg/image src="images/esd-wrist-strap-use.avif" alt="Close-up of hands wearing an anti-static wrist strap clipped to a grounded workbench while handling a circuit board" >}}

{{< drg/external-link
    title="OSHA Electrical Safety Guidelines"
    url="https://www.osha.gov/electrical"
    description="Federal workplace safety standards for working with electrical equipment — helpful reference for setting up a safe workspace." >}}

{{< drg/next-page
    text="Now that you know how to stay safe"
    teaser="learn to read and draw the schematic diagrams that are the blueprint of every circuit."
    url="/merit-badges/electronics/guide/req2/" >}}
