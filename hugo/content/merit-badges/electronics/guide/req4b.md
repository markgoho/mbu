---
title: "Req 4b — Binary & Decimal Conversion"
layout: guide
group_title: "Circuits & Digital Logic"
req_number: "4b"
prev: "/merit-badges/electronics/guide/req4a/"
prev_title: "Req 4a — Control, Logic & Analog"
next: "/merit-badges/electronics/guide/req4c/"
next_title: "Req 4c — Build a Circuit Project"
---

{{< drg/requirement number="4b" >}}
Show how to change three decimal numbers into binary numbers and three binary numbers into decimal numbers.
{{< /drg/requirement >}}

In [Req 4a](/merit-badges/electronics/guide/req4a/), you learned that digital electronics speak in binary — a number system with only two digits: 0 and 1. Now you need to become fluent in translating between the decimal system (the base-10 system you use every day) and binary (the base-2 system that every computer uses internally).

## Why Binary Matters

Computers use binary because transistors — the tiny switches inside every chip — have two states: on (1) and off (0). A single binary digit is called a **bit**. Eight bits grouped together form a **byte**, which can represent any number from 0 to 255. Every number, letter, color, and sound in a computer is ultimately stored as a pattern of bits.

## Understanding Place Values

The key to conversion is understanding **place values**. In the decimal system, each position is worth 10 times more than the one to its right:

| Position | Thousands | Hundreds | Tens | Ones |
|---|---|---|---|---|
| Place value | 1000 | 100 | 10 | 1 |
| Power of 10 | 10^3 | 10^2 | 10^1 | 10^0 |

Binary works the same way, but each position is worth **2 times** more than the one to its right:

| Position | 128s | 64s | 32s | 16s | 8s | 4s | 2s | 1s |
|---|---|---|---|---|---|---|---|---|
| Place value | 128 | 64 | 32 | 16 | 8 | 4 | 2 | 1 |
| Power of 2 | 2^7 | 2^6 | 2^5 | 2^4 | 2^3 | 2^2 | 2^1 | 2^0 |

## Decimal to Binary — The Division Method

To convert a decimal number to binary, repeatedly divide by 2 and record the remainders. Read the remainders from bottom to top.

### Example: Convert 42 to binary

| Step | Division | Quotient | Remainder |
|---|---|---|---|
| 1 | 42 / 2 | 21 | 0 |
| 2 | 21 / 2 | 10 | 1 |
| 3 | 10 / 2 | 5 | 0 |
| 4 | 5 / 2 | 2 | 1 |
| 5 | 2 / 2 | 1 | 0 |
| 6 | 1 / 2 | 0 | 1 |

Reading the remainders from bottom to top: **42 in decimal = 101010 in binary.**

### Example: Convert 13 to binary

| Step | Division | Quotient | Remainder |
|---|---|---|---|
| 1 | 13 / 2 | 6 | 1 |
| 2 | 6 / 2 | 3 | 0 |
| 3 | 3 / 2 | 1 | 1 |
| 4 | 1 / 2 | 0 | 1 |

Reading bottom to top: **13 = 1101**

### Example: Convert 200 to binary

| Step | Division | Quotient | Remainder |
|---|---|---|---|
| 1 | 200 / 2 | 100 | 0 |
| 2 | 100 / 2 | 50 | 0 |
| 3 | 50 / 2 | 25 | 0 |
| 4 | 25 / 2 | 12 | 1 |
| 5 | 12 / 2 | 6 | 0 |
| 6 | 6 / 2 | 3 | 0 |
| 7 | 3 / 2 | 1 | 1 |
| 8 | 1 / 2 | 0 | 1 |

Reading bottom to top: **200 = 11001000**

## Binary to Decimal — The Addition Method

To convert binary to decimal, write out the place values above each bit, then add up the place values wherever you see a 1.

### Example: Convert 110101 to decimal

| Place value | 32 | 16 | 8 | 4 | 2 | 1 |
|---|---|---|---|---|---|---|
| Binary digit | 1 | 1 | 0 | 1 | 0 | 1 |

Add the place values where the digit is 1: 32 + 16 + 4 + 1 = **53**

### Example: Convert 10010 to decimal

| Place value | 16 | 8 | 4 | 2 | 1 |
|---|---|---|---|---|---|
| Binary digit | 1 | 0 | 0 | 1 | 0 |

Add: 16 + 2 = **18**

### Example: Convert 11111111 to decimal

| Place value | 128 | 64 | 32 | 16 | 8 | 4 | 2 | 1 |
|---|---|---|---|---|---|---|---|---|
| Binary digit | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |

Add: 128 + 64 + 32 + 16 + 8 + 4 + 2 + 1 = **255**

{{< drg/did-you-know >}}
The number 255 (11111111 in binary) appears constantly in computing. It is the maximum value a single byte can hold. That is why color values on screens range from 0 to 255 — each color channel (red, green, blue) is stored in one byte. Pure white is (255, 255, 255) and pure black is (0, 0, 0).
{{< /drg/did-you-know >}}

## Quick Check — Place Value Method for Decimal to Binary

There is a faster method that some people prefer. Start with the largest power of 2 that fits into your number, subtract it, and continue:

**Convert 45 to binary:**
- 45 >= 32? Yes. Write **1**. Remainder: 45 - 32 = 13
- 13 >= 16? No. Write **0**.
- 13 >= 8? Yes. Write **1**. Remainder: 13 - 8 = 5
- 5 >= 4? Yes. Write **1**. Remainder: 5 - 4 = 1
- 1 >= 2? No. Write **0**.
- 1 >= 1? Yes. Write **1**. Remainder: 0

Result: **45 = 101101**

{{< drg/image src="images/binary-conversion-cheatsheet.avif" alt="A visual reference card showing the powers of 2 from 1 to 128 with worked examples of decimal-to-binary and binary-to-decimal conversions" >}}

{{< drg/tip >}}
Practice with numbers you know. Your age, your house number, the year you were born — convert them all to binary and back. The more you practice, the faster it gets. Many Scouts find that the place-value method feels more intuitive than the division method after a few tries.
{{< /drg/tip >}}

{{< drg/external-link
    title="RapidTables Binary-Decimal Converter"
    url="https://www.rapidtables.com/convert/number/binary-to-decimal.html"
    description="Online converter to check your work. Convert back and forth between binary and decimal to verify your manual calculations." >}}

{{< drg/next-page
    text="You can think in binary — now put theory into practice"
    teaser="by building a real working circuit for your counselor."
    url="/merit-badges/electronics/guide/req4c/" >}}
