import re

file_path = r'i:\Stocksy\Tax Intellligence\Tax-Intelligence-Dashboard\wising-backend\alembic\versions\6ea768ee3c45_add_client_id_and_missing_layer_1_.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix uq_quarter_entry
content = content.replace("    op.drop_constraint(op.f('uq_quarter_entry'), 'quarter_entries', type_='unique')\n    op.drop_constraint('uq_quarter_entry', 'quarter_entries', type_='unique')", "    op.drop_constraint('uq_quarter_entry', 'quarter_entries', type_='unique')")

# Fix uq_router_session
content = content.replace("    op.drop_constraint('uq_router_session', 'router_sessions', type_='unique')\n    op.drop_constraint('uq_router_session', 'router_sessions', type_='unique')", "    op.drop_constraint('uq_router_session', 'router_sessions', type_='unique')")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed duplicates.")
