import json
import sys
import os

sys.path.insert(0, os.path.realpath("."))

from sqlalchemy.inspection import inspect
import db.models.layer1 as layer1_models

def get_columns(model):
    try:
        return [c.name for c in inspect(model).columns]
    except Exception:
        return []

schema_dict = {}

# List of models to extract
models_to_extract = [
    'RouterSession',
    'QuarterEntry',
    'ProfileData',
    'ResidencyData',
    'ResidencyTrip',
    'SalaryData',
    'SalaryEsopEvent',
    'HousePropertyData',
    'HouseProperty',
    'BusinessData',
    'BusinessEntry',
    'BusinessPartnerFirm',
    'BusinessGoodsVehicle',
    'CapitalGainsData',
    'CapitalGainsProperty',
    'CapitalGainsPropertyImprovement',
    'CapitalGainsBuyback',
    'CapitalGainsFinancialTx',
    'CapitalGainsCommodityTx',
    'CapitalGainsUnlistedTx',
    'OtherSourcesData',
    'ForeignAssetsData',
    'ForeignAssetRow',
    'DtaaData',
    'DtaaElection',
    'ComplianceData',
    'BankAccountsData',
    'BankAccountRow',
    'DeductionsData',
    'Deductions80GRow',
    'LossesAndCreditsData',
    'BroughtForwardLoss'
]

for model_name in models_to_extract:
    model = getattr(layer1_models, model_name, None)
    if model:
        schema_dict[model_name] = get_columns(model)

with open('layer1_india_schema.json', 'w') as f:
    json.dump(schema_dict, f, indent=4)

print("Created layer1_india_schema.json")
