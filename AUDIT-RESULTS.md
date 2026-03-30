# NGH System — Świeży Audyt Zgodności z Regułami
**Data:** 2025-07 (re-audit od zera)  
**Podstawa reguł:** `rules.md` (§1–§10, pełna lektura)  
**Kod:** pełna lektura wszystkich plików źródłowych TS + szablonów HTML

---

## Legenda

| Status | Znaczenie |
|--------|-----------|
| ZGODNE | Reguła zaimplementowana w pełni i poprawnie |
| CZESCIOWO | Reguła częściowo zaimplementowana; miękka luka |
| NIEZGODNE | Reguła nie jest spełniona; błąd krytyczny |
| BRAK | Reguła w ogóle nie istnieje w kodzie |

---

## Matryca A01–A35

### §1 Karty i talia

| ID | Reguła | Status | Istotność | Plik(i) | Notatki |
|----|--------|--------|-----------|---------|---------|
| A01 | §1.1 — 2 talie przy 6+ graczach | **ZGODNE** | Wysoka | `shared-deck.ts` | `getRequiredDeckCopies()` → nieGM >= 6 → 2 kopie. `buildCanonicalDeck(copies)` mnoży 52+2 przez liczbę kopii. `ensureCanonicalDeck` i `rebuildDeck` używają `getCanonicalDeck()`. |
| A02 | §1.3 — Joker po zagraniu/odkryciu wraca do talii (+ przetasowanie) | **ZGODNE** | Wysoka | `shared-deck.ts`, `card-usage.ts` | `returnCardsFromHandToDeck` → `card.recall()` + `deck.shuffle()`. `returnJokerAfterCorruptionDraw` → `card.recall()` + `deck.shuffle()`. Wszystkie ścieżki: journey (ręka+topdeck), inicjatywa (ręka+topdeck), burn, rytuał elementarny, losowanie spaczenia — poprawnie przetasowują. |
| A03 | §1.3 — Czarny Joker → losowanie ryzyka spaczenia | **ZGODNE** | Wysoka | `card-usage.ts`, `actor-sheet.ts`, `journey-panel.ts` | Inicjatywa BJ: `useInitiativeCard` → `triggersCorruptionRisk:true` → `_doInitiativeCard` wywołuje `_doCorruptionRiskCheck`. Journey BJ (ręka+topDeck): `useJourneyCard` → flaga → `_doJourneyCard` wywołuje check. Burn BJ: `burnCards` → flaga → `_doBurnCard` wywołuje check. Rytuał elementarny BJ topDeck: `burnForElementalRitual` → flaga → `_doElementalRitual` wywołuje check. Odkrycie journey BJ (gracz): `_doRevealAllCards` automatycznie wywołuje `drawForCorruptionRisk` i aplikuje +1 do spaczenia. Odkrycie BJ w slocie GM: ostrzeżenie manualne w chacie. |
| A04 | §3.2 — Procedura losowania ryzyka spaczenia (prywatne topDeck, pętla jokera, czarna=+1) | **ZGODNE** | Wysoka | `card-usage.ts`, `actor-sheet.ts` | `drawForCorruptionRisk()`: topDeck (discard=true) → pętla max 10 razy: jeśli joker → `returnJokerAfterCorruptionDraw` + ponów; kończy z `isBlack: bool`. `_doCorruptionRiskCheck`: `isBlack → corruption = min(5, current+1)` + wiadomość czatu. |

---

### §3 Spaczenie

| ID | Reguła | Status | Istotność | Plik(i) | Notatki |
|----|--------|--------|-----------|---------|---------|
| A05 | §3.1 — Wszystkie źródła spaczenia obsługiwane | **ZGODNE** | Wysoka | `actor-sheet.ts` | 5 źródeł: (1) efekt czaru (BJ przy burn) → auto; inne efekty → przycisk GM (`gm-corruption-incident`); (2) zdolność wróga → przycisk GM; (3) incydent → przycisk GM; (4) BJ zagranie/ujawnienie → auto (A03); (5) awans szepty ranga 3/4/5 → `_doAdvanceWhisper` auto wywołuje check gdy `newRank >= 3`. Wszystkie 5 źródeł osiągalne. |
| A06 | §3.3 — Progi spaczenia 3/4 — dodatkowe karty journey | **ZGODNE** | Średnia | `journey-panel.ts` | `getCorruptionRecommendations()`: spaczenie≥3 → 1 karta, ≥4 → 2 karty. Panel wyświetla zalecenia. `_doApplyCorruptionCards()` losuje topDeck i dodaje do puli. |
| A07 | §3.3+§9 — Spaczenie 5 → ostrzeżenie o ostatniej misji | **ZGODNE** | Wysoka | `journey-panel.ts` | `_doEndMission()` po przywróceniu atrybutów skanuje aktorów z `corruption >= 5` i wypisuje chat z listą imion. |

