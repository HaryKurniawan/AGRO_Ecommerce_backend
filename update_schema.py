import os
import re

schema_path = 'd:/PROJECT/AGRO_JABAR_SKRIPSI/ecommerce/backend/prisma/schema/ecommerce.prisma'
with open(schema_path, 'r', encoding='utf-8') as f:
    c = f.read()

# Model
c = c.replace('model InventarisToko {', 'model StokToko {')
c = c.replace('@@map("ecom_store_inventory")', '@@map("ecom_stok_toko")')
c = c.replace('inventaris          InventarisToko[]', 'stokToko          StokToko[]')
c = c.replace('inventarisToko      InventarisToko[]', 'stokToko      StokToko[]')

# ID replacement
c = re.sub(r'(model StokToko \{[\s\S]*?)(\n\s*)id(\s+String\s+@id)', r'\g<1>\g<2>id_stokToko\g<3>', c)

with open(schema_path, 'w', encoding='utf-8') as f:
    f.write(c)

print("Schema updated successfully.")
