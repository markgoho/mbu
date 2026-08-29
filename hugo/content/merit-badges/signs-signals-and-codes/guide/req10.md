---
title: "Secret Codes and Cryptography"
layout: "guide"
group_title: "10. Hidden Messages"
req_number: "10"
req_path: "10"
prev: "/merit-badges/signs-signals-and-codes/guide/req9/"
prev_title: "Symbols in Daily Life"
next: "/merit-badges/signs-signals-and-codes/guide/extended-learning/"
next_title: "Extended Learning"
---

{{< drg/requirement number="10" >}}
Briefly discuss the history of secret code writing (cryptography). Make up your own secret code and write a message of up to 25 words using this code. Share the message with a friend or fellow Scout. Then share the message and code key with your counselor and discuss the effectiveness of your code.
{{< /drg/requirement >}}

## Codes, Ciphers, and Cryptology

Before diving into history, it helps to know three related terms:

- **Code** — a system where entire words or phrases are replaced by other words, numbers, or symbols. Codes require a codebook. Example: "The eagle has landed" meaning "mission accomplished."
- **Cipher** — a system where individual letters or characters are systematically replaced or rearranged. Ciphers use an algorithm and often a key. Example: shifting every letter three positions forward in the alphabet.
- **Cryptology** — the broader science of making messages secret (cryptography) and breaking secret messages (cryptanalysis).

The requirement calls your creation a "code," but in practice you'll most likely be creating a cipher. Either is fine—just understand the distinction.

## A Brief History of Secret Writing

Secret writing is as old as warfare and diplomacy. Here are the key milestones:

### Ancient Times

**The Spartan Scytale (~700 BCE)** — Spartan commanders used a cylindrical rod called a scytale. A strip of leather was wound around the rod and the message was written along the rod's length. When unwound, the leather showed only a meaningless jumble. Only a rod of the same diameter could decode it—the first known transposition cipher.

**Caesar Cipher (~50 BCE)** — Julius Caesar used a simple substitution cipher: shift every letter three positions forward in the alphabet. A became D, B became E, and so on. Simple by modern standards, but effective against enemies who had no idea alphabetic substitution was being used.

{{< drg/did-you-know >}}
A Caesar cipher is also called a ROT-3 cipher (rotate by 3). The internet still uses ROT-13 (rotate by 13) as a lightweight "spoiler" cipher in forums—it's easy to decode by eye once you know what it is.
{{< /drg/did-you-know >}}

### Renaissance to Early Modern

**Leon Battista Alberti's Cipher Disk (1467)** — Italian architect Leon Battista Alberti invented the polyalphabetic cipher and a mechanical cipher disk to implement it. Instead of a single fixed shift, the disk rotated to use a different substitution for each letter of the message. This was a major advance over Caesar—and was still being used in modified forms 400 years later.

**The Pigpen Cipher (18th century)** — Used by Freemasons and later popularized widely, the pigpen cipher replaces letters with geometric shapes based on a grid. Each letter is drawn as the grid segment around it, with or without a dot. It's visually unusual and memorable, which is why it's still used in puzzles and escape rooms today.

**Jefferson Wheel (~1795)** — Thomas Jefferson invented a cipher wheel made of 26 discs, each with the alphabet scrambled in a different order. The sender aligned the discs to spell the message, then copied any other row as the ciphertext. The receiver used an identical wheel to find the only row that spelled readable English.

### World Wars

**German Enigma Machine (WWII)** — The Enigma machine was an electromechanical cipher device used by Nazi Germany to encrypt military communications. It used multiple rotating cipher wheels to create an astronomically large number of possible settings—the transmitting operator set the machine to a prearranged daily setting, and all recipients had identical machines. The Allies cracking Enigma (through the work of Alan Turing and others at Bletchley Park) is considered one of the decisive intelligence victories of the war.

