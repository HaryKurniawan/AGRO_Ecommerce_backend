import os
import re

b = 'd:/PROJECT/AGRO_JABAR_SKRIPSI/ecommerce/backend/src/'
for root, _, files in os.walk(b):
    for file in files:
        if file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                c = f.read()
            if 'InventarisToko' in c or 'inventarisToko' in c or 'Inventaris' in c or 'inventaris' in c:
                orig = c
                c = c.replace('InventarisToko', 'StokToko')
                c = c.replace('inventarisToko', 'stokToko')
                
                # Careful with just 'inventaris' but since we changed the schema relation from `inventaris` to `stokToko` on Toko
                c = re.sub(r'toko\.inventaris(?!\w)', 'toko.stokToko', c)
                c = re.sub(r'toko\?\.inventaris(?!\w)', 'toko?.stokToko', c)
                
                c = re.sub(r'stokToko\.id(?!\w)', 'stokToko.id_stokToko', c)
                c = re.sub(r'stokToko\?\.id(?!\w)', 'stokToko?.id_stokToko', c)

                # prisma.stokToko.findUnique({ where: { id: 
                c = re.sub(r'prisma\.stokToko\.findUnique\(\{\s*where:\s*\{\s*id:', r'prisma.stokToko.findUnique({ where: { id_stokToko:', c)
                c = re.sub(r'prisma\.stokToko\.update\(\{\s*where:\s*\{\s*id:', r'prisma.stokToko.update({ where: { id_stokToko:', c)
                c = re.sub(r'prisma\.stokToko\.delete\(\{\s*where:\s*\{\s*id:', r'prisma.stokToko.delete({ where: { id_stokToko:', c)

                if c != orig:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(c)

print("TS files updated successfully.")
