---
title: "Algebraic Notation"
layout: guide
group_title: "4. Mastering the Game"
req_number: "4a"
prev: "/merit-badges/chess/guide/req3d/"
prev_title: "Five Ways to Draw"
next: "/merit-badges/chess/guide/req4b/"
next_title: "Opening, Middle & Endgame"
---

{{< drg/requirement number="4a" >}}
Demonstrate scorekeeping using the algebraic system of chess notation.
{{< /drg/requirement >}}

Every serious chess game is recorded move by move. Algebraic notation is the universal language for writing down chess moves — once you learn it, you can read games played by grandmasters, record your own games for review, and communicate positions with anyone in the world.

## The Coordinate System

Think of the chessboard as a grid. Each square has a unique name made up of a **letter** (the column, called a "file") and a **number** (the row, called a "rank"):

- **Files** are labeled **a** through **h**, from White's left to right.
- **Ranks** are labeled **1** through **8**, from White's side to Black's side.

So the bottom-left square (from White's perspective) is **a1**, and the top-right square is **h8**. White's king starts on **e1**; Black's king starts on **e8**.

```
8  ·  ·  ·  ·  ·  ·  ·  ·
7  ·  ·  ·  ·  ·  ·  ·  ·
6  ·  ·  ·  ·  ·  ·  ·  ·
5  ·  ·  ·  ·  ·  ·  ·  ·
4  ·  ·  ·  ·  ·  ·  ·  ·
3  ·  ·  ·  ·  ·  ·  ·  ·
2  ·  ·  ·  ·  ·  ·  ·  ·
1  ·  ·  ·  ·  ·  ·  ·  ·
   a  b  c  d  e  f  g  h
```

{{< drg/tip >}}
Practice naming squares by pointing to random squares on a board and calling out their coordinates. Then try it in reverse: have a friend call out "f5" and you point to the correct square. Speed and accuracy with coordinates make notation second nature.
{{< /drg/tip >}}

## Writing Moves

Each move is written with the **piece symbol** followed by the **destination square**.

| Symbol | Piece |
|--------|-------|
| K | King |
| Q | Queen |
| R | Rook |
| B | Bishop |
| N | Knight |
| *(none)* | Pawn |

**Examples:**
- **e4** — a pawn moves to e4 (no letter for pawns)
- **Nf3** — a knight moves to f3
- **Bb5** — a bishop moves to b5
- **Qd7** — the queen moves to d7
- **O-O** — kingside castling
- **O-O-O** — queenside castling

### Captures

Use an **x** between the piece symbol and the destination square:
- **Bxf7** — a bishop captures on f7
- **exd5** — a pawn on the e-file captures on d5 (for pawn captures, include the file the pawn came from)

### Special Symbols

| Symbol | Meaning |
|--------|---------|
| **x** | Capture |
| **+** | Check |
| **#** | Checkmate |
| **=Q** | Pawn promotion to queen (or =R, =B, =N) |
| **e.p.** | En passant (optional — many players just write the move) |
| **!** | Good move |
| **?** | Mistake |
| **!!** | Brilliant move |
| **??** | Blunder |

{{< drg/did-you-know >}}
The notation system used today was standardized in the 1970s. Before that, many countries used "descriptive notation," which named squares relative to each side (e.g., "P-K4" for "Pawn to King 4"). Algebraic notation is simpler because every square has one fixed name regardless of which side you are playing.
{{< /drg/did-you-know >}}

## Recording a Game: The Score Sheet

In tournaments, players are required to record every move on a **score sheet**. Each move is numbered, with White's move first and Black's move second:

```
1. e4    e5
2. Nf3   Nc6
3. Bb5   a6
4. Ba4   Nf6
5. O-O   Be7
```

This is the opening of a real game — the **Ruy Lopez**, one of the oldest and most popular chess openings. You will learn more about it in [Req 4c](/merit-badges/chess/guide/req4c/).

## Disambiguating Moves

Sometimes two pieces of the same type can move to the same square. In that case, include extra information to clarify which piece moved:

- **Rae1** — the rook on the a-file moves to e1 (to distinguish it from the rook on, say, f1)
- **N5d4** — the knight on the 5th rank moves to d4 (to distinguish it from a knight on, say, f3)
- **Raxd1** — the rook on the a-file captures on d1

## Practice Exercise

Here is a short game (Scholar's Mate — you will study this in [Req 4d](/merit-badges/chess/guide/req4d/)). Practice reading it move by move:

```
1. e4    e5
2. Bc4   Nc6
3. Qh5   Nf6??
4. Qxf7#
```

Read it aloud: "One, pawn to e4, pawn to e5. Two, bishop to c4, knight to c6. Three, queen to h5, knight to f6 — blunder. Four, queen takes f7, checkmate."

{{< drg/image src="images/chess-score-sheet.avif" alt="Close-up photograph of a chess tournament score sheet partially filled out with algebraic notation, a pen resting on the paper" >}}

{{< drg/checklist title="Notation Skills to Demonstrate" subtitle="Your counselor will want to see you can do all of these" >}}
- Name any square on the board by its coordinates.
- Write moves using correct piece symbols and destination squares.
- Record captures with the "x" symbol.
- Note check (+) and checkmate (#) correctly.
- Record castling as O-O or O-O-O.
- Record at least one complete game on a score sheet.
{{< /drg/checklist >}}

{{< drg/external-link
    title="Lichess — Learn Chess Notation"
    url="https://lichess.org/learn#/15"
    description="Interactive notation trainer that tests your ability to identify squares and read algebraic notation." >}}

Now that you can read and write the language of chess, let's explore the three phases that every game passes through.

{{< drg/next-page
    text="Now that you can record chess moves"
    teaser="Learn the three phases of a chess game and how to approach each one."
    url="/merit-badges/chess/guide/req4b/" >}}
