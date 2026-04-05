---
title: "Req 4b — Sketch the System"
layout: "guide"
group_title: "Design and Build Your Robot"
req_number: "4b"
req_path: "4.b"
prev: "/merit-badges/robotics/guide/req4a/"
prev_title: "Req 4a — Choose the Mission"
next: "/merit-badges/robotics/guide/req4c/"
next_title: "Req 4c — Build Your Prototype"
---

{{< drg/requirement number="4b" >}}
Design your robot. The robot design should use sensors and programming and have at least 2 degrees of freedom. Document the design in your robot engineering notebook using drawings and a written description.
{{< /drg/requirement >}}

This is the point where your robot stops being an idea and becomes a plan. A strong design shows how the parts connect, what the robot needs to sense, and how it will move in more than one way. That last part matters because **degrees of freedom** means the robot can move through at least two independent motions, not just roll straight ahead.

## Start with the big picture

Your design should answer four questions:

- **What is the frame or structure?**
- **How does it move or act on the world?**
- **What sensor information does it use?**
- **What motions count as its degrees of freedom?**

For a small drive robot with an arm, one degree of freedom might be forward-and-back drive movement, and another might be the arm lifting up and down. For a robotic arm, one degree of freedom might be shoulder rotation and another might be gripper open-and-close.

## What “2 degrees of freedom” means

A degree of freedom is one independent way a system can move. If one motor motion changes and another can still change separately, you probably have multiple degrees of freedom.

Examples:

- **Drive + arm lift**
- **Arm shoulder + elbow joint**
- **Turret rotation + launcher angle**
- **Lift motion + claw open/close**

That does **not** mean you need two fancy arms or a complex humanoid robot. It means your design should do more than one distinct motion in a useful, controllable way.

{{< drg/video
    title="Methods Robots Use to Move (video)"
    url="https://youtu.be/T0JeYyU7R-c?list=PLHGEvyG5wuthXQZzTc-mLwFrP5F6_1Lce" >}}

{{< drg/video
    title="Robotics: Degrees of Freedom (video)"
    url="https://youtu.be/55O-DGeoFic?list=PLHGEvyG5wuthXQZzTc-mLwFrP5F6_1Lce" >}}

## What to draw and describe in your notebook

Your notebook entry should include more than one sketch if needed. A side view, top view, and close-up of a mechanism can be more helpful than one crowded drawing.

Include labels for:

- battery and controller location
- motors or servos
- sensors
- drive system or mechanism
- important dimensions
- where the robot will hold, lift, push, or detect something

Add a short written description under the sketch that explains how the parts work together. Imagine that another Scout had to build your robot from your notes.

{{< drg/checklist title="Design review questions" subtitle="Use these before you start building" >}}
- Stability: Will the robot tip when the arm lifts or the mechanism extends?
- Access: Can I reach the battery, controller, and wiring easily?
- Sensor placement: Can the sensor actually “see” or detect what it needs to detect?
- Simplicity: Am I solving the task with the fewest moving parts that still work?
- Buildability: Do I have the parts and tools to make this design real?
{{< /drg/checklist >}}

{{< drg/tip >}}
If your first sketch looks crowded, that is useful information. It usually means the design is doing too much or needs better spacing. Redrawing is part of engineering, not a sign of failure.
{{< /drg/tip >}}

{{< drg/image src="images/robotics-design-sketch.avif" alt="Robot design sketch showing sensor placement, subsystem layout, and two degrees of freedom" >}}

Your plan is on paper. Next, turn those drawings into real parts and a working prototype.

{{< drg/next-page
    text="You have mapped out your robot's structure, sensors, and motion"
    teaser="Next, build the robot or subsystem and see how the design behaves in the real world."
    url="/merit-badges/robotics/guide/req4c/" >}}
