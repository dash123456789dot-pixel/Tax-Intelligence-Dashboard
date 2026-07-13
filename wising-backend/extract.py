import os
content = open(r'i:\Stocksy\Tax Intellligence\Tax-Intelligence-Dashboard\manual testing\Router-backend_persistence_testing.md', 'r', encoding='utf-8').read()

current_file = None
in_code_block = False
code_content = []

for line in content.split('\n'):
    if line.startswith('### File: `'):
        current_file = line.split('`')[1].strip()
    elif (line.startswith('```python') or line.startswith('```typescript')) and current_file:
        in_code_block = True
        code_content = []
    elif line.startswith('```') and in_code_block:
        in_code_block = False
        if current_file:
            path = os.path.join(r'i:\Stocksy\Tax Intellligence\Tax-Intelligence-Dashboard', current_file)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(code_content))
            print('Wrote', path)
            current_file = None
    elif in_code_block:
        code_content.append(line)
