---
title: "Threats & Vulnerabilities"
layout: guide
group_title: "4. Threats & Attacks"
req_number: "4a"
prev: "/merit-badges/cybersecurity/guide/req3b/"
prev_title: "The CIA Triad"
next: "/merit-badges/cybersecurity/guide/req4b/"
next_title: "Malware"
---

{{< drg/requirement number="4a" >}}
Define the terms vulnerability, threat, and exploit, and give an example of each that might apply to a website or software product you use.
{{< /drg/requirement >}}

These three words — vulnerability, threat, and exploit — are the building blocks of cybersecurity language. Every attack, every defense, every news story about a breach comes back to these concepts. Understanding how they fit together is like learning the basic vocabulary of a new language.

## Vulnerability

A **vulnerability** is a weakness or flaw in a system that *could* be used to cause harm. It is a door left unlocked, a window with a broken latch, a gap in the fence. The vulnerability exists whether or not anyone takes advantage of it.

**Examples:**
- A website that does not require strong passwords (allowing passwords like "123456")
- Software that has not been updated and contains a known bug
- A Wi-Fi network that uses outdated encryption
- An app that stores passwords in plain text instead of encrypting them

Think of a vulnerability like a crack in a dam. The crack may sit there for years without causing a flood — but it is always a risk.

## Threat

A **threat** is anything that could exploit a vulnerability to cause damage. Threats can be people (hackers, disgruntled employees), software (malware, ransomware), or events (natural disasters that knock out data centers). A threat is the potential for harm — the person who might notice that unlocked door.

**Examples:**
- A hacker scanning websites for known vulnerabilities
- A phishing email designed to trick you into revealing your password
- A disgruntled employee who still has access to company systems after being fired
- A power outage that crashes servers without proper backup

{{< drg/tip >}}
Not all threats are malicious. An employee who accidentally deletes an important database is a threat to availability, even though they had no bad intent. Natural disasters, hardware failures, and human error are all threats that cybersecurity must account for.
{{< /drg/tip >}}

## Exploit

An **exploit** is the actual method or action used to take advantage of a vulnerability. It is the moment the unlocked door gets opened. An exploit turns a theoretical risk into a real attack.

**Examples:**
- A piece of code that takes advantage of a software bug to gain unauthorized access
- Using a stolen password (the vulnerability was weak password requirements) to log into someone's account
- Sending a specially crafted message to a website's login form that tricks it into revealing database contents (called a **SQL injection**)
- Using a known Wi-Fi vulnerability to intercept someone's data on a public network

## How They Fit Together

The relationship is sequential:

1. A **vulnerability** exists (a flaw or weakness)
2. A **threat** recognizes the vulnerability (someone or something that could cause harm)
3. An **exploit** takes advantage of it (the actual attack)

Here is a concrete example using a website you might use:

| Concept | Social Media Example |
|---------|---------------------|
| **Vulnerability** | The site allows unlimited login attempts with no lockout |
| **Threat** | An attacker with a list of common passwords |
| **Exploit** | The attacker runs an automated program that tries thousands of passwords against your account until one works (called a **brute force attack**) |

And another example:

| Concept | Gaming Platform Example |
|---------|------------------------|
| **Vulnerability** | The game's chat system does not filter links |
| **Threat** | A scammer who creates fake "free V-Bucks" websites |
| **Exploit** | The scammer posts links in game chat; players who click enter their login credentials on a fake site, giving the scammer their accounts |

{{< drg/did-you-know >}}
There is a market for undiscovered vulnerabilities. A "zero-day" vulnerability — one that the software maker does not know about yet — can sell for hundreds of thousands of dollars on the black market. Governments and criminal organizations pay top dollar for these because they can be exploited before any patch exists.
{{< /drg/did-you-know >}}

## Applying This to Your Life

For your counselor, think about a website or app you actually use. Walk through the three concepts:

1. What vulnerability might it have?
2. What threat could take advantage of it?
3. What would the exploit look like in practice?

You do not need to find a real vulnerability — this is a thought exercise about understanding the concepts.

{{< drg/external-link
    title="Hackers & Cyber Attacks — Crash Course Computer Science"
    url="https://www.youtube.com/watch?v=_GzE99AmAQU&list=PL8dPuuaLjXtNlUrzyH5r6jN9ulIgZBpdo&index=33"
    description="A fast-paced, entertaining overview of how cyber attacks work from the Crash Course team." >}}

{{< drg/image src="images/vulnerability-threat-exploit-chain.avif" alt="Three-step attack chain diagram: Vulnerability (cracked wall), Threat (figure noticing the crack), Exploit (figure reaching through)" >}}

{{< drg/next-page
    text="You know the vocabulary of cyber threats"
    teaser="now dive into one of the most common types — malware."
    url="/merit-badges/cybersecurity/guide/req4b/" >}}
