---
title: "Encrypted Connections"
layout: guide
group_title: "6. Cryptography"
req_number: "6b"
prev: "/merit-badges/cybersecurity/guide/req6a/"
prev_title: "Encryption Uses"
next: "/merit-badges/cybersecurity/guide/req6c/"
next_title: "Crypto Hands-On"
---

{{< drg/requirement number="6b" >}}
Show how you can know if your connection to a website is encrypted.
{{< /drg/requirement >}}

Every modern browser gives you clear visual signals about whether your connection is encrypted. Learning to read these signals takes about 30 seconds — and it is a habit that will protect you for life.

## The Padlock Icon

The most visible indicator is the **padlock icon** in your browser's address bar. When you see it, your connection to that website is encrypted using TLS (Transport Layer Security).

- **Padlock present** — your connection is encrypted. Data you send (passwords, form submissions, credit card numbers) is protected in transit.
- **No padlock / "Not Secure" warning** — the connection is not encrypted. Anything you type can potentially be intercepted by someone on the same network.

{{< drg/safety-first >}}
Never enter a password, credit card number, or any personal information on a website that shows "Not Secure" in the address bar. On an unencrypted connection, this data travels in plain text — anyone monitoring the network can read it.
{{< /drg/safety-first >}}

## HTTPS vs. HTTP

The encryption status is also visible in the URL itself:

- **https://** — the "s" stands for "secure." This connection is encrypted.
- **http://** — no encryption. Data is sent in plain text.

Modern browsers are moving toward hiding the "https://" prefix because it is so common, but you can usually click on the address bar to see the full URL.

## Viewing Certificate Details

Clicking the padlock icon reveals more information about the encryption:

1. **Click the padlock** in your browser's address bar
2. Look for "Connection is secure" or similar text
3. Click for more details to see the **certificate information**

The certificate tells you:
- **Who issued it** — a Certificate Authority (CA) like Let's Encrypt, DigiCert, or Comodo verified that the website owner is who they claim to be
- **Who it was issued to** — the domain name the certificate covers
- **When it expires** — certificates must be renewed regularly
- **The encryption strength** — typically TLS 1.2 or 1.3 with AES-256

{{< drg/tip >}}
Try this right now: open your browser and visit a website you use regularly. Click the padlock icon and explore the certificate details. Then try visiting a site that uses plain HTTP (these are increasingly rare but still exist) and notice the "Not Secure" warning. Understanding these visual cues becomes second nature once you start looking.
{{< /drg/tip >}}

## What Encrypted Connections Do and Do Not Protect

**Encrypted connections protect:**
- Data in transit between your device and the server (passwords, messages, financial info)
- The integrity of the data (it cannot be modified without detection)
- Privacy from eavesdroppers on the same network

**Encrypted connections do NOT protect you from:**
- **Phishing sites.** A fake website can have a padlock and HTTPS. The padlock means the *connection* is encrypted, not that the website is trustworthy. A scammer's site can get a certificate just as easily as a legitimate one.
- **Malware on the site.** An encrypted connection to a malicious website still delivers malware.
- **Data the website collects.** Encryption protects data in transit, but once it reaches the server, the website can do whatever its privacy policy allows with it.

{{< drg/did-you-know >}}
As of 2024, over 95% of web traffic is encrypted with HTTPS. Just ten years ago, it was under 50%. The push for universal encryption was led by browser makers (Google Chrome started showing "Not Secure" warnings for HTTP sites in 2018) and organizations like Let's Encrypt, which provides free SSL/TLS certificates.
{{< /drg/did-you-know >}}

## Demonstrating for Your Counselor

Show your counselor the following:
1. The padlock icon on a website and what happens when you click it
2. The difference between https:// and http:// in the address bar
3. The certificate details — who issued it, who it is for, and when it expires
4. Explain that HTTPS alone does not guarantee a site is trustworthy (just that the connection is encrypted)

{{< drg/external-link
    title="HTTP Secure (HTTPS) — Khan Academy"
    url="https://www.khanacademy.org/computing/computers-and-internet/xcae6f4a7ff015e7d:online-data-security/xcae6f4a7ff015e7d:data-encryption-technique"
    description="Learn how HTTPS works and why it matters for protecting your online activity." >}}

{{< drg/image src="images/browser-padlock-detail.avif" alt="Browser address bar showing padlock icon and HTTPS URL with expanded certificate information panel" >}}

{{< drg/next-page
    text="You know how to check for encrypted connections"
    teaser="now get hands-on with cryptography — ciphers, hashing, or encrypted messaging."
    url="/merit-badges/cybersecurity/guide/req6c/" >}}
