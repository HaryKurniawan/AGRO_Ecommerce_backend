import os
import re

b = 'd:/PROJECT/AGRO_JABAR_SKRIPSI/ecommerce/backend/src/'
for root, _, files in os.walk(b):
    for file in files:
        if file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                c = f.read()
            
            orig = c
            # specific field accesses
            c = re.sub(r'pengguna\.id(?!\w)', 'pengguna.id_pengguna', c)
            c = re.sub(r'pengguna\?\.id(?!\w)', 'pengguna?.id_pengguna', c)
            c = re.sub(r'req\.user\.id(?!\w)', 'req.user.id_pengguna', c)
            c = re.sub(r'req\.user\?\.id(?!\w)', 'req.user?.id_pengguna', c)
            c = re.sub(r'user\.id(?!\w)', 'user.id_pengguna', c)
            c = re.sub(r'user\?\.id(?!\w)', 'user?.id_pengguna', c)
            c = re.sub(r'konsumen\.id(?!\w)', 'konsumen.id_pengguna', c)
            c = re.sub(r'konsumen\?\.id(?!\w)', 'konsumen?.id_pengguna', c)
            c = re.sub(r'petugas\.id(?!\w)', 'petugas.id_pengguna', c)
            c = re.sub(r'petugas\?\.id(?!\w)', 'petugas?.id_pengguna', c)
            c = re.sub(r'kurir\.id(?!\w)', 'kurir.id_pengguna', c)
            c = re.sub(r'kurir\?\.id(?!\w)', 'kurir?.id_pengguna', c)
            c = re.sub(r'pengirim\.id(?!\w)', 'pengirim.id_pengguna', c)
            c = re.sub(r'pengirim\?\.id(?!\w)', 'pengirim?.id_pengguna', c)
            
            # prisma calls
            c = re.sub(r'prisma\.pengguna\.findUnique\(\{\s*where:\s*\{\s*id:', r'prisma.pengguna.findUnique({ where: { id_pengguna:', c)
            c = re.sub(r'prisma\.pengguna\.findFirst\(\{\s*where:\s*\{\s*id:', r'prisma.pengguna.findFirst({ where: { id_pengguna:', c)
            c = re.sub(r'prisma\.pengguna\.update\(\{\s*where:\s*\{\s*id:', r'prisma.pengguna.update({ where: { id_pengguna:', c)
            c = re.sub(r'prisma\.pengguna\.delete\(\{\s*where:\s*\{\s*id:', r'prisma.pengguna.delete({ where: { id_pengguna:', c)
            c = re.sub(r'prisma\.pengguna\.updateMany\(\{\s*where:\s*\{\s*id:', r'prisma.pengguna.updateMany({ where: { id_pengguna:', c)
            c = re.sub(r'prisma\.pengguna\.count\(\{\s*where:\s*\{\s*id:', r'prisma.pengguna.count({ where: { id_pengguna:', c)

            # select ids (heuristic)
            c = re.sub(r'pengguna:\s*\{\s*select:\s*\{\s*id:\s*true', 'pengguna: { select: { id_pengguna: true', c)
            c = re.sub(r'konsumen:\s*\{\s*select:\s*\{\s*id:\s*true', 'konsumen: { select: { id_pengguna: true', c)
            c = re.sub(r'petugas:\s*\{\s*select:\s*\{\s*id:\s*true', 'petugas: { select: { id_pengguna: true', c)
            c = re.sub(r'kurir:\s*\{\s*select:\s*\{\s*id:\s*true', 'kurir: { select: { id_pengguna: true', c)
            c = re.sub(r'pengirim:\s*\{\s*select:\s*\{\s*id:\s*true', 'pengirim: { select: { id_pengguna: true', c)

            if c != orig:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(c)

print('TS files updated')
