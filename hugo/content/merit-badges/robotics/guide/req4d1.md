---
title: "Write the Code"
layout: "guide"
group_title: "4. Design and Build Your Robot"
req_number: "4d1"
req_path: "4.d.1"
prev: "/merit-badges/robotics/guide/req4d/"
prev_title: "Pick Your Programming Path"
next: "/merit-badges/robotics/guide/req4d2/"
next_title: "Map the Logic"
---

{{< drg/requirement number="4d1" >}}
Program your robot to perform the task you chose for your robot in 4(a). Include a sample of your program's source code in your robot engineering notebook.
{{< /drg/requirement >}}

This option is about turning your design into behavior. Your code does not have to be huge. It does have to be understandable. When your counselor looks at it, they should be able to see how the program helps the robot sense, decide, and act.

## Focus on the core loop

Most robot programs follow the same pattern:

1. Read inputs from sensors or controls
2. Decide what should happen next
3. Command motors or mechanisms
4. Repeat or move to the next step

If your code can do those jobs clearly, it is doing real robotics work.

### What your program should show

A good merit badge program usually includes some combination of:

- starting conditions
- movement commands
- sensor checks
- if/then decisions
- stop conditions or safety limits
- comments or labels that explain key sections

For example, a simple robot might drive forward until a distance sensor sees an obstacle, then stop and raise an arm. Another robot might follow a line until a color sensor detects a finish marker.

{{< drg/external-link
    title="VEXcode VR (website)"
    url="https://www.vexrobotics.com/vexcode/vr?srsltid=AfmBOopvcCE5uFUVB__bxV0UiLP20ZZQwq0WrNHHJWuIQUDXmLAwl8UL%5C"
    description="A browser-based environment for practicing robot logic with sensors, movement, and block or text programming." >}}

<!-- Official resource URL as provided upstream: https://www.vexrobotics.com/vexcode/vr?srsltid=AfmBOopvcCE5uFUVB__bxV0UiLP20ZZQwq0WrNHHJWuIQUDXmLAwl8UL\" -->

{{< drg/tip >}}
VEXcode VR is useful even if your own robot uses different hardware, because it lets you practice sensor-based logic in a simple virtual environment.
{{< /drg/tip >}}

## What to include in your notebook

Your notebook should contain a **sample of the source code**, not just a sentence saying you coded it. Include the part that best shows the robot's logic. That might be:

- the whole short program, if it fits clearly on the page
- the main loop
- the function that reacts to sensor input
- an autonomous routine

You can also add brief notes such as:

- what each sensor does
- what counts as a trigger
- why you chose a threshold value
- what bug you had to fix

{{< drg/checklist title="Code sample checklist" subtitle="Before you show it to your counselor" >}}
- Sensor input is visible somewhere in the code.
- Motor or mechanism output is visible somewhere in the code.
- The task from Req 4a is clearly connected to the logic.
- Variable names or comments make the sample readable.
- The sample matches what the real robot actually does.
{{< /drg/checklist >}}

{{< drg/tip >}}
If the full program is messy, paste in the most important section and label it. A shorter, well-explained code sample is more useful than six pages of code with no explanation.
{{< /drg/tip >}}

In [Req 4e](/merit-badges/robotics/guide/req4e/), you will test and improve the robot. Save version notes now so you can later explain what changed and why.

{{< drg/next-page
    text="You have turned your design into working logic"
    teaser="Next, compare that coding path to the visual planning path: flowcharts."
    url="/merit-badges/robotics/guide/req4d2/" >}}
