---
title: "Req 5b — Installing Updates"
layout: guide
group_title: "Cyber Defenses"
req_number: "5b"
prev: "/merit-badges/cybersecurity/guide/req5a/"
prev_title: "Req 5a — Defense Technologies"
next: "/merit-badges/cybersecurity/guide/req5c/"
next_title: "Req 5c — System Security"
---

{{< drg/requirement number="5b" >}}
Installing updates. Do the following:
{{< /drg/requirement >}}

This requirement covers two connected tasks: understanding *why* updates matter and demonstrating *how* to install them.

{{< drg/requirement number="5b1" >}}
Explain to your counselor the importance of installing the latest updates on your computer, why they are needed, and what kinds of problems they can prevent.
{{< /drg/requirement >}}

## Why Updates Matter

That notification nagging you to "Restart to install updates" is not just an annoyance — it might be the most important cybersecurity tool on your device. Software updates fix **known vulnerabilities** that attackers are actively trying to exploit. Delaying an update is like knowing your front door lock is broken and choosing not to fix it.

### What Updates Contain

Software updates typically include three types of changes:

- **Security patches** — fix vulnerabilities that could be exploited by attackers. These are the critical ones.
- **Bug fixes** — resolve crashes, errors, and unexpected behavior.
- **Feature improvements** — add new functionality or improve performance.

Security patches are by far the most important. When a security researcher discovers a vulnerability, the software company races to create a patch before attackers can exploit it. Once the patch is released, the clock starts ticking — attackers reverse-engineer the patch to figure out the vulnerability it fixes, then target anyone who has not updated yet.

{{< drg/did-you-know >}}
The WannaCry ransomware attack of 2017 exploited a vulnerability in Windows that Microsoft had already patched *two months earlier*. Every computer that was infected could have been protected by simply installing the update. Over 230,000 computers in 150 countries were hit because their owners clicked "Remind me later."
{{< /drg/did-you-know >}}

### What Kinds of Problems Updates Prevent

- **Malware infections** — patches close the security holes that malware uses to get in
- **Data breaches** — unpatched software is one of the top causes of organizational data breaches
- **Ransomware** — many ransomware variants specifically target known, unpatched vulnerabilities
- **Account compromises** — browser and app updates fix flaws that could expose your login credentials
- **System instability** — bug fixes prevent crashes and data loss

{{< drg/safety-first >}}
Enable **automatic updates** on every device you own. On most computers and phones, this is a single setting. Automatic updates mean you get security patches as soon as they are available — without having to remember to check manually.
{{< /drg/safety-first >}}

---

{{< drg/requirement number="5b2" >}}
Demonstrate to your counselor how to check for, download, and install the latest updates for your computer or mobile device, or another computer you have permission to use (if you are unable to do this on your computer, you may use an online guide with screenshots to demonstrate this). Show your counselor how to verify that your computer or mobile device is up-to-date.
{{< /drg/requirement >}}

## How to Update Your Devices

The exact steps depend on your operating system. Here are the main ones.

### Windows

1. Open **Settings** (click the gear icon in the Start menu)
2. Click **Windows Update** (or **Update & Security** on older versions)
3. Click **Check for updates**
4. If updates are available, click **Download and install**
5. Restart when prompted
6. After restart, go back to Windows Update — it should say "You're up to date"

### macOS

1. Click the **Apple menu** (top-left corner) → **System Settings**
2. Click **General** → **Software Update**
3. If an update is available, click **Update Now** or **Upgrade Now**
4. Enter your password and wait for the installation
5. After restart, the Software Update screen should show your system is current

### iPhone / iPad

1. Open **Settings** → **General** → **Software Update**
2. If an update is available, tap **Download and Install**
3. Enter your passcode and agree to the terms
4. The device will restart automatically
5. To enable automatic updates: **Settings** → **General** → **Software Update** → **Automatic Updates** → toggle on

### Android

1. Open **Settings** → **System** → **System Update** (varies by manufacturer)
2. Tap **Check for update**
3. If available, tap **Download and install**
4. The device will restart to complete the update

{{< drg/tip >}}
Do not forget about app updates, too. On both iPhone and Android, go to your app store and check for available updates. You can set apps to update automatically, which is the easiest approach. Outdated apps are just as vulnerable as outdated operating systems.
{{< /drg/tip >}}

{{< drg/checklist title="Update Demonstration Prep" subtitle="Be ready to show your counselor these steps" >}}
- Open the update settings on your device.
- Check for available updates.
- Show the current version number of your operating system.
- Demonstrate that automatic updates are enabled (or enable them during the demonstration).
- Show how to check for app updates in your app store.
{{< /drg/checklist >}}

{{< drg/external-link
    title="Keep Your Device's Operating System and Applications Up to Date — CISA"
    url="https://www.cisa.gov/resources-tools/training/keep-your-devices-operating-system-and-applications-date"
    description="Official guidance from CISA on why and how to keep all your devices updated." >}}

{{< drg/image src="images/update-notification-screen.avif" alt="Smartphone showing software update notification with icons for security patches, bug fixes, and new features" >}}

{{< drg/next-page
    text="Updates are your first line of defense"
    teaser="now get hands-on with system security tools — passwords, MFA, antivirus, and more."
    url="/merit-badges/cybersecurity/guide/req5c/" >}}
