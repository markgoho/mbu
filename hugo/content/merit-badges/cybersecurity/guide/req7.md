---
title: "IoT Devices"
layout: guide
group_title: "Projects & Careers"
req_number: "7"
prev: "/merit-badges/cybersecurity/guide/req6c/"
prev_title: "Crypto Hands-On"
next: "/merit-badges/cybersecurity/guide/req8/"
next_title: "Cybersecurity Activities"
---

{{< drg/requirement number="7" >}}
Connected Devices and Internet of Things (IoT). Describe to your counselor four electronic devices you encounter that could be connected to the internet, why this connectivity can be useful, what risks are posed by the connectivity, and how they could be protected.
{{< /drg/requirement >}}

Your refrigerator can order groceries. Your doorbell can send video to your phone. Your watch can track your heartbeat and upload it to the cloud. Welcome to the **Internet of Things (IoT)** — the network of everyday objects connected to the internet. It is incredibly useful and incredibly risky at the same time.

## What Is the Internet of Things?

The IoT is the expanding universe of physical devices — beyond traditional computers and phones — that connect to the internet to send, receive, or process data. There are already more IoT devices on Earth than people, and the number is growing by billions each year.

These devices often have limited computing power, minimal security features, and rarely receive software updates after they are sold. This makes them prime targets for attackers — as you learned in [Req 3a](/merit-badges/cybersecurity/guide/req3a/) when discussing the Mirai botnet, which hijacked hundreds of thousands of IoT devices.

## Four IoT Devices to Consider

Here are examples organized by where you might encounter them. Choose four that you actually see in your life — your counselor will be more interested in devices you can speak about from personal experience.

### Smart Home Devices

**Smart speakers and voice assistants** (Amazon Echo, Google Home, Apple HomePod):
- **Usefulness:** Voice-controlled music, timers, weather, smart home control, homework help
- **Risks:** Always-on microphones that could be exploited to eavesdrop; voice data stored on company servers; could be used to unlock other smart home features without proper authentication
- **Protection:** Review and delete voice recordings regularly; mute the microphone when not in use; disable purchasing features; keep firmware updated

**Smart thermostats and home automation** (Nest, Ecobee):
- **Usefulness:** Save energy by learning your schedule; remote control from your phone; integrate with other smart home systems
- **Risks:** Reveal when your home is occupied or empty (useful to burglars); could be hijacked to change heating/cooling to extreme levels; part of the larger attack surface on your home network
- **Protection:** Use strong, unique passwords; keep on a separate Wi-Fi network; update firmware regularly

### Wearable Devices

**Fitness trackers and smartwatches** (Apple Watch, Fitbit, Garmin):
- **Usefulness:** Track health metrics, navigate, receive notifications, emergency SOS features
- **Risks:** Collect sensitive health data (heart rate, sleep patterns, menstrual cycles); GPS tracking reveals precise location history and exercise routes; data shared with third-party apps
- **Protection:** Review app permissions; disable location sharing for fitness apps when possible; use strong authentication; review what data is shared with third parties

### Security Devices

**Smart cameras and doorbells** (Ring, Nest Cam, Arlo):
- **Usefulness:** Monitor your home remotely, see who is at the door, record security footage
- **Risks:** If hacked, attackers can watch your home in real-time; footage stored in the cloud could be accessed in a breach; some devices have had vulnerabilities allowing strangers to view cameras
- **Protection:** Change default passwords immediately; enable two-factor authentication; keep firmware updated; consider using cameras with local (not cloud) storage

{{< drg/be-prepared title="Your Smart Camera Gets Hacked" >}}
You get a notification from a stranger through your family's smart doorbell. They claim they can see you through the camera and taunt you with personal details.

- **Do not engage.** Do not respond to the stranger.
- **Cover or unplug the camera** immediately.
- **Change all passwords** associated with the device and its app account.
- **Enable MFA** if it is not already active.
- **Check for firmware updates** and install them.
- **Tell your parents** and contact the device manufacturer's support team.
- **File a report** if the person made threats.
{{< /drg/be-prepared >}}

### Gaming and Entertainment

**Gaming consoles** (Xbox, PlayStation, Nintendo Switch):
- **Usefulness:** Online multiplayer gaming, streaming media, voice and video chat with friends
- **Risks:** Linked to payment methods (credit cards, gift cards); online interactions with strangers; voice chat can expose personal information; account theft is common in gaming
- **Protection:** Use unique, strong passwords; enable MFA on your gaming accounts; do not share account credentials; monitor linked payment methods; enable parental controls where appropriate

### Other IoT Devices to Consider

- **Smart TVs** — connected to streaming accounts, may have cameras and microphones
- **Connected cars** — GPS tracking, remote start, cellular connectivity
- **Smart appliances** — refrigerators, ovens, washing machines with Wi-Fi
- **Medical devices** — insulin pumps, pacemakers, health monitors
- **Smart toys** — connected stuffed animals and games that record conversations

{{< drg/did-you-know >}}
In 2015, security researchers demonstrated they could remotely take control of a Jeep Cherokee through its internet-connected entertainment system — steering the vehicle, disabling the brakes, and killing the engine while it was on the highway. Chrysler recalled 1.4 million vehicles to patch the vulnerability.
{{< /drg/did-you-know >}}

## General IoT Protection Rules

No matter which four devices you discuss, these principles apply to all of them:

{{< drg/checklist title="IoT Security Basics" subtitle="Apply these to every connected device" >}}
- Change default passwords: Factory-set passwords are publicly known. Change them immediately.
- Keep firmware updated: Check for updates regularly — many IoT devices do not update automatically.
- Use a separate network: Put IoT devices on a guest Wi-Fi network so a compromised device cannot reach your computers and phones.
- Disable unused features: If you do not use voice control or remote access, turn it off. Every feature is a potential entry point.
- Research before buying: Check whether the manufacturer provides regular security updates and for how long.
{{< /drg/checklist >}}

{{< drg/external-link
    title="What Is the Internet of Things (IoT)? — IBM"
    url="https://www.ibm.com/think/topics/internet-of-things"
    description="A comprehensive overview of IoT technology, applications, and security considerations from IBM." >}}

{{< drg/image src="images/iot-smart-home-network.avif" alt="Cutaway house showing IoT devices in different rooms connected by dotted lines to a central Wi-Fi router" >}}

{{< drg/next-page
    text="You understand the security challenges of our connected world"
    teaser="now put your cybersecurity knowledge to the test with a hands-on activity or competition."
    url="/merit-badges/cybersecurity/guide/req8/" >}}