---

### §4 Wędrówka

| ID | Reguła | Status | Istotność | Plik(i) | Notatki |
|----|--------|--------|-----------|---------|---------|
| A08 | §4.2 — Wymagania wyświetlane przed zagrywaniem kart | **ZGODNE** | Średnia | `journey-panel.ts`, `journey-panel.html` | Faza `configure` → GM wypełnia pola wymagań/premii/kary → przejście do `collect`. W fazach collect/deal/reveal/resolve wymagania wyświetlane w panelu. |
| A09 | §4.3 — Każdy gracz musi zagrać ≥1 kartę przed rozdaniem | **ZGODNE** | Wysoka | `journey-panel.ts` | `_doDealCards()` weryfikuje `missingUsers` (gracze spoza `playedUserIds`) i blokuje z ostrzeżeniem. `canDeal` / `canDealFromCollect` w kontekście wymagają `allPlayersContributed`. |
| A10 | §4.3 — Ślepa karta topDeck gdy brak ręki | **ZGODNE** | Wysoka | `card-usage.ts`, `actor-sheet.ts`, `journey-panel.ts` | `useJourneyCard(userId, undefined)` gdy ręka pusta → `drawTopDeckCard(true)`. Przyciski "play-blind-journey" w arkuszu aktora i panelu journey. |
| A11 | §4.3 — Ślepe karty ≤ liczba graczy | **ZGODNE** | Wysoka | `journey-panel.ts` | `_doAddBlindCard()`: `extraBlindCount >= playerIds.length` → ostrzeżenie i powrót. `playerIds` = aktywni non-GM użytkownicy. |
| A12 | §4.4 — Tasowanie + rozdanie | **ZGODNE** | Wysoka | `shared-deck.ts` | `shuffleAndDealJourneyCards()`: tasowanie Fisher-Yates na tablicy kodów, następnie przesyłanie kart z discard do rąk journey po jednej na gracza. |
| A13 | §4.4 — Nadmiar kart → do ręki GM | **ZGODNE** | Wysoka | `shared-deck.ts` | W `shuffleAndDealJourneyCards`: `i >= userIds.length → targetUserId = game.user.id` (GM). |
| A14 | §4.5 — Sekwencyjne ujawnianie z motywem | **CZESCIOWO** | Niska | `journey-panel.ts`, `journey-panel.html` | Motywy kart (pik/kier/trefl/karo/jokery) są wyświetlane w panelu dla każdego slotu ✅. Ujawnianie jest jednak wyłącznie kolektywne ("Reveal All") — brak przycisku do ujawniania kart po jednej w kolejności ⚠️. Gracze i narrator nie mogą narrować karty pojedynczo przez system. |
| A15 | §4.6 — Ewaluacja wymagań (premia/kara) | **ZGODNE** | Wysoka | `journey-panel.ts` | `_doAutoResolveRequirements()` wywołuje `evaluateJourneyRequirements()` (obsługuje: brak szóstek, liczba kart danego koloru, liczba kart danego typu). Wynik/premia/kara w chacie. |
| A16 | §4.7 — Sprzątanie journey: jokery → talia, reszta → discard; BJ → ryzyko spaczenia | **ZGODNE** | Wysoka | `journey-panel.ts` | `_doFinishJourney()`: rozdziela jokery od zwykłych kart; jokery → `returnJourneyToDeck` (z przetasowaniem); zwykłe → `discardJourney`. BJ w slocie gracza: obsługa już w `_doRevealAllCards`. |

---

### §5 Walka

