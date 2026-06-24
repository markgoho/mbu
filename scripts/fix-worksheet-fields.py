#!/usr/bin/env python3
"""
Post-process a generated worksheet PDF:
- Strip AP (appearance streams) from multiline AcroForm widgets
- Set DA = /Helv 0 Tf 0 g on those fields (standard font, auto-shrink)
- Set NeedAppearances = true so viewers re-render fields dynamically

This produces the same field behavior as the usscouts.org worksheets:
font auto-shrinks as text fills the box, and text wraps within the field.
"""

import sys
import pikepdf

MULTILINE_FLAG = 4096  # bit 13 of /Ff

def fix_fields(path_in: str, path_out: str) -> None:
    with pikepdf.open(path_in) as pdf:
        # Ensure AcroForm exists
        if "/AcroForm" not in pdf.Root:
            pdf.save(path_out)
            return

        acroform = pdf.Root.AcroForm

        # Set NeedAppearances so viewers re-render from DA
        acroform.NeedAppearances = pikepdf.Boolean(True)

        # Walk all annotations on all pages
        for page in pdf.pages:
            if "/Annots" not in page:
                continue
            for annot in page.Annots:
                obj = annot
                # Must be a widget annotation for a text field
                if obj.get("/Subtype") != pikepdf.Name("/Widget"):
                    continue
                if obj.get("/FT") != pikepdf.Name("/Tx"):
                    # Ff might be on parent field — check parent
                    parent = obj.get("/Parent")
                    if parent is None or parent.get("/FT") != pikepdf.Name("/Tx"):
                        continue
                    ff_source = parent
                else:
                    ff_source = obj

                ff = int(ff_source.get("/Ff", 0))
                if not (ff & MULTILINE_FLAG):
                    continue

                # It's a multiline text widget — patch it
                if "/AP" in obj:
                    del obj["/AP"]
                # Set DA on the widget (overrides any inherited value)
                obj["/DA"] = pikepdf.String("/Helv 0 Tf 0 g")

        # Also walk AcroForm Fields array to patch field-level DAs
        def walk_fields(fields):
            for field_ref in fields:
                field = field_ref
                ff = int(field.get("/Ff", 0))
                ft = field.get("/FT")
                if ft == pikepdf.Name("/Tx") and (ff & MULTILINE_FLAG):
                    field["/DA"] = pikepdf.String("/Helv 0 Tf 0 g")
                kids = field.get("/Kids", [])
                walk_fields(kids)

        if "/Fields" in acroform:
            walk_fields(acroform.Fields)

        pdf.save(path_out)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} input.pdf output.pdf")
        sys.exit(1)
    fix_fields(sys.argv[1], sys.argv[2])
    print(f"Patched: {sys.argv[2]}")
