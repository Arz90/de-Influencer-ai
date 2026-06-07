"""
Generates minimal placeholder PNG icons for De-Influencer AI.
Color: #0d0d0d (extension brand background).
Replace with real assets in Phase 5.
"""
import struct, zlib, os

def make_png(size, r, g, b):
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    raw_rows = b''.join(b'\x00' + bytes([r, g, b] * size) for _ in range(size))
    idat_data = zlib.compress(raw_rows)

    return (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', ihdr_data)
        + chunk(b'IDAT', idat_data)
        + chunk(b'IEND', b'')
    )

os.makedirs('icons', exist_ok=True)

for size in [16, 32, 48, 128]:
    path = f'icons/icon{size}.png'
    with open(path, 'wb') as f:
        f.write(make_png(size, 13, 13, 13))  # #0d0d0d
    print(f'Created {path}')
