---
title: "Req 3 — Core Robotics Systems"
layout: "guide"
group_title: "The Five Fields of Robotics"
req_number: "3"
req_path: "3"
prev: "/merit-badges/robotics/guide/req2/"
prev_title: "Req 2 — Robots in Action"
next: "/merit-badges/robotics/guide/req4/"
next_title: "Req 4 — From Idea to Finished Robot"
---

{{< drg/requirement number="3" >}}
General Knowledge. Discuss with your counselor three of the five major fields of robotics (human-robot interface, mobility, manipulation, programming, sensors) and their importance to robotics development. Discuss either the three fields as they relate to a single robot system OR talk about each field in general. Find pictures or at least one video to aid your discussion.
{{< /drg/requirement >}}

Imagine a robot delivering medicine in a hospital. It has to move down hallways, detect people, carry a load, follow software instructions, and give humans a way to tell it where to go. That one machine already uses all five major fields of robotics. This requirement helps you understand those fields so you can talk about a robot as a complete system instead of just a pile of parts.

## The five major fields

### Human-robot interface

The **human-robot interface** is how people communicate with the robot and how the robot communicates back. That might be a handheld controller, touchscreen, app, keyboard, indicator lights, voice commands, or a status screen. A great robot is not just mechanically capable. It is also understandable to the human using it.

If the interface is confusing, the robot becomes frustrating or unsafe. Clear buttons, readable feedback, and simple control options matter just as much as hardware.

### Mobility

**Mobility** is how the robot gets around or changes position. Wheels, tracks, legs, propellers, and fixed robotic arms all fit here. Engineers choose a mobility system based on terrain, speed, stability, power use, and the job to be done.

A warehouse robot and a rover on rough ground need very different mobility solutions because they face different environments.

### Manipulation

**Manipulation** means interacting physically with the world. Robotic arms, grippers, claws, suction tools, and lifting mechanisms all count. Some robots do not need much manipulation at all. Others, like factory arms or surgical systems, depend on it.

A robot can move perfectly and still be useless if it cannot grab, carry, sort, or position the object it was built to handle.

### Programming

**Programming** is the logic that tells the robot what to do and when to do it. This includes simple commands, sensor-based decisions, state machines, loops, conditionals, and safety rules. Programming is what turns hardware into behavior.

If mobility is the body, programming is the plan. It makes separate parts work together toward a goal.

### Sensors

**Sensors** are the robot's way of gathering information. Touch sensors, limit switches, encoders, color sensors, ultrasonic distance sensors, cameras, gyros, and temperature sensors all give the robot data about itself or its environment.

Without sensors, a robot is mostly guessing. With sensors, it can react, correct errors, and make smarter choices.

{{< drg/video
    title="5 Sub-Disciplines of Robotics (video)"
    url="https://youtu.be/exEBkd1Gn0I" >}}

## One robot, five fields

A good way to discuss this requirement is to pick one robot and map the five fields onto it. For example, think about a competition robot that picks up game pieces and scores them.

- **Human-robot interface:** driver controls, dashboard, status lights
- **Mobility:** wheels or other drive system
- **Manipulation:** intake, arm, claw, elevator, or launcher
- **Programming:** drive code, autonomous routines, safety limits
- **Sensors:** encoders, gyro, limit switches, camera, or distance sensor

That approach helps you show your counselor that the fields are connected. A weak sensor system makes the programming less useful. A poor interface makes the robot harder to drive. A great manipulator is wasted if the robot cannot get into position.

{{< drg/checklist title="How to prepare for your counselor discussion" subtitle="Choose one of these two paths" >}}
- Pick one robot system: explain how at least three of the five fields appear in that robot.
- Talk about the fields in general: define each one and give a real-world example.
- Bring visuals: a photo, sketch, or video makes your explanation clearer.
- Use plain language: your goal is to show understanding, not to sound complicated.
{{< /drg/checklist >}}

{{< drg/tip >}}
If you are already building a robot for Req 4, use that machine for this discussion. It is easier to explain the five fields when you can point to your own sensor, your own code, and your own mechanism.
{{< /drg/tip >}}

{{< drg/image src="images/five-fields-of-robotics.avif" alt="Illustrated robot diagram connecting interface, mobility, manipulation, programming, and sensors" >}}

Now it is time to stop talking about robotics in general and start planning your own machine.

{{< drg/next-page
    text="You can now explain the major systems that make robots work"
    teaser="Next, choose a realistic task for your own robot and start your engineering notebook."
    url="/merit-badges/robotics/guide/req4a/" >}}
