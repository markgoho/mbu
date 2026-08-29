---
title: "First Language Project"
layout: "guide"
group_title: "5. Building Programs"
req_number: "5a"
req_path: "5.a"
prev: "/merit-badges/programming/guide/req5/"
prev_title: "Choosing Your Three Projects"
next: "/merit-badges/programming/guide/req5b/"
next_title: "Second Language Project"
---

{{< drg/requirement number="5a" >}}
In the first language and environment, write or modify a program, debug and demonstrate, and explain as above.
{{< /drg/requirement >}}

Your first project is where you build the pattern you will repeat for the rest of this badge: plan a small program, make it work, debug it, and explain it clearly. This is a great place to choose a language that feels readable and an environment that gives you quick feedback.

## What your first project should do

The requirement gives you a clear target. Your program must:

- take **input**
- make **computations**
- use **decisions** based on the input
- produce **output**

That means a program that only prints "Hello, world" is too simple. A stronger first project might:

- ask for a user's age and decide which ticket price applies
- ask for test scores and calculate an average
- ask for camping gear counts and warn if a required item is missing
- ask for weather conditions and suggest an activity based on rules you choose

## Build small on purpose

Many beginners try to impress people with a huge idea. That usually leads to confusion, unfinished features, and bugs you cannot explain. A better plan is to build a small program with logic you understand completely.

{{< drg/checklist title="A good first project" subtitle="Use this to test whether your idea fits the badge" >}}
- The input is clear and easy to demonstrate.
- The program has at least one meaningful calculation.
- The program uses decision logic such as if/else or match/case.
- The output clearly changes based on what the user entered.
- You can explain each major part without guessing.
{{< /drg/checklist >}}

## Debugging is part of the requirement

A bug is simply a mistake in the program's behavior. You are expected to find and fix problems. That is not a side task — it is part of how programming works.

Common first-project bugs include:

- forgetting to convert text input into a number
- checking the wrong condition in an if statement
- using the wrong variable name
- outputting a result before the calculation is finished

{{< drg/tip >}}
When your program misbehaves, change one thing at a time. Test again after each change. That makes it much easier to see what fixed the problem.
{{< /drg/tip >}}

## How to explain your program to your counselor

When you demonstrate the project, walk through it in a simple order:

1. **Input** — What does the user enter?
2. **Processing** — What calculations happen?
3. **Decision making** — What rules decide what happens next?
4. **Output** — What result does the user see?

If you can tell that story clearly, you are not just showing code. You are showing understanding.

{{< drg/external-link
    title="MDN Web Docs — Learn programming"
    url="https://developer.mozilla.org/en-US/docs/Learn"
    description="MDN offers clear beginner lessons on programming logic, debugging, and building small projects you can actually explain." >}}

{{< drg/be-prepared title="Your program works only for one test case" >}}
That is a warning sign that your logic may be too narrow.

- **Try new inputs**: Test normal, unusual, and edge-case values.
- **Watch the branches**: Make sure each decision path actually runs when it should.
- **Check your math**: A correct formula with the wrong variable still gives the wrong answer.
- **Retest after each fix**: Do not pile multiple changes together if you can help it.
{{< /drg/be-prepared >}}

{{< drg/image src="images/simple-program-flow.avif" alt="A flowchart showing user input leading to calculation, decision branch, and final output on screen" >}}

Once you finish this first project, you will have a model to reuse. The next two projects should show what stays the same across languages — and what changes.

{{< drg/next-page
    text="You have a roadmap for building and explaining your first program."
    teaser="Next, create a second project in a different language or environment and compare the experience."
    url="/merit-badges/programming/guide/req5b/" >}}
