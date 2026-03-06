---
title: "Req 3b — The CIA Triad"
layout: guide
group_title: "Cybersecurity Fundamentals"
req_number: "3b"
prev: "/merit-badges/cybersecurity/guide/req3a/"
prev_title: "Req 3a — Systems to Protect"
next: "/merit-badges/cybersecurity/guide/req4a/"
next_title: "Req 4a — Threats & Vulnerabilities"
---

{{< drg/requirement number="3b" >}}
Explain the "C.I.A. Triad"—Confidentiality, Integrity, and Availability—and why these three principles are fundamental to cybersecurity.
{{< /drg/requirement >}}

Every cybersecurity decision — every firewall rule, every password policy, every encryption algorithm — traces back to three principles. They are so central to the field that professionals call them the **CIA Triad** (no relation to the government agency). If you understand these three concepts, you have the foundation for understanding everything else in cybersecurity.

## Confidentiality

**Confidentiality** means that information is accessible only to the people who are authorized to see it. Your text messages should be readable only by you and the person you sent them to. Your medical records should be accessible only to you and your doctor. Your password should be known only to you.

### How confidentiality is maintained:

- **Encryption** scrambles data so only authorized people can read it
- **Access controls** limit who can view certain files or systems
- **Authentication** (passwords, fingerprints, face recognition) verifies that you are who you claim to be
- **Physical security** keeps unauthorized people away from servers and devices

### What happens when confidentiality fails:

When a company suffers a data breach, confidentiality has failed. Names, emails, passwords, credit card numbers — information that was supposed to be private — becomes public. The 2017 Equifax breach exposed the personal data of 147 million people, including Social Security numbers.

## Integrity

**Integrity** means that information is accurate and has not been tampered with. When you send a message, it should arrive exactly as you wrote it. When your bank shows your account balance, that number should be correct. When a hospital looks up your blood type, that record better not have been changed by someone.

### How integrity is maintained:

- **Hashing** creates a unique digital fingerprint of data — if even one character changes, the hash changes completely (you will explore this more in [Req 6c](/merit-badges/cybersecurity/guide/req6c/))
- **Digital signatures** prove that a document came from who it claims to be from and has not been altered
- **Version control** tracks every change to a file, so unauthorized modifications can be detected and reversed
- **Checksums** verify that downloaded files are complete and uncorrupted

### What happens when integrity fails:

Imagine a hacker changes one digit in a wire transfer from $1,000 to $1,000,000. Or modifies a patient's medical record to show a different blood type. Or alters election results in a database. Integrity failures can cause financial loss, physical harm, or loss of trust in institutions.

{{< drg/did-you-know >}}
The Stuxnet worm, discovered in 2010, attacked the integrity of uranium enrichment centrifuges in Iran. It did not steal data or crash systems — instead, it subtly changed the speed of the centrifuges while showing operators fake readings that everything was normal. The centrifuges destroyed themselves because their integrity monitoring had been compromised.
{{< /drg/did-you-know >}}

## Availability

**Availability** means that systems and data are accessible when authorized users need them. The best encryption and access controls in the world are useless if the system is down and nobody can reach it. A hospital's electronic medical records are critical — if a cyberattack makes them unavailable during an emergency surgery, lives are at risk.

### How availability is maintained:

- **Redundancy** — backup systems that take over when primary systems fail
- **Load balancing** — spreading traffic across multiple servers so no single one gets overwhelmed
- **DDoS protection** — defenses against attacks that flood servers with fake traffic
- **Regular backups** — copies of data that can be restored if the original is lost or encrypted by ransomware
- **Disaster recovery plans** — documented procedures for getting systems back online quickly

### What happens when availability fails:

**Denial-of-Service (DoS)** attacks flood a server with so much traffic that legitimate users cannot get through — like a thousand people calling the same phone number at once so no real calls can connect. **Ransomware** attacks encrypt an organization's files and demand payment for the decryption key, making data unavailable until the ransom is paid (or backups are restored).

## How the Three Work Together

The CIA Triad is a *triad* because all three principles must be balanced. Focusing too much on one can undermine another:

- **Too much confidentiality** can hurt availability: if the login process is so strict that authorized users cannot get in, the system is effectively unavailable.
- **Too much availability** can hurt confidentiality: making data easy to access for everyone means it is easy for attackers too.
- **Integrity without availability** is pointless: perfectly accurate data that nobody can access helps no one.

Good cybersecurity finds the right balance among all three, based on what the system needs. A military database prioritizes confidentiality. A news website prioritizes availability. A banking system needs all three equally.

{{< drg/tip >}}
When explaining the CIA Triad to your counselor, use a real-world example that touches all three. For instance: "My school's online grade system needs **confidentiality** so only I and my teachers see my grades, **integrity** so nobody can change a grade without authorization, and **availability** so I can check my grades when I need to."
{{< /drg/tip >}}

{{< drg/external-link
    title="What Is the CIA Triad? — Coursera"
    url="https://www.coursera.org/articles/cia-triad"
    description="A clear overview of the CIA Triad with examples from real-world cybersecurity applications." >}}

{{< drg/image src="images/cia-triad-diagram.avif" alt="The CIA Triad triangle diagram showing Confidentiality, Integrity, and Availability" >}}

{{< drg/next-page
    text="You now know the three pillars of cybersecurity"
    teaser="next, learn the language of threats — what vulnerabilities, threats, and exploits really mean."
    url="/merit-badges/cybersecurity/guide/req4a/" >}}
