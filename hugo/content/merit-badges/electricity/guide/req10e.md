---
title: "Req 10e — How a 3-Way Switch Works"
layout: guide
group_title: "Hands-On Projects"
req_number: "10e"
prev: "/merit-badges/electricity/guide/req10d/"
prev_title: "Req 10d — Single-Pole, Double-Throw Switch"
next: "/merit-badges/electricity/guide/req10f/"
next_title: "Req 10f — Series vs. Parallel Circuits"
---

{{< drg/requirement number="10e" >}}
Explain how 3-way switch wiring works in a lighting circuit.
{{< /drg/requirement >}}

A 3-way lighting circuit lets **two different switches control one light**. That is useful in places like hallways, staircases, and large rooms with more than one entrance.

## The Core Idea

A 3-way lighting setup uses two special switches. Each switch can connect its common terminal to one of two traveler wires. Depending on how both switches are positioned, the circuit to the light is either complete or broken.

That means either switch can change the state of the light. If the light is on, flipping either switch turns it off. If the light is off, flipping either switch turns it on.

## Why It Works

A normal single-pole switch has only one path to open or close. A 3-way system uses two switching points and two traveler wires between them. The traveler wires act like alternate routes.

- If both switches connect through the same traveler path, the circuit is complete and the light turns on.
- If they connect through different paths, the circuit is broken and the light stays off.

This is really an application of SPDT switching logic from [Req 10d — Single-Pole, Double-Throw Switch](/merit-badges/electricity/guide/req10d/), just arranged so two switches work together.

{{< drg/image src="images/three-way-switch-traveler-paths.avif" alt="Two 3-way switches with traveler wires showing the light on when the path matches and off when the path is broken" >}}

{{< drg/checklist title="Best way to explain 3-way switching" subtitle="Focus on path completion, not memorizing wire colors" >}}

- **One light, two switches** is the goal.
- **Two traveler wires** connect the switches.
- **Each switch chooses a path** for the current.
- **Matching path = light on** in a simple explanation model.
- **Changing either switch** changes whether the circuit is complete.
  {{< /drg/checklist >}}

{{< drg/tip >}}
Your counselor usually wants you to explain the logic, not become an electrician in one afternoon. If you can describe how the switches route current through traveler paths to complete or break the circuit, you have the important idea.
{{< /drg/tip >}}

{{< drg/safety-first >}}
Do not experiment on actual household 3-way switch wiring unless a qualified adult and your counselor specifically approve a safe setup. Studying diagrams and low-voltage models is the safer way to learn the concept.
{{< /drg/safety-first >}}

{{< drg/external-link
    title="HowStuffWorks — How 3-Way Switches Work"
    url="https://home.howstuffworks.com/three-way.htm"
    description="A visual explanation of how two switches can control one light using traveler wires and alternate paths." >}}

{{< drg/next-page
    text="You can now explain the logic that allows two switches to control one light in a real home."
    teaser="Next, compare series and parallel circuits by building both and seeing how the lights behave differently."
    url="/merit-badges/electricity/guide/req10f/" >}}
