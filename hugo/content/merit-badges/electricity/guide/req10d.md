---
title: "Req 10d — Single-Pole, Double-Throw Switch"
layout: guide
group_title: "Hands-On Projects"
req_number: "10d"
prev: "/merit-badges/electricity/guide/req10c/"
prev_title: "Req 10c — Build a Rheostat"
next: "/merit-badges/electricity/guide/req10e/"
next_title: "Req 10e — How a 3-Way Switch Works"
---

{{< drg/requirement number="10d" >}}
Build a single-pole, double-throw switch. Show that it works.
{{< /drg/requirement >}}

A **single-pole, double-throw (SPDT)** switch has one input connection and two possible output connections. Instead of simply opening and closing a circuit, it chooses which of two paths the current will take.

## What the Name Means

- **Single-pole:** one common input path.
- **Double-throw:** two possible output paths.

You can think of it like a railroad switch. One track comes in, but the switch sends the train onto one of two routes.

## How to Demonstrate It

An easy way to show an SPDT switch working is to connect one battery source to the common terminal and two different loads to the two output terminals. When you flip the switch one way, load A works. Flip it the other way, and load B works.

That makes the switching action visible right away.

{{< drg/image src="images/spdt-switch-two-load-paths.avif" alt="SPDT switch routing current from one common terminal to one of two different light loads" >}}

{{< drg/checklist title="SPDT demonstration idea" subtitle="Keep the routing obvious" >}}

- **Connect the battery** to the common side.
- **Connect one load** to throw A.
- **Connect another load** to throw B.
- **Flip the switch** to show current reaching only one load at a time.
- **Explain which connection is common** and which two are the alternate paths.
  {{< /drg/checklist >}}

SPDT logic helps you understand more advanced switching ideas, including the 3-way lighting concept in [Req 10e — How a 3-Way Switch Works](/merit-badges/electricity/guide/req10e/).

{{< drg/tip >}}
If you use two small lights of the same type, the result is easy to see: one switch position lights bulb A, and the other lights bulb B.
{{< /drg/tip >}}

{{< drg/video
    title="SPDT switch | Home-made robots | Electrical engineering | Khan Academy — Khan Academy - Projects"
    url="https://www.youtube.com/watch?v=1_OieLuWGyw" >}}

{{< drg/safety-first >}}
Use only low-voltage project parts. Make sure no bare conductors can easily touch and create an accidental short between the two output paths.
{{< /drg/safety-first >}}

{{< drg/next-page
    text="You now understand how a switch can choose between two different circuit paths instead of simply turning one path on and off."
    teaser="Next, apply that logic to the real-home question of how two switches can control one light."
    url="/merit-badges/electricity/guide/req10e/" >}}
