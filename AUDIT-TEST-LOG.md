# AUDIT TEST LOG (Foundry Runtime)

Status: not started

Legend:
- PASS
- FAIL
- BLOCKED
- NOT RUN

## Scenario Results

| Scenario | Status | Expected | Actual | Notes |
|---|---|---|---|---|
| S01 Wedrowka bazowa 3 graczy | NOT RUN | All players contribute >=1, deal+reveal+resolve flow works | - | - |
| S02 Wedrowka z graczem bez kart | NOT RUN | No-hand player contributes via top-deck blind | - | - |
| S03 Blind cards limit | NOT RUN | Extra blind cards capped to player count | - | - |
| S04 Nadwyzka kart do Narratora | NOT RUN | Surplus cards can be revealed as narrator slots | - | - |
| S05 Czarny Joker cross-context | NOT RUN | BJ risk in initiative/journey/burn/top-deck contexts | - | - |
| S06 Walka remisy + tie-break + nowa runda | NOT RUN | Tie resolution and next-round starter flow | - | - |
| S07 Obrona i pancerz | NOT RUN | PT physical=max(Krzepa, Armor), 1 card=1 dmg blocked | - | - |
| S08 Wyzwanie grupowe i atak grupy | NOT RUN | Challenge sum and enemy-group attack parity | - | - |
| S09 Rytualy Zywiolow + Gwiazdy/Dzien Swiety | NOT RUN | Correct cost/fallback/risk behavior | - | - |
| S10 Rozwoj postaci | NOT RUN | Cost validations and bonuses | - | - |
| S11 Koniec misji | NOT RUN | Attribute reset + discard reshuffle, corruption unchanged | - | - |

## Notes

- This file is a runtime-only companion to AUDIT-RESULTS.md.
- Update rows immediately after each scenario execution.
