# NGH RPG - Aktualny Plan Prac

Ostatnia aktualizacja: 2026-06-01

Ten dokument zastępuje stary plan implementacyjny. Projekt nie jest już na etapie
"zbudować wszystko od zera"; aktualny etap to: zweryfikować istniejącą
implementację z `system.txt`, naprawić realne błędy z testów w Foundry i dopiero
potem domknąć brakujące wygody.

## Źródła Prawdy

Kolejność zaufania:

1. `system.txt` - pełne źródło zasad.
2. `rules.md` - roboczy ekstrakt mechanik z `system.txt`.
3. Kod w `src/` - aktualna implementacja.
4. `AUDIT-RESULTS.md` - audyt zgodności, pomocny, ale wymaga potwierdzenia w runtime.
5. `AUDIT-TEST-LOG.md` - log testów w Foundry; obecnie najważniejszy brak.

Jeśli dokumenty się nie zgadzają, wygrywa `system.txt`, a potem trzeba sprawdzić
kod. `AUDIT-RESULTS.md` nie jest wystarczającym dowodem, dopóki scenariusze w
Foundry nie są wykonane.

## Aktualny Stan

- Worktree zawiera bieżące zmiany planu/audytu/kodu i wygenerowany `dist`; nie traktować tego jeszcze jako gotowego release branch.
- `npm ci` instaluje zależności.
- `npm run build` przechodzi bez błędów.
- Manifest systemu: `src/system.json`, wersja systemu `0.1.42`.
- Kompatybilność Foundry: minimum v12, verified v13.
- Audyt kodu deklaruje: 34 zgodne reguły, 1 częściowa, 0 brakujących.
- Testy runtime w Foundry nadal mają status `NOT RUN`.
- `npm audit` zgłasza podatności w zależnościach dev/type tooling; nie naprawiać automatycznie bez osobnej decyzji.

## Strategia Produktowa

Nie próbujemy automatyzować całego `system.txt`. Dobre VTT automatyzuje to, co
jest powtarzalne, łatwe do pomylenia albo musi przetrwać między sesjami.

Automatyzować:

- talia, discard, limity ręki, dobieranie i zwroty jokerów,
- Spaczenie i jego źródła,
- przepływ Wędrówki,
- inicjatywa, kolejność rund, remisy,
- obrażenia, pancerz, obrona kartami,
- rozwój postaci i koszty kart,
- nagrody, koniec misji, narzędzia MG.

Wspierać narzędziami, ale niekoniecznie automatyzować w pełni:

- opisowe efekty Szeptów,
- nietypowe wymagania misji,
- unikalne zdolności przeciwników,
- decyzje narratora i opisy scen.

## Faza 0 - Uporządkowanie Audytu

Cel: upewnić się, że lista "co jest gotowe" naprawdę wynika z `system.txt`.

Zadania:

- Porównać `rules.md` z `AUDIT-RESULTS.md` i znaleźć pominięte reguły.
- Szczególnie sprawdzić źródła Spaczenia: zdolności wrogów, incydent MG, Gwiazdy / Dzień Święty, Rytuały Żywiołów, Zagajnik, rozwój Szeptów, Czarny Joker.
- Oznaczyć, które źródła są automatyczne, a które są obsługiwane przyciskiem/manualnym wpisem MG.
- Zaktualizować `AUDIT-RESULTS.md`, jeśli audyt nadmiernie optymistycznie oznaczył coś jako `ZGODNE`.

Wyjście z fazy:

- `AUDIT-RESULTS.md` i `rules.md` nie mają oczywistych sprzeczności.
- Każda mechanika ma status: automatyczna, wspierana manualnie albo brak.

## Faza 1 - Testy Runtime w Foundry

Cel: zamienić przypuszczenia z audytu na fakty z działającego systemu.

Najpierw uruchomić scenariusze z `AUDIT-TEST-LOG.md`:

- S01 Wędrówka bazowa 3 graczy.
- S02 Wędrówka z graczem bez kart.
- S03 Limit dodatkowych blind cards.
- S04 Nadwyżka kart do Narratora.
- S05 Czarny Joker w wielu kontekstach.
- S06 Walka: remisy, tie-break, kolejna runda.
- S07 Obrona i pancerz.
- S08 Wyzwanie grupowe i atak grupy.
- S09 Rytuały Żywiołów oraz Gwiazdy / Dzień Święty.
- S10 Rozwój postaci.
- S11 Koniec misji.

Zasada pracy:

- Po każdym scenariuszu od razu wpisać `PASS`, `FAIL` albo `BLOCKED` w `AUDIT-TEST-LOG.md`.
- Dla każdego `FAIL` dopisać: co kliknięto, co miało się stać, co się stało, plik podejrzany o błąd.
- Nie dodawać nowych dużych funkcji przed zakończeniem tej fazy.

Wyjście z fazy:

