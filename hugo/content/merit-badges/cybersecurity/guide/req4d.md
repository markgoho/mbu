---
title: "Req 4d — Spoofing & Phishing"
layout: guide
group_title: "Threats & Attacks"
req_number: "4d"
prev: "/merit-badges/cybersecurity/guide/req4c/"
prev_title: "Req 4c — Public Wi-Fi Risks"
next: "/merit-badges/cybersecurity/guide/req4e/"
next_title: "Req 4e — Current Events"
---

{{< drg/requirement number="4d" >}}
Describe what spoofing and phishing are, and how to recognize a message or website that might be trying to trick you. Explain what steps you should take to protect yourself and others if you come across one.
{{< /drg/requirement >}}

You get an email from your bank: "We detected suspicious activity on your account. Click here to verify your identity immediately." The email looks real — it has the bank's logo, the right colors, even a professional tone. But the link leads to a fake website designed to steal your password. This is **phishing**, and it is the most common cyberattack in the world.

## What Is Spoofing?

**Spoofing** is pretending to be someone or something you are not. It is the umbrella technique behind many cyberattacks. Attackers "spoof" trusted identities to trick you into lowering your guard.

Common types of spoofing:
- **Email spoofing** — sending an email that appears to come from a trusted address (your school, your bank, a friend)
- **Caller ID spoofing** — making a phone call that shows a fake number on your caller ID
- **Website spoofing** — creating a fake website that looks identical to a real one
- **IP spoofing** — disguising the origin of network traffic to bypass security systems

## What Is Phishing?

**Phishing** is a specific attack that uses spoofing to trick you into giving up sensitive information — passwords, credit card numbers, Social Security numbers, or login credentials. The name comes from "fishing" — the attacker casts bait and waits for someone to bite.

### Types of Phishing

- **Email phishing** — mass emails sent to thousands of people, hoping some will click
- **Spear phishing** — targeted emails crafted for a specific person using personal details ("Hi Marcus, here is the camping trip schedule you asked about")
- **Smishing** — phishing via SMS text messages ("Your package could not be delivered. Click to reschedule.")
- **Vishing** — phishing via voice calls ("This is the IRS. You owe back taxes. Press 1 to pay immediately.")

## How to Spot a Phishing Attempt

Phishing messages are getting more sophisticated every year, but they still leave clues.

{{< drg/checklist title="Phishing Red Flags" subtitle="Check for these warning signs in any suspicious message" >}}
- Urgency and threats: "Your account will be suspended in 24 hours" or "Act now or lose access." Legitimate companies rarely threaten you via email.
- Generic greetings: "Dear Customer" or "Dear User" instead of your actual name.
- Suspicious sender address: The display name might say "Apple Support" but the actual email is something like support@apple-verify-id.com. Check the full email address.
- Misspellings and bad grammar: Professional companies proofread their emails. Multiple errors are a red flag.
- Unexpected attachments: Do not open attachments you did not expect, especially .exe, .zip, or .doc files.
- Mismatched links: Hover over a link (without clicking) to see where it actually goes. If the display text says "www.paypal.com" but the URL goes somewhere else, it is a phish.
- Requests for sensitive information: Legitimate companies will never ask for your password, full Social Security number, or credit card number via email.
{{< /drg/checklist >}}

{{< drg/be-prepared title="The 'Verify Your Account' Email" >}}
You receive an email that looks like it is from a service you actually use — maybe Instagram or your email provider. It says your account has been compromised and you need to click a link to verify your identity.

- **Do not click the link.** Even if the email looks perfect, do not use any links in it.
- **Go directly to the source.** Open a new browser window and type the website address yourself (e.g., instagram.com). Log in normally. If there is really a problem with your account, you will see a notification there.
- **Check the sender.** Look at the actual email address, not just the display name. Phishing emails often come from addresses that are close to real ones but slightly off (support@instagran.com).
- **Report it.** Most email providers have a "Report phishing" button. Use it. This helps train spam filters and protects other people.
- **Tell someone.** If you are unsure whether an email is real, ask a parent, teacher, or IT staff member before doing anything.
{{< /drg/be-prepared >}}

## Recognizing Fake Websites

Phishing emails often lead to fake websites that look nearly identical to the real thing. Here is how to spot them:

- **Check the URL carefully.** Look for subtle misspellings: "paypa1.com" (with a number 1 instead of the letter l), "arnazon.com" instead of "amazon.com."
- **Look for HTTPS.** While HTTPS alone does not guarantee a site is legitimate (attackers can get certificates too), the *absence* of HTTPS on a login page is a definite red flag.
- **Look for visual inconsistencies.** Blurry logos, broken formatting, or links that do not work can indicate a hastily created fake site.
- **Test non-critical links.** On a real company website, the "About Us," "Contact," and "Privacy Policy" links all work. On a phishing site, they often lead nowhere.

{{< drg/safety-first >}}
If you accidentally click a phishing link and enter your credentials, change your password immediately from a device you know is secure. Enable multi-factor authentication if you have not already. Monitor the account for unauthorized activity. If the compromised account used the same password as other accounts, change those passwords too — attackers try stolen credentials on multiple sites (this is called **credential stuffing**).
{{< /drg/safety-first >}}

{{< drg/external-link
    title="Be Internet Alert — Google"
    url="https://beinternetawesome.withgoogle.com/"
    description="Interactive resources from Google for recognizing phishing, scams, and other online deceptions." >}}

{{< drg/image src="images/phishing-email-anatomy.avif" alt="Educational diagram showing the anatomy of a suspicious email with numbered callouts for warning signs" >}}

{{< drg/next-page
    text="You can now spot phishing and spoofing attacks"
    teaser="learn about real cybersecurity incidents that have made the news."
    url="/merit-badges/cybersecurity/guide/req4e/" >}}
