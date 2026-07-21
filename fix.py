import re

with open('src/components/layer1india/CapitalGainsStep.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace select className
content = re.sub(r'(<select\b[^>]*?className=[\'"])([^\'"]*)([\'"])', lambda m: m.group(1) + m.group(2) + ' [color-scheme:dark]' + m.group(3) if '[color-scheme:dark]' not in m.group(2) else m.group(0), content)

# Replace input date className
content = re.sub(r'(<input\b[^>]*?type=[\'"]date[\'"][^>]*?className=[\'"])([^\'"]*)([\'"])', lambda m: m.group(1) + m.group(2) + ' [color-scheme:dark]' + m.group(3) if '[color-scheme:dark]' not in m.group(2) else m.group(0), content)

# Replace input date className if className comes first
content = re.sub(r'(<input\b[^>]*?className=[\'"])([^\'"]*)([\'"][^>]*?type=[\'"]date[\'"])', lambda m: m.group(1) + m.group(2) + ' [color-scheme:dark]' + m.group(3) if '[color-scheme:dark]' not in m.group(2) else m.group(0), content)

with open('src/components/layer1india/CapitalGainsStep.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced!")
