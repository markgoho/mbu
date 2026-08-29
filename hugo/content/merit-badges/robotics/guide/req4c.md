---
title: "Build Your Prototype"
layout: "guide"
group_title: "4. Design and Build Your Robot"
req_number: "4c"
req_path: "4.c"
prev: "/merit-badges/robotics/guide/req4b/"
prev_title: "Sketch the System"
next: "/merit-badges/robotics/guide/req4d/"
next_title: "Pick Your Programming Path"
---

{{< drg/requirement number="4c" >}}
Build a robot or robotic subsystem of your original design to accomplish the task you chose for requirement 4(a).
{{< /drg/requirement >}}

Building is where your ideas meet reality. Holes do not line up perfectly. Wires end up longer than expected. A mechanism that seemed smooth on paper may bind or wobble in real life. That is normal. The goal is not perfection on the first try. The goal is building a version that works well enough to test and improve.

## Build in stages

Trying to assemble everything at once makes troubleshooting harder. Instead, build in chunks:

1. **Frame or base** — make the structure solid first
2. **Motion system** — wheels, arm, lift, or gripper
3. **Electronics** — controller, motors, power, sensors
4. **Cable management** — secure wires so they cannot snag or drag
5. **Simple power-on checks** — test one subsystem at a time

If you build in stages, you always know what changed last. That makes it easier to find problems.

## Watch for common build problems

**Loose structure** causes wobble and throws off sensor readings. Tighten hardware and brace long pieces when needed.

**Poor wire routing** leads to disconnects, pinched insulation, and moving parts chewing through cables.

**Overcomplicated mechanisms** create more friction and more failure points. If a simple direct drive works, use it.

**Misaligned sensors** are one of the most common hidden problems. A distance sensor pointed slightly upward may miss a target. A line sensor mounted too high may not read the line clearly.

{{< drg/safety-first >}}
Before changing wiring, tightening moving parts, or reaching into the robot, disconnect power. A sudden motor start can pinch fingers or damage the robot.
{{< /drg/safety-first >}}

## Build what the mission requires — not more

A strong merit badge robot is often simpler than a competition robot. That is okay. If your task is to detect an obstacle and stop, you do not need a complicated arm, a camera, and six sensors. Extra parts make debugging harder.

Try to keep every part connected to the mission from Req 4a. If you cannot explain why a part is there, it may not belong in version one.

{{< drg/be-prepared title="The prototype does not work on the first try" >}}
When the robot fails its first test:

- **Stay calm and change one thing at a time.**
- **Check the simple causes first** like battery charge, loose wires, or reversed motor direction.
- **Look back at the notebook** to see whether the build still matches the design.
- **Record what happened** so your next test is smarter than the last one.
{{< /drg/be-prepared >}}

{{< drg/checklist title="Prototype readiness" subtitle="Use this before moving on to programming choices" >}}
- Structure feels solid when you pick up or drive the robot.
- Power system works without loose connections.
- Motors move in the direction you expect.
- Sensors are mounted where they can actually gather useful data.
- The robot can safely perform a simple dry run.
{{< /drg/checklist >}}

{{< drg/image src="images/robotics-prototype-bench.avif" alt="Half-built student robot on a bench showing frame, motors, battery, controller, and wiring" >}}

You now have hardware to work with. Next, choose whether you will show the robot's logic as working code or as a clear flowchart.

{{< drg/next-page
    text="You have turned your design into a real prototype"
    teaser="Next, choose how to document the robot's logic: by writing the code or by mapping the decision flow."
    url="/merit-badges/robotics/guide/req4d/" >}}
