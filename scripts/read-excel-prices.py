"""Stdout: JSON array of price rows from Tabela Cene.xlsx."""
import json
import sys

import openpyxl

path = sys.argv[1] if len(sys.argv) > 1 else r"D:\Cursor_AI\Sima sajt dokumenti\Tabela Cene.xlsx"
wb = openpyxl.load_workbook(path, read_only=True)
ws = wb.active
out = []
for sheet_row, r in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
    if r[2] is None:
        continue
    malo = r[5]
    if malo is None or not isinstance(malo, (int, float)):
        continue
    nabavna = None
    if isinstance(r[4], (int, float)):
        nabavna = float(r[4])
    out.append(
        {
            "sheetRow": sheet_row,
            "velicine": r[0],
            "redni": r[1],
            "broj": str(r[2]).strip(),
            "naziv": str(r[3]).strip() if r[3] else "",
            "nabavna": nabavna,
            "maloprodajna": float(malo),
        }
    )
print(json.dumps(out))
