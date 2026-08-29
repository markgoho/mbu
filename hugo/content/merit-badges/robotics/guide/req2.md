---
title: "Robots in Action"
layout: "guide"
group_title: "2. How Robots Work in the World"
req_number: "2"
req_path: "2"
prev: "/merit-badges/robotics/guide/req1/"
prev_title: "Workshop Safety"
next: "/merit-badges/robotics/guide/req3/"
next_title: "Core Robotics Systems"
---

{{< drg/requirement number="2" >}}
Robotics Industry. Discuss the following with your counselor:
{{< /drg/requirement >}}

This requirement gives you the industry tour. You will look at where robots are useful, how different control styles change what a robot can do, and why engineers pick one movement system over another. If Req 1 was about working safely, Req 2 is about learning to see robots as tools built for a specific job.

## Requirement 2a:

{{< drg/inherited-requirement number="2a" req_path="2.a" topic="The kinds of things robots can do and how robots are best used today." />}}

Robots are best at jobs that are **dull, dirty, dangerous, or demand high precision**. A robot does not get bored welding the same seam 2,000 times. It does not mind inspecting shelves all night in a warehouse. It can hold a camera steadier than a human hand during surgery or repeat a pick-and-place motion with tiny differences each time.

That does not mean robots replace people in every situation. Humans are still better at open-ended judgment, creativity, empathy, and adapting to surprises with very little information. The best real-world systems usually mix both: humans set the goal, handle exceptions, and make decisions; robots handle the repeated or risky physical work.

### Good jobs for robots

- **Factory work** such as welding, painting, assembly, and sorting
- **Warehouse work** such as moving totes, scanning inventory, and delivering items
- **Medical support** such as surgical assistance, pharmacy delivery, or rehabilitation devices
- **Exploration** such as Mars rovers, underwater ROVs, and bomb-disposal robots
- **Home and service jobs** such as vacuuming, mowing, or floor cleaning

{{< drg/video
    title="TYPES OF ROBOTS | Robots Classification (video)"
    url="https://youtu.be/fc_Cynqr6jM" >}}

{{< drg/did-you-know >}}
Industrial robots can repeat the same movement with accuracy measured in fractions of a millimeter. That is one reason robots are so valuable for jobs where even tiny mistakes matter.
{{< /drg/did-you-know >}}

## Requirement 2b:

{{< drg/inherited-requirement number="2b" req_path="2.b" topic="The similarities and differences between remote-control vehicles, telerobots, and autonomous robots." />}}

These three systems can look similar from the outside, but they think and act in different ways.

### Remote-control vehicles

A **remote-control vehicle** does exactly what the operator commands right now. If you stop sending commands, it stops or keeps doing its last simple action. A toy RC car is the easy example. It does not understand the world. It just follows live human input.

### Telerobots

A **telerobot** is also controlled by a human, but it is designed to let the human act from a distance in a more capable way. A bomb-disposal robot, surgical robot, or underwater ROV often sends back video, sensor readings, or tool feedback. The robot becomes the operator's “hands” somewhere unsafe or unreachable.

### Autonomous robots

An **autonomous robot** senses its environment and makes at least some decisions on its own. A warehouse robot may detect obstacles and reroute. A rover may slow down when terrain changes. A line-following robot at a competition is a simple autonomous machine because it is using sensor feedback instead of waiting for a driver to steer every move.

### Similarities and differences

All three types may use motors, batteries, controllers, and sensors. The biggest difference is **where the decision-making happens**.

- **Remote control:** human decides almost everything, instantly
- **Telerobot:** human still decides most actions, but the robot extends reach and often adds feedback
- **Autonomous robot:** robot handles some decisions by itself based on programming and sensor data

{{< drg/video
    title="What's The Difference Between Autonomous Robots and Controlled Robots? (video)"
    url="https://youtu.be/kdYJyGQwtL4" >}}

{{< drg/external-link
    title="What Is the Difference Between Autonomous and Teleoperated Robots? (video)"
    url="https://milvus.io/ai-quick-reference/what-is-the-difference-between-autonomous-and-teleoperated-robots"
    description="A short comparison that helps you explain where the human is in the control loop and where the software takes over." >}}

{{< drg/tip >}}
If you need an easy example for your counselor, compare a toy RC car, a bomb squad robot, and a robot vacuum. They all move, but they rely on humans very differently.
{{< /drg/tip >}}

## Requirement 2c:

{{< drg/inherited-requirement number="2c" req_path="2.c" topic="Three different methods robots can use to move themselves other than wheels or tracks. Describe when it would be appropriate to use each method." />}}

Wheels and tracks are common because they are simple and efficient. But some jobs need a different style of motion.

### Legs

Legged robots can step over obstacles, climb uneven terrain, and keep moving when the ground is rough. That makes them useful for stairs, rubble, rocky ground, or spaces where wheels would get stuck. The tradeoff is complexity. Legs need more joints, more control, and usually more energy.

### Propellers or rotors

Flying robots use propellers to lift and steer. A quadcopter can inspect a roof, map a disaster area, or check the top of a tower much faster than a ground robot. The tradeoff is short battery life and greater safety concerns around spinning blades.

### Arms, inchworm motion, or snake-like motion

Some robots do not move by rolling at all. A snake robot can wiggle through pipes or tight gaps. An inchworm-style robot can grip, extend, and pull itself forward. These methods work well in cramped inspection spaces where a normal chassis could not fit.

### When would you choose each?

- **Legs:** rough terrain, stairs, or obstacle-heavy environments
- **Rotors:** aerial inspection, photography, or hard-to-reach high places
- **Snake or inchworm motion:** pipes, narrow passages, or confined search areas

{{< drg/video
    title="The No Wheel, Circular Gear, or Sprocket Robot Race (video)"
    url="https://youtu.be/aVuNcVW-gzE?si=xoginEhjVnWEPiMd" >}}

{{< drg/image src="images/robot-mobility-types.avif" alt="Comparison of a legged robot, quadcopter, and snake robot in the environments they fit best" >}}

By now you should be seeing a pattern: every robot is a set of tradeoffs. In [Req 4b](/merit-badges/robotics/guide/req4b/), that same idea will guide your own design choices.

{{< drg/next-page
    text="You have explored what robots do, how they are controlled, and how they move"
    teaser="Next, learn the five major fields that every capable robot system depends on."
    url="/merit-badges/robotics/guide/req3/" >}}
