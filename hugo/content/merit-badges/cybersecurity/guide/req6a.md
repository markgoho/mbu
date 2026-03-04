---
title: "Req 6a — Encryption Uses"
layout: guide
group_title: "Cryptography"
req_number: "6a"
prev: "/merit-badges/cybersecurity/guide/req5c/"
prev_title: "Req 5c — System Security"
next: "/merit-badges/cybersecurity/guide/req6b/"
next_title: "Req 6b — Encrypted Connections"
---

{{< drg/requirement number="6a" >}}
Research and explain to your counselor three situations where encryption is used in cybersecurity. For each situation, describe what kind of encryption is used and why it is important.
{{< /drg/requirement >}}

Encryption is the art of turning readable information into scrambled nonsense that only authorized people can unscramble. It has been used for thousands of years — Julius Caesar shifted letters in his military messages, and the Enigma machine encrypted Nazi communications in World War II. Today, encryption is everywhere. Every time you see a padlock icon in your browser, encryption is at work.

## How Encryption Works (The Short Version)

Encryption uses a **key** (a piece of mathematical information) to scramble data. Only someone with the correct key can unscramble it. There are two main approaches:

- **Symmetric encryption** — the same key encrypts and decrypts the data. Fast, but both parties must share the key somehow. Think of it as a lockbox where both people have identical keys.
- **Asymmetric encryption** (public-key cryptography) — uses two mathematically linked keys: a **public key** (which anyone can see) and a **private key** (which only you have). Data encrypted with the public key can only be decrypted with the private key. This solves the key-sharing problem.

{{< drg/did-you-know >}}
Modern encryption is so strong that it would take all the computers on Earth billions of years to crack a single 256-bit AES-encrypted message by brute force. The math behind it is what keeps your bank account, medical records, and private messages safe.
{{< /drg/did-you-know >}}

## Three Situations Where Encryption Is Used

Here are several real-world situations to consider for your counselor discussion. You need three — research these or find your own.

### 1. HTTPS Web Browsing

Every time you visit a website with "https://" in the URL and a padlock icon, your connection is encrypted using **TLS (Transport Layer Security)**. This prevents anyone between you and the website — your ISP, a hacker on the same Wi-Fi, or a government — from reading the data you exchange.

- **What is encrypted:** Everything you send and receive — login credentials, form submissions, page content, cookies
- **Type of encryption:** Uses asymmetric encryption to establish the connection, then switches to faster symmetric encryption (usually AES) for the actual data transfer
- **Why it matters:** Without HTTPS, logging into your email on public Wi-Fi would be like shouting your password across a crowded room

You will explore this hands-on in [Req 6b](/merit-badges/cybersecurity/guide/req6b/).

### 2. Messaging Apps (End-to-End Encryption)

Apps like Signal, WhatsApp, and iMessage use **end-to-end encryption (E2EE)**, which means messages are encrypted on your device and only decrypted on the recipient's device. Not even the app company can read your messages.

- **What is encrypted:** Text messages, photos, videos, voice calls — everything sent through the app
- **Type of encryption:** Asymmetric encryption (each user has a public/private key pair). The Signal Protocol is the standard used by most major messaging apps.
- **Why it matters:** Without E2EE, the company running the messaging service could read your private conversations, and a breach of their servers would expose every message

### 3. Full-Disk Encryption

Full-disk encryption scrambles everything on your hard drive or phone storage. If someone steals your device, they cannot read your files without your password — even if they remove the hard drive and connect it to another computer.

- **What is encrypted:** The entire storage device — all files, apps, and system data
- **Type of encryption:** Symmetric encryption (usually AES-256). Your password or biometric unlocks the decryption key stored in a secure hardware chip.
- **Why it matters:** Without full-disk encryption, a stolen laptop is an open book. With it, a stolen laptop is a brick.
- **Where you see it:** BitLocker (Windows), FileVault (macOS), and default encryption on modern iPhones and Android devices

### Other Situations to Consider

- **VPN connections** — encrypt all internet traffic between your device and the VPN server (as discussed in [Req 5a](/merit-badges/cybersecurity/guide/req5a/))
- **Password storage** — password managers encrypt your password vault with AES-256
- **Digital signatures** — prove that a document or software update genuinely came from its claimed source and has not been tampered with
- **Email encryption** — PGP/GPG encrypts email messages so only the intended recipient can read them (covered in [Req 6c](/merit-badges/cybersecurity/guide/req6c/))
- **Cloud storage** — services like iCloud and Google Drive encrypt your files at rest on their servers

## Preparing for Your Counselor

For each of your three situations, be ready to explain:
1. **What data is being protected** and from whom
2. **What type of encryption** is used (symmetric, asymmetric, or both)
3. **Why encryption is important** in that specific situation — what would happen without it?

{{< drg/tip >}}
Connect each situation to a threat you learned about earlier. For example: "HTTPS uses TLS encryption to protect against man-in-the-middle attacks on public Wi-Fi, which I learned about in Req 4c." Your counselor will see that you understand how the pieces fit together.
{{< /drg/tip >}}

{{< drg/external-link
    title="The Need for Encryption — Khan Academy"
    url="https://www.khanacademy.org/computing/computers-and-internet/xcae6f4a7ff015e7d:online-data-security/xcae6f4a7ff015e7d:data-encryption-technique"
    description="Interactive lessons on why encryption exists, how it works, and where it is used in everyday life." >}}

{{< drg/image src="images/encryption-key-lock.avif" alt="Diagram comparing symmetric encryption (one shared key) and asymmetric encryption (public and private key pair)" >}}

{{< drg/next-page
    text="Now you understand how encryption protects data"
    teaser="see how to check whether your own web connections are encrypted."
    url="/merit-badges/cybersecurity/guide/req6b/" >}}
