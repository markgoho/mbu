---
title: "Crypto Hands-On"
layout: guide
group_title: "6. Cryptography"
req_number: "6c"
prev: "/merit-badges/cybersecurity/guide/req6b/"
prev_title: "Encrypted Connections"
next: "/merit-badges/cybersecurity/guide/req7/"
next_title: "IoT Devices"
---

{{< drg/requirement number="6c" >}}
Do ONE of the following:
{{< /drg/requirement >}}

This is where cryptography stops being theory and becomes something you can touch. Pick one of the four options below — each one lets you work with real encryption tools and see how they function.

---

### Option 1: Create Your Own Cipher

{{< drg/requirement number="6c1" >}}
Create your own encryption code, such as a substitution cipher or code book, and demonstrate using it to encrypt and decrypt a message. Describe the strengths and weaknesses of your code.
{{< /drg/requirement >}}

A **substitution cipher** replaces each letter with a different letter, number, or symbol. The simplest version is the Caesar cipher — shift every letter by a fixed number of positions. If you shift by 3, A becomes D, B becomes E, and so on.

To make your cipher more interesting, try:
- A **random substitution** where each letter maps to a random different letter (not just a shifted alphabet)
- A **code book** where entire words map to code words or numbers
- A **Vigenère cipher** that uses a keyword to shift each letter by a different amount

**Strengths to discuss:** Anyone without the key cannot easily read the message; the more random the substitution, the harder to crack.

**Weaknesses to discuss:** Simple substitution ciphers can be broken with **frequency analysis** — in English, the letter "E" appears most often, so the most common symbol in your encrypted message is probably "E." Modern computers can crack these in seconds.

{{< drg/tip >}}
Try encoding a message for a friend or fellow Scout, then give them the key and see if they can decode it. This hands-on exercise makes the concepts of encryption and decryption real in a way that reading about them cannot.
{{< /drg/tip >}}

---

### Option 2: End-to-End Encrypted Messaging

{{< drg/requirement number="6c2" >}}
Download and set up an app (from an official app store) that uses end-to-end encryption. Explain to your counselor what this means, how it works, and why it is more secure than other forms of communication (e.g. SMS).
{{< /drg/requirement >}}

**End-to-end encryption (E2EE)** means that messages are encrypted on your device and can only be decrypted on the recipient's device. Nobody in between — not the app company, not your internet provider, not a hacker — can read the message.

Apps with E2EE include **Signal** (widely considered the gold standard for secure messaging), **WhatsApp**, and **iMessage** (between Apple devices).

**Why E2EE is more secure than SMS:**
- SMS text messages are sent in plain text across cell towers — they can be intercepted
- Your carrier stores SMS messages on their servers
- SMS is vulnerable to SIM swapping attacks
- E2EE messages cannot be read even if the server is breached

For your counselor, install Signal or another E2EE app (with parental permission), send a test message, and explain how the encryption works behind the scenes.

---

### Option 3: Hashing and Checksums

{{< drg/requirement number="6c3" >}}
Use a hashing tool (for example, using SHA or MD5) to create a checksum for a file, document, or piece of text. Have a fellow Scout or your counselor make a change to it, then recreate the checksum and compare the new checksum to the original as a demonstration of file integrity checking.
{{< /drg/requirement >}}

A **hash** is a fixed-size digital fingerprint of data. Feed any file — no matter how large — through a hashing algorithm, and it produces a unique string of characters. Change even a single character in the file, and the hash changes completely. This makes hashing perfect for verifying that data has not been tampered with.

**How to create a hash:**
- **Windows:** Open Command Prompt and type `certutil -hashfile filename SHA256`
- **macOS/Linux:** Open Terminal and type `shasum -a 256 filename`
- **Online:** Use a tool like tools4noobs.com/online_tools/hash/

**The demonstration:**
1. Create a text file with a message
2. Generate the SHA-256 hash
3. Have your counselor or a fellow Scout change one character in the file
4. Generate the hash again
5. Compare the two hashes — they will be completely different, even though only one character changed

{{< drg/did-you-know >}}
Hashing is a one-way function — you can create a hash from data, but you cannot reverse a hash to get the original data back. This is why websites store hashes of your password instead of the password itself. Even if a hacker steals the hash database, they cannot directly recover your password from it.
{{< /drg/did-you-know >}}

---

### Option 4: PGP Email Encryption

{{< drg/requirement number="6c4" >}}
Create your own PGP (pretty good privacy) email key. Share your public key with others (and your counselor). Also, get their public keys and add them to your computer's key ring. Send a message that has been digitally encrypted.
{{< /drg/requirement >}}

**PGP (Pretty Good Privacy)** uses public-key cryptography to encrypt emails. You create a key pair — a public key that anyone can use to encrypt messages *to* you, and a private key that only you have to decrypt those messages.

**Steps:**
1. Install GPG software (Gpg4win for Windows, GPG Suite for macOS, or use the command line `gpg` tool)
2. Generate your key pair
3. Export your public key and share it with your counselor
4. Import your counselor's public key
5. Encrypt a message using their public key and send it
6. Decrypt a message they send you using your private key

This is the most advanced option and gives you direct experience with asymmetric encryption — the same concept that secures HTTPS connections and cryptocurrency transactions.

{{< drg/external-link
    title="Encryption, Decryption, and Code Cracking — Khan Academy"
    url="https://www.khanacademy.org/computing/computers-and-internet/xcae6f4a7ff015e7d:online-data-security/xcae6f4a7ff015e7d:data-encryption-techniques/a/encryption-decryption-and-code-cracking"
    description="Interactive exercises on encryption techniques from basic ciphers to modern cryptography." >}}

{{< drg/image src="images/cipher-wheel-activity.avif" alt="A colorful cipher wheel with outer and inner alphabet rings offset for encoding and decoding messages" >}}

{{< drg/next-page
    text="You have experienced cryptography firsthand"
    teaser="now explore the world of connected devices — the Internet of Things."
    url="/merit-badges/cybersecurity/guide/req7/" >}}
