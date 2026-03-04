---
title: "Req 5c — Checkmate with Major Pieces"
layout: guide
group_title: "Tactics & Endgames"
req_number: "5c"
prev: "/merit-badges/chess/guide/req5b/"
prev_title: "Req 5b — Chess Tactics"
next: "/merit-badges/chess/guide/req5d/"
next_title: "Req 5d — King & Pawn Endgames"
---

{{< drg/requirement number="5c" >}}
Set up a chessboard as follows and with White to move first, demonstrate how to force checkmate on the Black king:
{{< /drg/requirement >}}

This requirement tests three essential endgame checkmates. Each position has White forcing checkmate against a lone Black king. These are fundamental skills — if you reach an endgame with a queen or rooks, you *must* know how to finish the job.

## Position 1: Two Rooks vs. King

{{< drg/requirement number="5c1" >}}
White on e1, the White rooks on a1 and h1, and the Black king on e5.
{{< /drg/requirement >}}

**Setup**: White King e1, White Rooks a1 and h1, Black King e5.

### The Technique: The Staircase (Lawnmower)

With two rooks, you use a pattern called the **staircase** or **lawnmower**. The rooks take turns cutting off ranks, pushing the enemy king toward the edge of the board.

**How it works:**

1. One rook controls a rank, preventing the king from crossing back.
2. The other rook checks the king on the next rank, driving it further toward the edge.
3. They alternate, "mowing" the king to the 8th (or 1st) rank.
4. Once the king is on the edge, one rook delivers checkmate while the other covers the escape squares.

**Key principle**: The two rooks work together without needing help from the White king. Each rook controls an entire rank. The Black king is progressively confined to a smaller and smaller area until checkmate is delivered on the edge.

{{< drg/tip >}}
If the Black king attacks one of your rooks, simply move that rook to the other side of the board (staying on the same rank). The king cannot chase both rooks at once. This is sometimes called "the rook dance."
{{< /drg/tip >}}

## Position 2: Queen vs. King

{{< drg/requirement number="5c2" >}}
White King on e1, White queen on d1, Black king on e5.
{{< /drg/requirement >}}

**Setup**: White King e1, White Queen d1, Black King e5.

### The Technique: Box and Approach

The queen is powerful enough to confine the enemy king alone, but she **cannot deliver checkmate without the king's help**. The technique has two steps:

**Step 1 — Build the box.** Use the queen to restrict the Black king to a smaller and smaller area of the board. The queen can control an entire rank, file, or diagonal, so she can single-handedly push the king toward the edge.

**Step 2 — Bring up the king.** Once the enemy king is near the edge, march your own king toward it. You need your king to support the queen in delivering the final checkmate.

**Step 3 — Deliver checkmate.** With the enemy king on the edge and your king nearby, the queen delivers checkmate on the rank or file next to the enemy king, supported by your own king.

{{< drg/safety-first >}}
Be careful not to stalemate! A queen is so powerful that she can accidentally take away *all* of the enemy king's legal moves without giving check. Before each queen move, mentally check: "Does the enemy king still have at least one legal move, or am I giving check?" If the answer is "no moves and no check," it is stalemate — a draw instead of a win.
{{< /drg/safety-first >}}

## Position 3: Rook vs. King

{{< drg/requirement number="5c3" >}}
White king on e1, White rook on a1, Black king on e5.
{{< /drg/requirement >}}

**Setup**: White King e1, White Rook a1, Black King e5.

### The Technique: Opposition and Edge

This is the most challenging of the three, because a single rook cannot confine the king as easily as two rooks or a queen. Your king must actively participate throughout.

**Step 1 — Use opposition.** The White king must march toward the Black king and achieve **opposition** — placing the two kings directly across from each other with one square between them. When kings are in opposition, the player who must move is at a disadvantage (a form of zugzwang from [Req 5b](/merit-badges/chess/guide/req5b/)).

**Step 2 — Cut off the king.** Use the rook to control a file or rank that prevents the Black king from escaping toward the center. The rook acts as a wall while the White king pushes the Black king toward the edge.

**Step 3 — Drive to the edge.** Alternate between gaining opposition with your king and using the rook to check or cut off the enemy king. Gradually force it to the edge of the board.

**Step 4 — Deliver checkmate.** With the enemy king on the edge and your king controlling escape squares, the rook delivers checkmate along the edge rank or file.

{{< drg/did-you-know >}}
King and rook vs. king is a forced checkmate in at most 16 moves from any starting position. It takes patience and technique, but if you follow the method, checkmate is guaranteed.
{{< /drg/did-you-know >}}

## Practice Tips

{{< drg/checklist title="Checkmate Practice" subtitle="Master these endgames on a real board" >}}
- Practice each position at least five times until the technique feels automatic.
- Time yourself: two-rook mate should take under 15 moves, queen mate under 10, rook mate under 20.
- Practice against a friend who tries to make it as difficult as possible for you (moving the king toward the center, avoiding the edges).
- Try the Lichess endgame practice tool (linked below) which plays the losing side perfectly and counts your moves.
{{< /drg/checklist >}}

{{< drg/image src="images/chess-rook-checkmate.avif" alt="Chess board diagram showing the final checkmate position with king and rook versus king, with the rook delivering checkmate along the 8th rank" >}}

{{< drg/external-link
    title="Lichess — Endgame Practice: Checkmate Patterns"
    url="https://lichess.org/practice/checkmate-patterns/piece-checkmates-ii/WOgEJMRp/Rg4JhUcP"
    description="Practice king + queen, king + rook, and king + two rooks vs. king with interactive feedback on every move." >}}

Now let's study a more subtle endgame skill: king and pawn endings where promotion and opposition decide everything.

{{< drg/next-page
    text="Now that you can force checkmate"
    teaser="Learn how kings and pawns battle for promotion in critical endgame positions."
    url="/merit-badges/chess/guide/req5d/" >}}
