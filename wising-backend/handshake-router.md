# Jurisdiction Router Handshake

## Overview
This document specifies the JSON schema that the `Layer 0 Router` (JurisdictionRouter) will send to the backend upon completion. The backend uses this data to instantiate the correct compliance modules for the user (India, US, Dual, or None).

## State Object: `router_state`

```json
{
    "profile": {
        "us_citizen": false,
        "us_green_card": false,
        "us_days": 0,
        "us_source_income": false
    },
    "flags": {
        "is_us": false,
        "is_india": true
    }
}
```

### Backend Action Items
1. Validate the incoming router state payload.
2. If `is_us` is `true` and `is_india` is `false`, flag the user's workspace as US-only.
3. If `is_us` is `false` and `is_india` is `true`, flag the user's workspace as India-only.
4. If both are `true`, instantiate a Dual Jurisdiction workspace.
