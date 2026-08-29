---
title: "Control, Logic & Analog"
layout: guide
group_title: "4. Circuits & Digital Logic"
req_number: "4a"
prev: "/merit-badges/electronics/guide/req3/"
prev_title: "Soldering Techniques"
next: "/merit-badges/electronics/guide/req4b/"
next_title: "Binary & Decimal Conversion"
---

{{< drg/requirement number="4a" >}}
Discuss each of the following with your counselor:
{{< /drg/requirement >}}

This requirement asks you to understand and discuss three topics:

- **4a1** — How to use electronics for a control purpose.
- **4a2** — The basic principles of digital logic.
- **4a3** — How to use electronics for three different analog applications.

These three topics represent the major ways electronic circuits interact with the real world. Control circuits make decisions and take action. Digital logic processes information in the language of ones and zeros. Analog circuits handle the continuously varying signals that come from the physical world around us.

## 4a1 — Electronics for Control

A **control circuit** uses electronic components to monitor a condition and respond automatically. Instead of a person flipping a switch, the circuit itself decides when to act.

### The Control Loop

Every electronic control system follows the same basic pattern:

1. **Sense** — A sensor measures something in the environment (temperature, light, motion, moisture).
2. **Decide** — A controller (which could be as simple as a single transistor or as complex as a microprocessor) compares the sensor reading to a target value.
3. **Act** — An output device (motor, heater, buzzer, LED, relay) responds based on the controller's decision.

### Real-World Examples

**Thermostat** — A temperature sensor reads the room temperature. If it drops below your set point, the controller activates the furnace. When the temperature reaches the target, the controller shuts the furnace off. This is a classic **feedback loop** — the output (heat) changes the input (temperature), which changes the output, and so on.

**Motion-activated light** — A passive infrared (PIR) sensor detects body heat moving through its field of view. The sensor sends a signal to a transistor or relay that switches on the light. After a set time with no motion detected, the circuit turns the light off.

**Automatic irrigation system** — A moisture sensor in the soil measures how dry the ground is. When moisture drops below a threshold, a microcontroller opens a solenoid valve to water the plants. When the soil is moist enough, the valve closes.

{{< drg/did-you-know >}}
The cruise control in a car is an electronic control system. A speed sensor on the transmission feeds data to a microcontroller that adjusts the throttle to maintain your set speed. When the car goes uphill and starts to slow down, the controller opens the throttle more. When it goes downhill and speeds up, the controller backs off. All of this happens dozens of times per second.
{{< /drg/did-you-know >}}

### Try It Yourself

For your counselor discussion, think of a control application you have seen or used. Describe the sensor, the controller, and the output device. Can you identify the feedback loop?

## 4a2 — Basic Principles of Digital Logic

Digital electronics operate on a simple idea: everything is either **on** or **off**, represented by the numbers **1** and **0**. These two states are called **binary** — and from just these two values, digital circuits can perform any computation, store any data, and control any process.

### Logic Gates — The Building Blocks

Digital circuits are built from **logic gates** — tiny circuits that take one or two binary inputs and produce one binary output based on simple rules. There are a few fundamental gates:

**AND gate** — Output is 1 only when ALL inputs are 1. Think of it as two switches in series: both must be closed for current to flow.

| Input A | Input B | Output |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 0 |
| 1 | 0 | 0 |
| 1 | 1 | 1 |

**OR gate** — Output is 1 when ANY input is 1. Think of two switches in parallel: either one lets current through.

| Input A | Input B | Output |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 1 |

**NOT gate (Inverter)** — Flips the input. 1 becomes 0, and 0 becomes 1. It has only one input.

| Input | Output |
|---|---|
| 0 | 1 |
| 1 | 0 |

### Combining Gates

By combining these three basic gates, engineers build everything from simple alarm circuits to entire processors. A **NAND gate** (NOT + AND) and a **NOR gate** (NOT + OR) are especially important because each one alone can be used to build any other type of gate — making them "universal gates."

{{< drg/image src="images/logic-gates-symbols.avif" alt="Reference chart showing standard symbols for AND, OR, NOT, NAND, NOR, and XOR logic gates" >}}

### From Gates to Computers

A processor is nothing more than billions of logic gates connected in carefully designed patterns. An **adder circuit** — which adds two binary numbers — can be built from just AND, OR, and XOR gates. Stack enough adders together, add some memory (which is made from gates too), and you have the core of a computer.

{{< drg/tip >}}
When discussing digital logic with your counselor, use real-world analogies. An AND gate is like a safety interlock: a microwave oven will only run if the door is closed AND the start button is pressed. Both conditions must be true.
{{< /drg/tip >}}

## 4a3 — Analog Applications

While digital circuits deal in 1s and 0s, **analog circuits** handle signals that vary continuously — like sound waves, temperature readings, and light intensity. The physical world is analog, and analog electronics are how we interface with it.

### Three Analog Applications to Discuss

Here are several analog applications you can choose from when speaking with your counselor. Pick three that interest you and be ready to explain how each one works.

**Audio amplification** — A microphone converts sound waves into a tiny electrical signal. An amplifier circuit boosts that weak signal strong enough to drive a speaker. The amplified signal is a faithful copy of the original sound wave — just larger. Guitar amps, PA systems, and hearing aids all use this principle.

**Radio transmission and reception** — A radio transmitter creates a high-frequency carrier wave and modulates (varies) it to carry audio information. AM radio varies the amplitude (height) of the wave. FM radio varies the frequency (speed) of the wave. A receiver picks up the signal with an antenna, separates the audio from the carrier, and sends it to a speaker.

**Sensor measurement** — A thermistor (temperature-sensitive resistor) changes its resistance as temperature changes. An analog circuit converts that resistance change into a proportional voltage, which can be read by a meter or displayed on a gauge. Medical thermometers, weather stations, and automotive coolant gauges use this approach.

**Voltage regulation** — A voltage regulator takes an unsteady input voltage and produces a stable, constant output voltage. Your phone charger takes 120V AC from the wall and converts it to a steady 5V DC that your phone needs. Without regulation, voltage fluctuations would damage sensitive components.

**Light dimming** — A dimmer switch uses an analog circuit (typically a triac or potentiometer) to control how much power reaches a light bulb. Turning the knob smoothly varies the brightness from full on to completely off — a continuous range, not just on/off.

{{< drg/external-link
    title="All About Circuits — Tutorials"
    url="https://www.allaboutcircuits.com/textbook/"
    description="Free, comprehensive online textbook covering analog and digital electronics from fundamentals to advanced topics." >}}

{{< drg/next-page
    text="Digital logic speaks in binary"
    teaser="learn how to convert between decimal and binary number systems."
    url="/merit-badges/electronics/guide/req4b/" >}}
