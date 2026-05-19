from pathlib import Path
import re
p=Path('backend/db/dll_estructura_app_final.sql')
s=p.read_text(encoding='utf-8')

s2 = re.sub(r"DROP TABLE IF EXISTS public\.(\w+) CASCADE;\nCREATE TABLE public\.\1",
            lambda m: f"DROP TYPE IF EXISTS public.{m.group(1)} CASCADE;\nDROP TABLE IF EXISTS public.{m.group(1)} CASCADE;\nCREATE TABLE public.{m.group(1)}",
            s)

out = Path('backend/db/dll_estructura_app_final2.sql')
out.write_text(s2,encoding='utf-8')
print(f'Wrote {out}')
