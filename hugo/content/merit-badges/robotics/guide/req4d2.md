---
title: "Map the Logic"
layout: "guide"
group_title: "4. Design and Build Your Robot"
req_number: "4d2"
req_path: "4.d.2"
prev: "/merit-badges/robotics/guide/req4d1/"
prev_title: "Write the Code"
next: "/merit-badges/robotics/guide/req4e/"
next_title: "Test, Record, Improve"
---

{{< drg/requirement number="4d2" >}}
Prepare a flowchart of the desired steps to program your robot for accomplishing the task in 4(a). Include procedures that show activities based on sensor inputs. Place this in your robot engineering notebook.
{{< /drg/requirement >}}

A flowchart is a picture of your robot's thinking. It helps you show the order of actions, the decision points, and what happens when the sensor sees one thing instead of another. This option is great because it proves you understand the logic even if you are not presenting full code.

## What a strong robotics flowchart includes

A useful flowchart does more than show a straight line from start to finish. It should include:

- a **start** point
- one or more **actions** such as drive forward, lift arm, or stop motor
- one or more **decision diamonds** based on sensor input
- arrows showing what happens for **yes/no** or **true/false** results
- a clear **end** or repeat loop

For example, your chart might say:

- Start
- Drive forward
- Read distance sensor
- **Obstacle detected?**
  - Yes → stop → raise arm → end
  - No → keep driving → check again

That is real robotic logic because the next step depends on input from the world.

{{< drg/video
    title="General Guide to Creating Flowcharts (video)"
    url="https://youtu.be/SWRDqTx8d4k" >}}

{{< drg/video
    title="Flowchart Tutorial for Beginners (video)"
    url="https://youtu.be/c8asK8iCaRk" >}}

## Use standard shapes clearly

You do not need advanced diagram software. Pencil and paper is fine if it is neat. What matters is that the symbols make sense.

- **Oval:** start or end
- **Rectangle:** an action or process
- **Diamond:** a decision
- **Arrow:** direction of flow

If you use those shapes consistently, your counselor can follow your robot's plan quickly.

{{< drg/checklist title="Flowchart quality check" subtitle="Make sure your logic is easy to follow" >}}
- The mission from Req 4a is obvious from the chart.
- Sensor inputs appear in decision points, not just in a note on the side.
- Every decision has a clear outcome path.
- The chart does not skip major actions.
- Someone else could use the chart to write code later.
{{< /drg/checklist >}}

{{< drg/tip >}}
Read your flowchart out loud as if you are the robot. If you get stuck, repeat a step by accident, or cannot tell what happens next, the chart needs revision.
{{< /drg/tip >}}

{{< drg/image src="images/robotics-flowchart-example.avif" alt="Flowchart showing a simple sensor-based robot program with action and decision branches" >}}

Whether you chose code or a flowchart, the next step is the same: test the robot, record the results, and learn from what happened.

{{< drg/next-page
    text="You can now explain your robot's decision logic visually"
    teaser="Next, test the build, record the results, and decide what you would improve."
    url="/merit-badges/robotics/guide/req4e/" >}}
