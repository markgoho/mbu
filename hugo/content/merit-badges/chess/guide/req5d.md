---
title: "Req 5d — King & Pawn Endgames"
layout: guide
group_title: "Tactics & Endgames"
req_number: "5d"
prev: "/merit-badges/chess/guide/req5c/"
prev_title: "Req 5c — Checkmate with Major Pieces"
next: "/merit-badges/chess/guide/req5e/"
next_title: "Req 5e — Solving Mate Problems"
---

{{< drg/requirement number="5d" >}}
With White king on d4, White pawn on e3, and Black king on e6:
{{< /drg/requirement >}}

This requirement teaches you the most important concept in king-and-pawn endgames: **opposition**. The same starting position produces completely different results depending on who moves first — a perfect demonstration of zugzwang.

## The Setup

```
8  · · · · · · · ·
7  · · · · · · · ·
6  · · · · ♚ · · ·
5  · · · · · · · ·
4  · · · ♔ · · · ·
3  · · · · ♙ · · ·
2  · · · · · · · ·
1  · · · · · · · ·
   a b c d e f g h
```

White King on d4, White Pawn on e3, Black King on e6.

## What Is Opposition?

When two kings stand on the same file or rank with exactly **one square between them**, they are in **opposition**. The player whose turn it is to move is at a disadvantage — they must step aside, allowing the other king to advance.

In this position, with one square separating the kings on the d- and e-files, opposition determines everything.

## Position 1: White to Move — White Wins

{{< drg/requirement number="5d1" >}}
With White to move, demonstrate how White can force Black to allow his pawn to reach the last rank and be promoted to a queen.
{{< /drg/requirement >}}

When White moves first, White can outmaneuver Black and escort the pawn to promotion.

### The Technique

The key is for the White king to advance **in front of the pawn**, gaining opposition and pushing the Black king back.

1. **Ke4** — White advances the king. Now the kings are on the same rank, separated by one square on the e-file. It is Black's turn, so Black has the opposition disadvantage.
2. Black must move aside (e.g., **...Kd6** or **...Kf6**). Either way, the White king gains ground.
3. White continues advancing the king in front of the pawn, maintaining opposition whenever possible.
4. Once the White king reaches the 6th rank in front of the pawn, promotion is guaranteed. The Black king cannot stop the pawn from queening.

**Key principle**: The king leads, the pawn follows. If the White king can reach the 6th rank in front of its pawn, the pawn promotes regardless of what Black does.

{{< drg/tip >}}
The phrase "king in front of the pawn on the 6th rank" is the golden rule of king-and-pawn endgames. Memorize it. If your king is on e6 and your pawn is on e5, your pawn will promote. If your king is *behind* the pawn, promotion is much harder or impossible.
{{< /drg/tip >}}

## Position 2: Black to Move — Black Draws

{{< drg/requirement number="5d2" >}}
With Black to move, demonstrate how Black can force a draw.
{{< /drg/requirement >}}

When Black moves first from the same position, Black can hold a draw by maintaining opposition.

### The Technique

1. **...Ke5!** — Black takes opposition directly. Now the kings face each other on the e-file with one square between them, and it is *White's* turn — so White is at the zugzwang disadvantage.
2. White must step aside. If White plays **Kd3**, Black plays **...Kd5**, maintaining direct opposition. If White plays **Ke4**, the kings are on the same rank and Black mirrors with **...Ke6**.
3. White eventually advances the pawn (e.g., **e4**), but Black keeps the opposition and blocks the White king from reaching the 6th rank in front of the pawn.
4. The game results in stalemate or the Black king blockading the pawn — a draw.

**Key principle**: The defender draws by maintaining opposition. As long as the Black king stands directly in front of the White king when it is White's turn to move, White cannot make progress.

{{< drg/did-you-know >}}
This single concept — opposition in king-and-pawn endgames — has decided thousands of tournament games at every level, from beginners to world championship matches. Capablanca once said that understanding endgames like this one is more valuable than memorizing dozens of opening variations.
{{< /drg/did-you-know >}}

## Why It Works: Zugzwang in Action

Both positions demonstrate **zugzwang** — the compulsion to move that puts you at a disadvantage. In the starting position:

- When **White moves first**, White can advance (Ke4), and Black is forced to step aside, giving White's king access to critical squares.
- When **Black moves first**, Black takes opposition (Ke5), and White is forced to step aside or push the pawn prematurely, allowing Black to maintain the blockade.

The same position, the same pieces — but **who moves first** determines the result. This is what makes king-and-pawn endgames so fascinating.

{{< drg/image src="images/chess-king-pawn-opposition.avif" alt="Chess board diagram showing the opposition position with White king on d4, White pawn on e3, and Black king on e6" >}}

## Practice

{{< drg/checklist title="King & Pawn Endgame Practice" subtitle="Drill these positions until they are automatic" >}}
- Set up the position and practice White winning (White moves first) at least three times.
- Set up the same position and practice Black drawing (Black moves first) at least three times.
- Try variations: what if Black does NOT take opposition? Show that White wins even more easily.
- Practice with the pawn on different files (not just e3) — the principles are the same.
{{< /drg/checklist >}}

{{< drg/external-link
    title="Lichess — King and Pawn Endgame Practice"
    url="https://lichess.org/practice/pawn-endgames/opposition/MlMNMVad/R8R0cqLK"
    description="Interactive exercises on opposition and king-and-pawn endgames, with the computer playing optimal defense." >}}

One more endgame skill to go: solving direct-mate puzzles that test your ability to find forcing sequences.

{{< drg/next-page
    text="Now that you understand opposition"
    teaser="Sharpen your calculation skills by solving mate-in-X puzzles."
    url="/merit-badges/chess/guide/req5e/" >}}
