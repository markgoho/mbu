#!/usr/bin/env python3
"""Search local or remote PDFs page-by-page using pdftotext.

Examples:
  python3 scripts/search-pdf.py \
    "https://example.com/file.pdf" \
    "Scuba Diver's Code"

  python3 scripts/search-pdf.py \
    "https://example.com/file.pdf" \
    "Scuba Diver's Code" \
    --quiet

  python3 scripts/search-pdf.py \
    "hugo/static/pamphlets/example.pdf" \
    --query "Safe Swim Defense" \
    --context 120 \
    --ignore-case

  python3 scripts/search-pdf.py \
    "file.pdf" \
    --regex 'Scuba Diver.?s Code|S\\.A\\.F\\.E\\. diver'

  python3 scripts/search-pdf.py \
    "file.pdf" \
    --dump-pages 19-20

Normalized matching is enabled by default so common PDF punctuation and spacing
 differences do not cause false negatives.

Use --strict if you want exact matching against the extracted text instead.

By default, search mode prints page hits and then dumps the full text of matched pages.

Use --quiet to print only matched page numbers.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
import urllib.parse
import urllib.request
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


@dataclass
class SearchMatch:
    page: int
    excerpt: str
    match_text: str


def require_binary(name: str) -> None:
    if shutil.which(name) is None:
        print(f"error: required binary not found: {name}", file=sys.stderr)
        sys.exit(2)


def is_url(value: str) -> bool:
    parsed = urllib.parse.urlparse(value)
    return parsed.scheme in {"http", "https"}


def download_pdf(url: str, timeout: int) -> Path:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36",
            "Accept": "application/pdf,application/octet-stream;q=0.9,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        content_type = response.headers.get("Content-Type", "")
        if response.status != 200:
            raise RuntimeError(f"download failed with status {response.status}")
        if "pdf" not in content_type.lower() and not url.lower().endswith(".pdf"):
            raise RuntimeError(
                f"remote resource does not look like a PDF (content-type: {content_type or 'unknown'})"
            )

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as handle:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)
            return Path(handle.name)


def get_page_count(pdf_path: Path) -> int:
    result = subprocess.run(
        ["pdfinfo", str(pdf_path)],
        capture_output=True,
        text=True,
        check=True,
    )
    for line in result.stdout.splitlines():
        if line.startswith("Pages:"):
            _, value = line.split(":", 1)
            return int(value.strip())
    raise RuntimeError("could not determine page count from pdfinfo output")


def parse_pages(spec: str | None, total_pages: int) -> list[int]:
    if spec is None:
        return list(range(1, total_pages + 1))

    pages: set[int] = set()
    for part in spec.split(","):
        token = part.strip()
        if not token:
            continue
        if "-" in token:
            start_str, end_str = token.split("-", 1)
            start = int(start_str)
            end = int(end_str)
            if start > end:
                start, end = end, start
            pages.update(range(start, end + 1))
        else:
            pages.add(int(token))

    filtered = sorted(page for page in pages if 1 <= page <= total_pages)
    if not filtered:
        raise RuntimeError("page filter excluded all pages")
    return filtered


def extract_page_text(pdf_path: Path, page: int) -> str:
    result = subprocess.run(
        [
            "pdftotext",
            "-f",
            str(page),
            "-l",
            str(page),
            "-layout",
            "-nopgbrk",
            str(pdf_path),
            "-",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout


def dump_page_text(pdf_path: Path, pages: list[int]) -> list[dict[str, str | int]]:
    dumped: list[dict[str, str | int]] = []
    for page in pages:
        dumped.append({"page": page, "text": extract_page_text(pdf_path, page).strip()})
    return dumped


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def normalize_search_text(text: str, fuzzy: bool, ignore_case: bool) -> str:
    normalized = unicodedata.normalize("NFKC", text)
    if fuzzy:
        translation = str.maketrans(
            {
                "’": "'",
                "‘": "'",
                "´": "'",
                "`": "'",
                "“": '"',
                "”": '"',
                "–": "-",
                "—": "-",
                "‑": "-",
            }
        )
        normalized = normalized.translate(translation)
    normalized = normalize_whitespace(normalized)
    if ignore_case:
        normalized = normalized.casefold()
    return normalized


def compile_pattern(
    query: str,
    regex: bool,
    ignore_case: bool,
    fuzzy: bool,
) -> re.Pattern[str]:
    pattern_source = normalize_search_text(query, fuzzy=fuzzy, ignore_case=ignore_case)
    pattern = pattern_source if regex else re.escape(pattern_source)
    return re.compile(pattern)


def iter_matches(
    page_text: str,
    pattern: re.Pattern[str],
    context_chars: int,
    fuzzy: bool,
    ignore_case: bool,
) -> Iterable[tuple[str, str]]:
    normalized = normalize_search_text(page_text, fuzzy=fuzzy, ignore_case=ignore_case)
    if not normalized:
        return []

    results: list[tuple[str, str]] = []
    for match in pattern.finditer(normalized):
        start = max(0, match.start() - context_chars)
        end = min(len(normalized), match.end() + context_chars)
        excerpt = normalized[start:end].strip()
        if start > 0:
            excerpt = "…" + excerpt
        if end < len(normalized):
            excerpt = excerpt + "…"
        results.append((excerpt, match.group(0)))
    return results


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Search a local PDF or PDF URL page-by-page without reading the whole document into context."
    )
    parser.add_argument("pdf", help="Local PDF path or https:// URL")
    parser.add_argument("query", nargs="?", help="Literal query to search for")
    parser.add_argument("--query", dest="query_flag", help="Literal query to search for")
    parser.add_argument("--regex", help="Regex pattern to search for")
    parser.add_argument(
        "--ignore-case",
        action="store_true",
        help="Case-insensitive search",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Disable normalized matching and require strict extracted-text matching",
    )
    parser.add_argument(
        "--pages",
        help='Page filter like "3", "3-7", or "1,4,9-12"',
    )
    parser.add_argument(
        "--dump-pages",
        help='Print full extracted text for page list like "19" or "19-20"',
    )
    parser.add_argument(
        "--dump-matches",
        action="store_true",
        help="Legacy flag; matched pages are dumped by default in search mode",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Print only matched page numbers",
    )
    parser.add_argument(
        "--context",
        type=int,
        default=90,
        help="Characters of surrounding excerpt to include on each side (default: 90)",
    )
    parser.add_argument(
        "--max-results",
        type=int,
        default=20,
        help="Maximum matches to print (default: 20)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="Download timeout in seconds for URL input (default: 30)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit JSON output",
    )
    return parser


def main() -> int:
    require_binary("pdftotext")
    require_binary("pdfinfo")

    parser = build_parser()
    args = parser.parse_args()

    query = args.regex or args.query_flag or args.query
    if args.dump_pages is None and query is None:
        parser.error("provide a search term as a positional query, --query, or --regex, or use --dump-pages")
    if args.regex and (args.query_flag or args.query):
        parser.error("use either literal query input or --regex, not both")
    if args.dump_pages is not None and query is not None and not args.dump_matches:
        parser.error("use --dump-pages by itself, or use a query together with --dump-matches")

    pdf_input = args.pdf
    temp_pdf: Path | None = None

    try:
        if is_url(pdf_input):
            temp_pdf = download_pdf(pdf_input, args.timeout)
            pdf_path = temp_pdf
            source = pdf_input
        else:
            pdf_path = Path(pdf_input).expanduser().resolve()
            if not pdf_path.exists():
                raise RuntimeError(f"local file not found: {pdf_input}")
            source = str(pdf_path)

        total_pages = get_page_count(pdf_path)

        if args.dump_pages is not None:
            pages_to_dump = parse_pages(args.dump_pages, total_pages)
            dumped_pages = dump_page_text(pdf_path, pages_to_dump)
            if args.json:
                print(
                    json.dumps(
                        {
                            "source": source,
                            "dump_pages": pages_to_dump,
                            "total_pages": total_pages,
                            "pages": dumped_pages,
                        },
                        indent=2,
                    )
                )
                return 0

            print(f"Source: {source}")
            print(f"Dumped pages: {','.join(str(page) for page in pages_to_dump)} of {total_pages}")
            for page_entry in dumped_pages:
                print(f"\n===== PAGE {page_entry['page']} =====\n")
                print(page_entry["text"])
            return 0

        fuzzy = not args.strict
        pages = parse_pages(args.pages, total_pages)
        pattern = compile_pattern(
            query,
            regex=bool(args.regex),
            ignore_case=args.ignore_case,
            fuzzy=fuzzy,
        )

        matches: list[SearchMatch] = []
        for page in pages:
            page_text = extract_page_text(pdf_path, page)
            for excerpt, match_text in iter_matches(
                page_text,
                pattern,
                args.context,
                fuzzy=fuzzy,
                ignore_case=args.ignore_case,
            ):
                matches.append(SearchMatch(page=page, excerpt=excerpt, match_text=match_text))
                if len(matches) >= args.max_results:
                    break
            if len(matches) >= args.max_results:
                break

        matched_pages = sorted({match.page for match in matches})

        if args.json:
            print(
                json.dumps(
                    {
                        "source": source,
                        "query": query,
                        "regex": bool(args.regex),
                        "fuzzy": fuzzy,
                        "total_pages": total_pages,
                        "searched_pages": pages,
                        "match_count": len(matches),
                        "matched_pages": matched_pages,
                        "matches": [
                            {
                                "page": match.page,
                                "match_text": match.match_text,
                                "excerpt": match.excerpt,
                            }
                            for match in matches
                        ],
                    },
                    indent=2,
                )
            )
            return 0

        if not matches:
            if args.quiet:
                return 1
            searched_label = (
                f"{pages[0]}-{pages[-1]}"
                if pages == list(range(pages[0], pages[-1] + 1))
                else ",".join(str(p) for p in pages)
            )
            print(f"Source: {source}")
            print(f"Query: {query}")
            print(f"Pages searched: {searched_label} of {total_pages}")
            print("No matches found.")
            return 1

        if args.quiet:
            print(" ".join(str(page) for page in matched_pages))
            return 0

        searched_label = (
            f"{pages[0]}-{pages[-1]}"
            if pages == list(range(pages[0], pages[-1] + 1))
            else ",".join(str(p) for p in pages)
        )
        print(f"Source: {source}")
        print(f"Query: {query}")
        print(f"Pages searched: {searched_label} of {total_pages}")
        print(f"Matches: {len(matches)}")

        for index, match in enumerate(matches, start=1):
            wrapped = textwrap.fill(
                match.excerpt,
                width=100,
                initial_indent="    ",
                subsequent_indent="    ",
            )
            print(f"\n[{index}] Page {match.page}")
            print(wrapped)

        dumped_pages = dump_page_text(pdf_path, matched_pages)
        for page_entry in dumped_pages:
            print(f"\n===== PAGE {page_entry['page']} =====\n")
            print(page_entry["text"])

        return 0
    except subprocess.CalledProcessError as error:
        stderr = error.stderr.strip() if error.stderr else ""
        print(f"error: command failed: {' '.join(error.cmd)}", file=sys.stderr)
        if stderr:
            print(stderr, file=sys.stderr)
        return 2
    except Exception as error:  # noqa: BLE001
        print(f"error: {error}", file=sys.stderr)
        return 2
    finally:
        if temp_pdf is not None:
            try:
                temp_pdf.unlink(missing_ok=True)
            except OSError:
                pass


if __name__ == "__main__":
    raise SystemExit(main())
