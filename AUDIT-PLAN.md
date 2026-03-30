# Plan Audytu Zgodnosci Mechanik z Zasadami

## Cel
Zweryfikowac wszystkie zaimplementowane mechaniki pod katem zgodnosci z zasadami z podrecznika (system.txt) i oznaczyc status: `ZGODNE`, `CZESCIOWO`, `NIEZGODNE`, `BRAK`.

## Zakres audytu
1. Karty i talia wspolna.
2. Jokery i ryzyko Spaczenia.
3. Spaczenie postaci.
4. Wedrowka (pelny flow).
5. Inicjatywa i kolejnosc rund walki.
6. Obrona, pancerz, obrazenia.
7. Wyzwania grupowe.
8. Szepty i koszty rzucania.
9. Rozwoj postaci i koszty.
10. Zasady kampanijne (koniec misji, nagrody, oficer).
11. Wrogowie: grupy, nagrody, inicjatywa.

## Metodyka
1. Stworzyc matryce: `mechanika -> regula -> plik/kod -> test -> wynik`.
2. Dla kazdej mechaniki wykonac:
- przeglad kodu (source of truth: TS + templates + localization),
- test scenariuszowy w Foundry v13,
- porownanie wyniku z regula z pliku rules.md.
3. Zapisac odchylenia jako:
- krytyczne (lamie przebieg mechaniki),
- wysokie (zla konsekwencja mechaniczna),
- srednie (skraca/proceduralnie zmienia flow),
- niskie (UI/UX, nazewnictwo, komunikat).

## Artefakty audytu
1. `rules.md` - ekstrakt zasad (zrodlo do porownania).
2. `AUDIT-RESULTS.md` - raport zgodnosci mechanik.
3. `AUDIT-TEST-LOG.md` - log scenariuszy testowych i wynikow.

## Checklista audytu (do odhaczania)
- [ ] A01 Karty: talia 52+2, limit reki 7, 2 talie przy 6+ graczach.
- [ ] A02 Jokery: powrot do talii po zagraniu/odslonieciu.
- [ ] A03 Czarny Joker: ryzyko Spaczenia we wszystkich kontekstach.
- [ ] A04 Draw na Spaczenie: joker-loop (redraw po jokerze), czarna +1.
- [ ] A05 Spaczenie: zrodla (Szepty, zdolnosci wrogow, incydent, awans 3/4/5, Joker).
- [ ] A06 Spaczenie 3/4: dodatkowe karty do Wedrowki.
- [ ] A07 Spaczenie 5: ostatnia misja i konsekwencja po misji.
- [ ] A08 Wedrowka: wymagania pokazane przed zagraniem kart.
- [ ] A09 Wedrowka: min. 1 karta od kazdego gracza.
- [ ] A10 Wedrowka: gracz bez kart -> top deck blind.
- [ ] A11 Wedrowka: dodatkowe blind cards max = liczba graczy.
- [ ] A12 Wedrowka: tasowanie i rozdanie po zebraniu kart.
- [ ] A13 Wedrowka: nadwyzka kart moze trafic do Narratora.
- [ ] A14 Wedrowka: reveal po kolei + motywy koloru.
- [ ] A15 Wedrowka: rozliczenie wymagan i ujawnienie premii/kary.
- [ ] A16 Wedrowka: odrzut kart po zakonczeniu + obsluga jokera.
- [ ] A17 Inicjatywa: najwyzsza karta wybiera pierwsza osobe.
- [ ] A18 Inicjatywa: remisy rozwiazywane dodatkowymi kartami.
- [ ] A19 Inicjatywa: brak kart -> top deck odrzucony, nie na reke.
- [ ] A20 Round flow: po akcji wskazanie kolejnej osoby.
- [ ] A21 Round flow: ostatnia osoba wybiera start nastepnej rundy (nie siebie).
- [ ] A22 Pancerz: PT ataku = max(Krzepa, Pancerz) dla atakow fizycznych.
- [ ] A23 Obrona kartami: 1 karta = 1 obrazenie.
- [ ] A24 Wyzwania: sumowanie sukcesow wszystkich uczestnikow.
- [ ] A25 Wrogowie-grupy: wspolna inicjatywa + atak grupowy jak wyzwanie.
- [ ] A26 Szepty: poprawna sekwencja rzutu i kosztow.
- [ ] A27 Rytualy Zywiolow: brak kart -> top deck; czarna -> ryzyko Spaczenia.
- [ ] A28 Gwiazdy / Dzien Swiety: czarna karta sojusznika -> ryzyko Spaczenia.
- [ ] A29 Rozwoj: koszty atrybut/skill/new-skill.
- [ ] A30 Rozwoj: czerwone karty dla atrybutu + modyfikatory (same kolory, figury/asy).
- [ ] A31 Rozwoj Szeptow: poziomy 3/4/5 wymuszaja ryzyko Spaczenia.
- [ ] A32 Koniec misji: pelne odnowienie atrybutow + tasowanie discard do deck.
- [ ] A33 Koniec misji: Spaczenie nie schodzi automatycznie.
- [ ] A34 Nagrody za wrogow: karty indywidualne i "dla oddzialu".
- [ ] A35 Oficer: na poczatku misji ryzyko Spaczenia + 4 karty do rozdania.

## Scenariusze testowe Foundry (minimalny zestaw)
1. S01 Wedrowka bazowa 3 graczy (wszyscy dokladaja po 1 karcie).
2. S02 Wedrowka z jednym graczem bez kart.
3. S03 Wedrowka z dodatkowymi blind cards do limitu i proba przekroczenia limitu.
4. S04 Wedrowka z nadwyzka kart (sprawdzenie reveal Narratora).
5. S05 Czarny Joker: inicjatywa, Wedrowka, spalenie, top-deck.
6. S06 Walka: remis inicjatywy + tie-break + wybor startera kolejnej rundy.
7. S07 Obrona i pancerz na celach o roznych wartosciach Krzepy/Pancerza.
8. S08 Wyzwanie grupowe i atak grupy wrogow.
9. S09 Rytualy Zywiolow bez kart oraz Gwiazdy/Dzien Swiety z czarna karta.
10. S10 Rozwoj postaci i walidacje kosztow.
11. S11 Koniec misji + reset zasobow.

## Kryterium ukonczenia audytu
1. Kazda pozycja checklisty A01-A35 ma status i dowod (kod + test).
2. Kazda niezgodnosc ma przypisana poprawke i priorytet.
3. Raport koncowy zawiera gotowa liste zmian do wdrozenia.
