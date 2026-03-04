---
title: "Req 3c — How Pieces Move & Capture"
layout: guide
group_title: "Know Your Pieces"
req_number: "3c"
prev: "/merit-badges/chess/guide/req3b/"
prev_title: "Req 3b — Setting Up the Board"
next: "/merit-badges/chess/guide/req3d/"
next_title: "Req 3d — Five Ways to Draw"
---

{{< drg/requirement number="3c" >}}
How each chess piece moves and captures, including: four rules of castling, en passant captures, pawn promotion, check, ways to get out of check, and checkmate.
{{< /drg/requirement >}}

This is one of the most content-heavy requirements in the Chess merit badge. You need to understand how every piece moves, how it captures, and all the special rules that make chess so rich. Let's work through each one.

## Basic Movement and Capture

In [Req 3a](/merit-badges/chess/guide/req3a/), you learned the names of the six pieces. Here is exactly how each one moves and captures:

| Piece | Movement | Captures |
|-------|----------|----------|
| **King** | One square in any direction | Same as movement |
| **Queen** | Any number of squares horizontally, vertically, or diagonally | Same as movement |
| **Rook** | Any number of squares horizontally or vertically | Same as movement |
| **Bishop** | Any number of squares diagonally | Same as movement |
| **Knight** | "L" shape: 2+1 squares; can jump over pieces | Same as movement |
| **Pawn** | Forward one square (or two on first move) | One square diagonally forward |

Most pieces capture the same way they move — by landing on a square occupied by an opponent's piece. The pawn is the exception: it moves straight ahead but captures diagonally.

{{< drg/tip >}}
No piece (except the knight) can jump over other pieces. If a bishop's diagonal is blocked by a friendly pawn, the bishop cannot pass through it. Plan your development so pieces do not block each other.
{{< /drg/tip >}}

## Special Rules

### Castling

Castling is a unique move that involves the **king and a rook** moving simultaneously. It is the only move in chess where two pieces move at once. Castling helps protect your king and activate your rook.

**How it works:**
- **Kingside castling (O-O)**: The king moves two squares toward the h-rook, and the rook jumps over the king to the adjacent square. White: Ke1→g1 and Rh1→f1.
- **Queenside castling (O-O-O)**: The king moves two squares toward the a-rook, and the rook jumps over the king. White: Ke1→c1 and Ra1→d1.

**The four rules of castling** — all four must be true:

1. **Neither the king nor the chosen rook has moved** previously in the game.
2. **No pieces** stand between the king and the rook.
3. **The king is not in check.** You cannot castle out of check.
4. **The king does not pass through or land on a square attacked** by an opponent's piece.

{{< drg/did-you-know >}}
You can still castle even if the rook is under attack, or if the rook passes through an attacked square. The restrictions about attacked squares apply only to the king, not the rook.
{{< /drg/did-you-know >}}

### En Passant

**En passant** (French for "in passing") is a special pawn capture that catches many beginners by surprise.

**When it happens**: If a pawn advances two squares from its starting position and lands beside an opponent's pawn, the opponent's pawn can capture it **as if it had moved only one square**. The capturing pawn moves diagonally forward to the square the advancing pawn passed through, and the advancing pawn is removed.

**Critical rule**: En passant can **only be done on the very next move** after the two-square advance. If you do not capture en passant immediately, you lose the right to do so.

### Pawn Promotion

When a pawn reaches the **opposite end of the board** (the 8th rank for White, the 1st rank for Black), it must immediately be **promoted** to any piece the player chooses: queen, rook, bishop, or knight. The pawn cannot remain a pawn, and it cannot become a king.

Nearly all promotions are to a queen (called "queening"), since the queen is the most powerful piece. However, promoting to a knight — called "underpromotion" — is occasionally the right move when the knight delivers an immediate check or fork that a queen could not.

{{< drg/tip >}}
Yes, you can have two queens (or more!) on the board at the same time. There is no limit to how many of any piece you can have through promotion.
{{< /drg/tip >}}

## Check, Getting Out of Check, and Checkmate

### Check

A king is **in check** when it is attacked by an opponent's piece — meaning the opponent could capture the king on the next move. When your king is in check, you **must** get out of check on your very next move. You cannot ignore check or make a different move.

### Three Ways to Get Out of Check

There are exactly three ways to escape check:

1. **Move the king** to a square that is not attacked.
2. **Block the check** by placing one of your pieces between the attacking piece and your king. (This does not work against knight checks or contact checks — you cannot block an L-shaped attack.)
3. **Capture the attacking piece.** If you can take the piece that is giving check, the threat is eliminated.

If none of these three options is possible, it is **checkmate**.

### Checkmate

Checkmate means the king is in check and there is **no legal way to escape**. The king cannot move to a safe square, no piece can block the attack, and no piece can capture the attacker. When this happens, the game is over — the side that delivered checkmate wins.

{{< drg/image src="images/chess-checkmate-example.avif" alt="Chess board diagram showing a back-rank checkmate with a rook delivering checkmate to a king trapped by its own pawns" >}}

{{< drg/be-prepared title="The Check-Check-Checkmate Confusion" >}}
New players sometimes confuse these terms:

- **Check**: "Your king is in danger — you must fix it this move."
- **Checkmate**: "Your king is in danger and there is no fix — the game is over."
- **Stalemate**: "Your king is NOT in danger, but you have no legal moves" (this is a draw, not a win — see [Req 3d](/merit-badges/chess/guide/req3d/)).

When teaching someone, emphasize that check is a warning, checkmate is the end, and stalemate is neither.
{{< /drg/be-prepared >}}

## Teaching These Rules with EDGE

This requirement asks you to teach all of this to someone new. This is a lot of material, so break it into sessions:

1. **Session 1**: Basic movement of all six pieces. Let them practice moving each piece on an empty board.
2. **Session 2**: Capturing. Set up practice positions and have them find all possible captures.
3. **Session 3**: Special rules — castling, en passant, pawn promotion. These are the rules that feel "weird" to beginners, so give extra practice time.
4. **Session 4**: Check, escaping check, and checkmate. Set up simple checkmate positions for them to recognize.

{{< drg/external-link
    title="Lichess Interactive Lessons — Piece Movement"
    url="https://lichess.org/learn#/3"
    description="Free interactive exercises for learning how each piece moves and captures, with immediate visual feedback." >}}

With all the rules under your belt, there is one more important topic to cover: how a game can end without anyone winning.

{{< drg/next-page
    text="Now that you know how every piece moves"
    teaser="Learn the five ways a chess game can end in a draw."
    url="/merit-badges/chess/guide/req3d/" >}}