| ID | Reguła | Status | Istotność | Plik(i) | Notatki |
|----|--------|--------|-----------|---------|---------|
| A17 | §5.1 — Najwyższa inicjatywa wybiera pierwszego aktora | **ZGODNE** | Wysoka | `combat-panel.ts` | `_doStartCombat()`: dialog z listą wszystkich uczestników (posortowanych wg punktacji). Narracja wskazuje, że gracz z najwyższą inicjatywą WYBIERA; GM zarządza. |
| A18 | §5.1 — Remisy rozstrzygane przez dodatkowe karty | **ZGODNE** | Wysoka | `combat-panel.ts`, `combat.ts` | `_doResolveOrder()` odczytuje inputy `tb-{id}`, wywołuje `resolveTieBreaker(cardA, cardB)` porównując wyniki sparsowanych kart. Remisanci oznaczeni `tied:true`. |
| A19 | §5.1 — Brak ręki → topDeck, odrzuć, NIE zachowuj | **ZGODNE** | Wysoka | `card-usage.ts` | `useInitiativeCard()` gdy brak ręki → `drawTopDeckCard(true)` (discard=true → karta idzie do discard). `keptInHand: false`. |
| A20 | §5.1 — Aktor wybiera następnego | **ZGODNE** | Wysoka | `combat-panel.ts` | `_doPassTurn()`: dialog z listą niedziałających uczestników (remaining bez `acted`). Aktywny aktor/GM wybiera następnego. |
| A21 | §5.1 — Ostatni aktor wybiera startera rundy (nie siebie) | **ZGODNE** | Wysoka | `combat-panel.ts`, `combat.ts` | `_doEndRound()` wywołuje `getNextRoundStarterOptions(allIds, lastActorId)` → filtruje out `lastActorId`. Dialog tylko z kwalifikującymi się. |
| A22 | §5.3 — Fizyczne PT = max(Krzepa, Pancerz) | **ZGODNE** | Wysoka | `combat.ts`, `attribute-tracks.ts` | `computeAttackPT(krzepa, armor) = Math.max(...)`. `getActorDefenseValue()` dla `physical=true` → `Math.max(track.value, armor)`. |
| A23 | §2.4 — Walka: 1 karta blokuje 1 punkt obrażeń | **ZGODNE** | Wysoka | `attribute-tracks.ts` | `preventDamageWithCards()`: `usableCards = cards.slice(0, damage)` (cap = wchodzące obrażenia). `preventedDamage = usableCards.length`. |
| A24 | §6 — Wyzwanie = suma sukcesów uczestników ≥ PT | **ZGODNE** | Wysoka | `skill-tests.ts` | `rollChallenge()`: każdy uczestnik robi test, sukcesy zsumowane. `totalSuccesses >= target`. |
| A25 | §5.4 — Atak grupy wrogów jako wyzwanie | **ZGODNE** | Wysoka | `combat-panel.ts` | `_doEnemyGroupAttack()`: pula kości = `groupSize + groupAttackBonus`, liczy wyniki ≥5 → łączne sukcesy. Funkcjonalnie równoważne wyzwaniu grupowemu (łączna pula kości odpowiada liczbie uczestników). |

---

### §7 Szepty

| ID | Reguła | Status | Istotność | Plik(i) | Notatki |
|----|--------|--------|-----------|---------|---------|
| A26 | §7.1 — 5-krokowe rzucanie szeptu | **CZESCIOWO** | Średnia | `actor-sheet.ts` | `_doCastWhisper()`: Krok 1 (wybór czaru) ✅ — prompt nazwy. Krok 2 (opłata kosztu) ✅ — wybór karty + `burnForWhisper`. Krok 3 (test szepty z post-roll) ✅ — pełny test z modyfikatorami. Krok 4 (dodatkowa ofiara, specyficzna dla ścieżki) ⚠️ — informacja w chacie na nieudanym teście, brak mechanicznego wymuszenia. Krok 5 (efekt po sukcesie) ⚠️ — wynik w chacie, brak automatyzacji efektu. Luki w krokach 4-5 są strukturalnie uzasadnione (efekty specyficzne ścieżek). |
| A27 | §7.3 — Rytuał elementarny: najpierw ręka | **ZGODNE** | Wysoka | `card-usage.ts`, `actor-sheet.ts` | `burnForElementalRitual`: ręka > 0 → wymaga karty z ręki ✅. Ręka pusta → `drawTopDeckCard(true)`; czarna karta → `triggersCorruptionRisk:true` ✅. |
| A28 | §7.4 — Gwiazdy/Święty Dzień: czarna karta sojusznika → ryzyko spaczenia rzucającego | **ZGODNE** | Wysoka | `actor-sheet.ts` | Przycisk `ally-black-card-corruption` → `_doAllyBlackCardCorruption()` → `_doCorruptionRiskCheck`. |

---

### §8 Rozwój

| ID | Reguła | Status | Istotność | Plik(i) | Notatki |
|----|--------|--------|-----------|---------|---------|
| A29 | §8.1 — Koszty awansu umiejętności | **ZGODNE** | Wysoka | `card-usage.ts`, `actor-sheet.ts` | Nowa umiejętność: `baseCost = 1 + (alreadyBought + 1)` → koszt n-tej umiejętności = 1+n (1-sza=2, 2-ga=3 itd.) ✅. Nowa kość: `(currentRank+1)+1 = newRank+1` ✅. |
| A30 | §8.2 — Atrybut: tylko czerwone karty, poprawny koszt | **ZGODNE** | Wysoka | `card-usage.ts` | Walidacja `allRed`. Koszt = `(currentMax+1)+1 = newMax+1` ✅. |
| A31 | §8.3 — Discount jednakowy kolor + bonus figure/as | **ZGODNE** | Wysoka | `card-usage.ts` | `sameColorDiscount`: wszystkie karty w puli kosztu tego samego koloru → `finalCost = baseCost - 1`, `keptCard = cards[baseCost-1]`. `facesAcesBonus`: wszystkie karty figure/as → `effectBonus = 1`. |

