"""Build the portable Windows ZIP after npm run build."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parents[1]
with ZipFile(root / 'downloads/dragonbornink-local-windows.zip', 'w', ZIP_DEFLATED) as archive:
    for file in sorted((root / 'dist').rglob('*')):
        if file.is_file() and file.name not in {'dashboard.js', 'dashboard.css', '_routes.json', '_redirects'}:
            archive.write(file, file.relative_to(root / 'dist'))
    for file in sorted((root / 'local-launcher').iterdir()):
        if file.is_file():
            archive.write(file, file.name)
