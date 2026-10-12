---
title: "Merit Badges"
outputs: ["html"]
cascade:
  - target:
      path: /merit-badges/*
      kind: section
    layout: badge-landing
    outputs: ["html", "markdown"]
  - target:
      path: /merit-badges/*/requirements
    outputs: ["html", "markdown"]
  - target:
      path: /merit-badges/*/guide
      kind: section
    outputs: ["html", "markdown"]
  - target:
      path: "/merit-badges/*/guide/{req*,extended-learning}"
    outputs: ["html", "markdown"]
  - outputs: ["html"]
---

Explore all the merit badges available in Scouting America. Each badge represents an opportunity to learn new skills, explore interests, and earn recognition for your achievements.
