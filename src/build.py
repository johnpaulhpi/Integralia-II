"""Builds ../index.html (the whole game in one file) from the source files in this folder.

Usage, from inside the src folder:
    python3 build.py
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ORDER = ['engine.js', 'tex.js', 'specimens.js', 'hints.js', 'art.js',
         'game1.js', 'game2.js', 'explain.js', 'game3.js']

def read(name):
    with open(os.path.join(HERE, name), encoding='utf-8') as f:
        return f.read()

js = '\n'.join(read(f) for f in ORDER)
html = read('shell.html').replace('/*CSS*/', read('style.css')).replace('/*JS*/', js)
assert '</script' not in js.lower(), 'a script file contains </script>, which would break the page'

out = os.path.join(HERE, '..', 'index.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print(f'Wrote {os.path.normpath(out)} ({len(html) // 1024} KB)')