**Battle of Midway (1942)** — American cryptanalysts broke the Japanese naval code JN-25 well enough to determine that Japan was targeting a location coded as "AF." The US planted disinformation suggesting AF's water supply was failing; Japanese communications confirmed AF meant Midway. This intelligence allowed the US Navy to position its carriers for the ambush that turned the tide of the Pacific War.

{{< drg/did-you-know >}}
The Native American Code Talkers of WWII used a completely different approach: rather than a mechanical cipher, the Navajo language itself was the code. Native language speakers transmitted military communications that even a native Navajo speaker couldn't decode without knowing the additional military vocabulary code layer—and Japanese cryptanalysts never broke it.
{{< /drg/did-you-know >}}

### Modern Cryptography

Today's cryptography is mathematical rather than mechanical. **Public-key encryption** (developed in the 1970s) uses pairs of mathematically linked keys—a public key that anyone can use to encrypt a message, and a private key that only the recipient holds for decryption. This is how your browser creates a secure HTTPS connection, how your bank protects your login, and how every email, text, and password on the internet is kept private.

Breaking modern encryption requires computational power that doesn't exist—cracking a 256-bit key by brute force would take longer than the current age of the universe.

## Designing Your Own Code

You need to create a code, write a 25-word message using it, share the message with a friend or Scout, then show your counselor both the message and the key.

### Simple Starting Points

**Substitution cipher** — Replace each letter with a different letter, number, or symbol. Create a table mapping A→#, B→?, etc. Simple to make, but frequency analysis can crack it (common letters like E, T, A appear most often even in coded text).

**Caesar-style shift** — Shift the alphabet by a number of your choosing (shift 7: A→H, B→I, etc.). Easy to use, but easy for a clever solver to crack.

**Symbol substitution** — Create your own set of symbols for each letter—geometric shapes, simple icons, or alien-looking marks. The same weakness as substitution (frequency), but more visually interesting.

**Rail fence cipher (transposition)** — Write your message in a zigzag pattern across two or more rows, then read across each row in order. "HELLO WORLD" in a two-rail fence becomes HLOOL / ELWRD → ciphertext "HLOOLELWRD". This rearranges rather than substitutes.

**Mixed code** — Combine substitution with a keyword: agree on a key word, remove duplicate letters, write the keyword first, then continue the remaining alphabet. This makes frequency analysis harder.

### Tips for a Stronger Code

- Add a **null character** (a symbol or letter that means "ignore this") to confuse pattern analysis
- Split words differently in the ciphertext so word lengths don't hint at the plaintext
- Use numbers for vowels to break up common letter patterns
- Add a simple transposition after substitution for a two-layer cipher

{{< drg/tip >}}
When you discuss effectiveness with your counselor, think about: How hard is it to send a message? How hard is it to decode if you don't have the key? Could someone crack it by looking for patterns? What would make it stronger?
{{< /drg/tip >}}

## What to Bring to Your Counselor Meeting

1. Your plaintext message (the original words)
2. Your ciphertext message (the encoded version)
3. Your code key (the table or algorithm to encode/decode)
4. Evidence that a friend or Scout tried to decode the message from the ciphertext
5. Your assessment of its strengths and weaknesses

{{< drg/checklist title="Req 10 Readiness" >}}
- [ ] Can briefly describe the history of cryptography with at least three historical examples
- [ ] Can distinguish between a code, a cipher, and cryptology
- [ ] Have created my own cipher/code system
- [ ] Have written a message of up to 25 words using my code
- [ ] Have shared the message (not the key) with a friend or Scout
- [ ] Ready to share both the message and the key with my counselor
- [ ] Ready to discuss how effective my code is and how it could be improved
{{< /drg/checklist >}}

{{< drg/next-page
    text="You've earned it. The Extended Learning page has ideas for going deeper into this subject—from amateur radio to professional cryptography."
    teaser="Extended Learning"
    url="/merit-badges/signs-signals-and-codes/guide/extended-learning/" >}}