---

### §9–§10 Kampanijne / Wrogowie

| ID | Reguła | Status | Istotność | Plik(i) | Notatki |
|----|--------|--------|-----------|---------|---------|
| A32 | §9.1 — Koniec misji: przywrócenie atrybutów | **ZGODNE** | Wysoka | `journey-panel.ts` | `_doEndMission()` iteruje aktorów "character", każdy atrybut `value = max`. |
| A33 | §3.4 — Spaczenie NIE jest usuwane na koniec misji | **ZGODNE** | Wysoka | `journey-panel.ts`, `documents.ts` | `_doEndMission` aktualizuje tylko `system.attributes.*.value`. Brak kodu czyszczącego `system.corruption`. |
| A34 | §9.2 / §10 — Dystrybucja nagród wrogów | **ZGODNE** | Wysoka | `npc-sheet.ts`, `npc-sheet.html` | Przycisk "Grant Reward" (GM-only). `_doGrantReward()`: parsuje pole `reward` dla liczby kart, prompts potwierdzenie, losuje N kart dla każdego aktywnego gracza non-GM via `drawFromSharedDeck`, chat z wynikami. |
| A35 | §9.3 — Akcja oficera (ryzyko spaczenia, 4 karty, dystrybucja) | **ZGODNE** | Wysoka | `actor-sheet.ts` | `_doOfficerShareCards()`: (1) confirm → (2) `_doCorruptionRiskCheck` → (3) 4× prompt odbiorcy → (4) `draw(userId, 1)` × 4 (limit 7 kart respektowany) → (5) chat. |

---

## Podsumowanie

| Status | Liczba |
|--------|--------|
| **ZGODNE** | **33** |
| **CZESCIOWO** | **2** |
| **NIEZGODNE** | **0** |
| **BRAK** | **0** |
| **RAZEM** | **35** |

---

## Szczegóły luk CZESCIOWO

### A14 — Sekwencyjne ujawnianie (§4.5)
**Problem:** Panel journey ma tylko przycisk "Reveal All" — brak możliwości ujawniania kart po jednej w kolejności.  
**Wpływ:** Gracze nie mogą narrować swojej karty sekwencyjnie przez mechanizm systemu; GM musi poprowadzić to manualnie.  
**Rekomendacja:** Dodaj przycisk per-slot "Reveal" w fazie reveal, który odkrywa jedną kartę i zapisuje w `revealedCards[slot.revealKey]`. Obecny "Reveal All" można zachować jako skrót.

### A26 — 5-krokowe rzucanie szeptu (§7.1)
**Problem:** Kroki 4 (dodatkowa ofiara, specyficzna dla ścieżki) i 5 (mechaniczne działanie efektu) nie są wymuszone automatycznie.  
**Wpływ:** Miękki — chat informuje o wyniku testu, ale efekty/ofiary specyficzne dla ścieżki wymagają ręcznego GM-owania.  
**Rekomendacja:** (Opcjonalne) Dedykowane kroki 4 dla znanych ścieżek szepty (np. Rytuał Elementarny już jest automatyczny — A27). Ogólna automatyzacja jest jednak trudna bez pełnej bazy zaklęć.

---

## Zweryfikowane pliki

| Plik | Obszary audytu |
|------|----------------|
| `src/scripts/module/mechanics/shared-deck.ts` | A01, A02, A04, A09–A13 |
| `src/scripts/module/mechanics/card-usage.ts` | A02–A04, A10, A19, A23, A27, A29–A31 |
| `src/scripts/apps/journey-panel.ts` | A06–A09, A11–A16, A32 |
| `src/scripts/sheets/actor-sheet.ts` | A03, A05, A17, A20, A21, A26–A31, A35 |
| `src/scripts/sheets/npc-sheet.ts` | A34 |
| `src/scripts/apps/combat-panel.ts` | A17–A21, A25 |
| `src/scripts/module/mechanics/combat.ts` | A18, A19, A21, A22, A24, A25 |
| `src/scripts/module/mechanics/attribute-tracks.ts` | A22, A23 |
| `src/scripts/module/mechanics/skill-tests.ts` | A24 |
| `src/scripts/module/documents.ts` | A33 |
| `src/scripts/module/data-models.ts` | A33 |
| `src/templates/journey-panel.html` | A08, A14 |
| `src/templates/npc-sheet.html` | A34 |
| `rules.md` | Podstawa reguł §1–§10 |