- Żaden scenariusz nie ma statusu `NOT RUN`.
- Lista błędów runtime jest znana i uporządkowana.

## Faza 2 - Naprawy Krytyczne po Testach

Cel: doprowadzić obecny system do stabilnej sesji próbnej.

Priorytet napraw:

1. Błędy blokujące Foundry: system się nie ładuje, arkusze nie otwierają się, panele rzucają wyjątki.
2. Błędy niszczące stan gry: karty znikają, jokery wracają źle, Spaczenie liczy się źle, ręce graczy mieszają się.
3. Błędy mechaniczne: zły koszt rozwoju, zły PT, zły limit kart, zły flow Wędrówki.
4. Błędy UI i lokalizacji, jeśli utrudniają prowadzenie sesji.

Po każdej naprawie:

- uruchomić `npm run build`,
- powtórzyć scenariusz, który wykrył błąd,
- wpisać wynik do `AUDIT-TEST-LOG.md`.

Wyjście z fazy:

- Build przechodzi.
- Scenariusze S01-S11 są `PASS` albo mają świadomie zaakceptowany `BLOCKED` z opisem.

## Faza 3 - Dwie Znane Luki z Audytu

### A14 - Sekwencyjne ujawnianie Wędrówki

Status: zrobione statycznie, wymaga potwierdzenia w runtime Foundry.

Problem pierwotny: panel miał tylko skrót typu "Reveal All", a zasada mówi o
ujawnianiu po kolei.

Zakres:

- [x] Dodać przycisk ujawnienia przy pojedynczym slocie Wędrówki.
- [x] Zachować "Reveal All" jako narzędzie MG/szybki skrót.
- [x] Zapisać ujawniony stan tak, aby panel odświeżał się spójnie u MG i graczy.
- [x] W czacie wypisać ujawnioną kartę.
- [x] Obsłużyć Czarnego Jokera tak samo jak przy masowym reveal.

Pliki prawdopodobnie:

- `src/scripts/apps/journey-panel.ts`
- `src/templates/journey-panel.html`
- `src/lang/pl.json`
- `src/lang/en.json`

### A26 - Szepty: zakres automatyzacji

Status: minimalny zakres zrobiony statycznie, pełne workflow konkretnych ścieżek
zostaje w backlogu po sesji próbnej.

Problem: ogólny flow Szeptu istnieje, ale dodatkowe ofiary i efekty konkretnych
ścieżek nie są pełnym rules engine.

Decyzja produktowa:

- Nie budować od razu pełnej bazy wszystkich Szeptów.
- Ulepszyć generic flow tak, aby jasno prowadził MG przez krok 4 i 5.
- Automatyzować tylko konkretne przypadki, które są proste i powtarzalne.

Zakres minimalny:

- [x] Chat po rzuceniu Szeptu powinien pokazać: ścieżkę, koszt, wynik testu, czy potrzebna jest dodatkowa ofiara, miejsce na efekt manualny.
- [x] Dodać przycisk lub akcję MG dla manualnego ryzyka Spaczenia z powodem.
- [x] Sprawdzić, czy Zagajnik ma wystarczające wsparcie. Jeśli nie, dodać przynajmniej ręczny workflow do wywołania ryzyka Spaczenia z powodem "Zagajnik".

Pliki prawdopodobnie:

- `src/scripts/sheets/actor-sheet.ts`
- `src/templates/actor-sheet.html`
- `src/scripts/apps/gm-tools-panel.ts`
- `src/lang/pl.json`
- `src/lang/en.json`

## Faza 4 - Playable Release v0.2

Cel: przygotować system do realnej sesji testowej.

Zadania:

- Zaktualizować README: jak zbudować, jak uruchomić w Foundry, znane ograniczenia.
- Upewnić się, że `system.json` ma właściwą wersję.
- Sprawdzić, czy runtime pliki wygenerowane przez build są zsynchronizowane.
- Oznaczyć w dokumentacji, które zasady są automatyczne, a które są wspierane manualnie.
- Rozważyć tag `v0.2-playtest` po udanej sesji próbnej.

Definicja gotowości:

- `npm run build` przechodzi.
- S01-S11 mają wynik.
- Nie ma znanych błędów niszczących stan kart, aktorów albo Spaczenia.
- MG może poprowadzić: start misji, Wędrówkę, walkę, rozwój, nagrody i koniec misji.

## Backlog po Sesji Próbnej

Te rzeczy warto zrobić dopiero po pierwszym realnym użyciu:

- Lepszy parser wymagań Wędrówki.
- Dedykowane workflow dla wybranych Szeptów.
- Rozbudowa compendiów.
- Lepsze importery przeciwników / nagród.
- Automatyczne testy jednostkowe dla czystych mechanik kart, walki i rozwoju.
- Decyzja o aktualizacji zależności po analizie `npm audit`.
