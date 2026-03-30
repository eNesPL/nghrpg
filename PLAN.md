# NGH RPG — Plan Implementacji

## Stan obecny

### Zaimplementowane ✅
- **Silnik talii: deck, discard pile, infrastruktura dla wszystkich graczy**  
	Tekst zasady: "Standardowa talia pięćdziesięciu dwóch kart z dwoma jokerami reprezentuje siły emocjonalne i wspomnienia postaci." oraz "W ręce można mieć maksymalnie siedem kart."
- **Dwie ręce na gracza: `"standard"` (inicjatywa, +jeden, spalanie, leczenie) i `"journey"` (Wędrówka)**  
	Tekst zasady: "Każda karta w ręce gracza reprezentuje wspomnienia postaci i składa się na to, co czyni ją człowiekiem." oraz "Każdy z graczy musi podczas wędrówki zagrać minimum jedną kartę z ręki, ale może zagrać więcej, jeśli chce."
- **Akcje kart: inicjatywa, +jeden, szept (whisper), spalanie kart na leczenie, wydawanie kart na Rozwój**  
	Tekst zasady: "Gracz, który zagra najwyższą kartę, wybiera, kto pierwszy podejmuje akcję w walce.", "Kartę można wykorzystać i odrzucić przy teście umiejętności, by dodać modyfikator do rzutu.", "Wiele Szeptów wymaga odrzucenia (\"spalenia\") karty, by użyć mocy.", "Poza walką: W dowolnym momencie można zagrać i odrzucić kartę, aby odzyskać jeden punkt dowolnego atrybutu.", "Na zakończenie misji postaci mogą zagrać karty, by podnieść swoje atrybuty i umiejętności."
- **Śledzenie atrybutów: tory obrażeń, `preventDamageWithCards`, `healAttributeDamage`**  
	Tekst zasady: "W czasie walki: Karty można zagrywać, by odpierać zadawane postaci obrażenia w stosunku jeden do jednego." oraz "Poza walką: W dowolnym momencie można zagrać i odrzucić kartę, aby odzyskać jeden punkt dowolnego atrybutu."
- **Profil walki: 13 broni, typy inicjatywy, `resolveInitiativeOrder`**  
	Tekst zasady: "Inicjatywę, czyli kolejność akcji, określa się wartością karty (as jest kartą o najwyższym starszeństwie)." oraz "Postać z najwyższą inicjatywą wybiera, kto pierwszy podejmie akcję."
- **Test umiejętności: pełen silnik z pulą modyfikatorów, rzuty ponowne, zwiększenia**  
	Tekst zasady: implementacja odpowiada ogólnym zasadom testów umiejętności i wykorzystaniu kart jako modyfikatorów; bez osobnego, jednego akapitu w tej sekcji planu.
- **Wędrówka (bazowe): `useJourneyCard`, losowanie do ręki journey, `drawJourneyHand`**  
	Tekst zasady: "Wędrówka rozpoczyna każdą z misji.", "Każdy z graczy musi podczas wędrówki zagrać minimum jedną kartę z ręki, ale może zagrać więcej, jeśli chce." oraz "Wszystkie karty zagrane w czasie wędrówki zostają odrzucone."
- **Panel GM: `NGHJourneyPanel` — ręka journey GM-a, liczniki graczy, rekomendacje Spaczenia**  
	Tekst zasady: "Jeśli któraś z postaci ma 3 punkty Spaczenia, narrator może w dowolnej chwili dodać do wędrówki jedną kartę za każdą taką postać. Jeśli któraś z postaci ma 4 punkty Spaczenia, narrator może w dowolnej chwili dodać do wędrówki dwie karty za każdą taką postać."
- **Ekran MG: `NGHGMToolsPanel` — najważniejsze zasady, checklista sesji, skrót przepływu Wędrówki/Walki i podgląd Spaczenia postaci**  
	Tekst zasady: warstwa narzędzi pomocniczych dla prowadzącego (Etap 8).
- **Bestiariusz systemowy: typ aktora `npc`, arkusz `NGHNPCSheet`, compendium `NGH Enemies`**  
	Tekst zasady: warstwa narzędziowa do prowadzenia przeciwników i szybkiego dostępu do statystyk.
- **Arkusz postaci: sekcja ręki journey, przyciski rysowania/grania, akcje per-karta**  
	Tekst zasady: warstwa UI dla zasad Wędrówki, inicjatywy, leczenia i Rozwoju; sama zasada pochodzi z cytatów powyżej.
- **Lokalizacja: pl.json + en.json skompletowane dla powyższych funkcji**  
	Tekst zasady: brak osobnej zasady mechanicznej; warstwa tekstowa dla zaimplementowanych zasad.
- **CSS: style dla ręki journey, panelu GM, przycisków**  
	Tekst zasady: brak osobnej zasady mechanicznej; warstwa prezentacji dla zaimplementowanych zasad.

### Częściowo zaimplementowane ⚠️
- Etap 1+2: ryzyko Spaczenia działa dla Czarnego Jokera w inicjatywie, Wędrówce, spaleniu za +One/Szept/Leczenie, Rytuałach Żywiołów bez kart na ręce, Gwiazdach / Dniu Świętym przy czarnej karcie sojusznika, akcji oficera, incydentach MG oraz dla awansu Ścieżek Szeptów; Czarny Joker przy spaleniu wraca do talii; brak wdrożenia dla zdolności wrogów
- Etap 3: panel faz Wędrówki z socket-sync faz, konfiguracji wymagań/premii/kary, reveal-sync kart oraz auto-rozliczeniem wymagań (dla rozpoznanych wzorców tekstu); nierozpoznane wymagania nadal wymagają ręcznego rozstrzygnięcia
- Etap 7 (częściowo): przycisk „Zakończ Misję" w fazie Rozliczenia resetuje atrybuty postaci do max i przetasowuje odrzucone; brak nagradzania kartami i podwójnej talii
- Etap 4: dodane `computeAttackPT`, `resolveTieBreaker`, `getNextRoundStarterOptions` oraz akcja obrony kartą w arkuszu; dodany `NGHCombatPanel` (idle/initiative/active) z flow rund, wejściem grup wrogów (`xN`, `atk±M`) i akcją „Atak grupowy”; pozostaje pełna integracja grup z Wyzwaniami
- Etap 6: zaimplementowane `rollChallenge` + UI „Rzuć jako Wyzwanie” na arkuszu oraz grupowy output czatu; brak pełnej integracji z grupami wrogów
- Etap 8: zaimplementowany panel „Narzędzia MG” z sekcjami referencyjnymi i checklistami

### Brak implementacji ❌
- Ryzyko Spaczenia z pozostałych źródeł (zdolności wrogów)
- Wymagania Wędrówki: rozszerzenie parsera auto-rozliczeń o bardziej złożone zapisy (obecnie obsługiwane są najczęstsze wzorce)
- Wyzwania: integracja z grupami wrogów (wspólna inicjatywa i atak grupowy) do domknięcia Etapu 4/6
- Podwójna talia dla 6+ graczy (2× talie 52 karty)
- Nagrody za wrogów: karty dla gracza lub dla oddziału (per enemy type)

---

## Etap 1: Jokery i ryzyko Spaczenia (MUST-HAVE)

**Cel:** Każde użycie Jokera ma prawidłowe konsekwencje mechaniczne.

**Tekst zasady:**
> "Joker to dzika karta, która może posłużyć za dowolną inną kartę, gdy się go zagrywa lub odsłania."
>
> "Po zagraniu lub odsłonięciu jokera z jakiegokolwiek powodu należy wtasować go z powrotem do talii."
>
> "Czarny joker powoduje także dobranie karty na potencjalne Spaczenie."
>
> "Wszystkie karty zagrane w czasie wędrówki zostają odrzucone. Jeśli zagrano jokera, wtasuj go z powrotem do talii (jeśli był to czarny joker, najpierw dobierz na Spaczenie)."
>
> "Jeśli przy dobieraniu karty na Spaczenie karta jest jokerem, odsłania się go i dobiera ponownie, odrzuciwszy jokera i przetasowawszy talię."

Szczegóły mechaniki dobierania na Spaczenie:
- Dobierz kartę z wierzchu talii (prywatnie — gracz nie pokazuje innym)
- Jeśli karta to joker: odrzuć jokera, przetasuj talię, dobierz ponownie
- Jeśli karta jest czarna: +1 Spaczenie
- Jeśli karta jest czerwona: nic się nie dzieje
- Gracz podaje kartę do wglądu narratorowi (mechanicznie: GM widzi poziom Spaczenia)

**Pliki do zmiany:**
- `src/scripts/module/mechanics/card-usage.ts` — logika powrotu jokerów + `checkCorruptionRisk(actor)`
- `src/scripts/module/mechanics/shared-deck.ts` — helper `drawForCorruptionRisk(actor)` (joker-loop + kolor)
- `src/lang/pl.json` / `en.json` — komunikaty chat o powrocie jokera, wyniku rzutu

**Kroki:**
1. Dodać `drawForCorruptionRisk(actor)` w `shared-deck.ts`: pętla na joker → odrzuć + przetasuj → dobierz ponownie; czarna = +1 Spaczenie na dokumencie aktora
2. Dodać wywołanie w każdym miejscu: `useInitiativeCard` (Czarny Joker), `useJourneyCard` (Czarny Joker), `burnCardForPlusOne`, `burnCardForWhisper`, `burnCardsForHealing`
3. Po dobieraniu zwrócić joker do talii (`returnJokerToDeckIfNeeded`) niezależnie od koloru
4. Dodać klucze lokalizacyjne dla wyniku (Spaczenie +1 / brak)

---

## Etap 2: Pełne Spaczenie na postaci (MUST-HAVE)

**Cel:** Spaczenie jest atrybutem postaci, zmienia się dynamicznie i ma konsekwencje.

**Tekst zasady:**
> "Gdy wystąpi ryzyko Spaczenia, gracz dobiera kartę z wierzchu talii i patrzy na nią, nie pokazując innym graczom. Jeśli karta jest czarna, postać zyskuje 1 punkt Spaczenia. Jeśli karta jest czerwona, nic się nie dzieje. Następnie gracz podaje ją do wglądu narratorowi."
>
> "Narrator zapisuje w tajemnicy poziom Spaczenia każdej postaci. Spaczenia nie usuwa się na zakończenie misji."
>
> "Jeśli któraś z postaci ma 3 punkty Spaczenia, narrator może w dowolnej chwili dodać do wędrówki jedną kartę za każdą taką postać. Jeśli któraś z postaci ma 4 punkty Spaczenia, narrator może w dowolnej chwili dodać do wędrówki dwie karty za każdą taką postać."
>
> "Gdy postać osiągnie Spaczenie równe 5, to jej ostatnia misja. Po zakończeniu bieżącej misji (...) nie wraca do bazy z resztą oddziału."
>
> "Wraz z wykupieniem 3, 4 i 5 poziomu wyszkolenia w każdej ze Ścieżek Szeptów postać musi dobrać kartę na Spaczenie."
>
> "Rytuały Żywiołów: Jeśli czarownik nie ma kart w ręce, odrzuca jedną kartę z wierzchu talii. Jeśli jest to karta czarna, czarownik musi zaryzykować Spaczenie."

Źródła Spaczenia (pełna lista do implementacji):
- Czarny Joker zagrany/odsłonięty (każdy kontekst)
- Efekt Szeptu wroga / zdolność wroga (np. Plugawy Nosiciel oszpeconych)
- Incydent w trakcie misji (GM wywołuje ręcznie)
- Awans w Szeptach: poziom 3, 4 lub 5 każdej Ścieżki
- Rytuały Żywiołów przy braku kart na ręce i czarnej karcie z wierzchu
- Gwiazdy / Dzień Święty przy czarnej karcie sojusznika
- Zagajnik — niezagrane karty na stole

**Pliki do zmiany:**
- `src/scripts/module/documents.ts` — pole `corruption` (0–5); GM edytuje, gracz widzi tylko własne
- `src/scripts/module/data-models.ts` — rozszerzyć schemat o `corruption`
- `src/scripts/module/mechanics/card-usage.ts` — po awansie Szeptów poziom 3/4/5 wywołaj `drawForCorruptionRisk`; Rytuały Żywiołów bez kart → sprawdź kolor karty z wierzchu
- `src/scripts/sheets/actor-sheet.ts` — wyświetlanie Spaczenia (tylko GM edytuje), blokowanie akcji Szeptów przy Spaczeniu 5
- `src/templates/actor-sheet.html` — sekcja Spaczenia (wskaźnik ●●●●● + przycisk +/− dla GM)
- `src/scripts/apps/journey-panel.ts` — `_doApplyCorruptionCards` używa prawdziwej wartości `corruption` z dokumentu
- `src/lang/pl.json` / `en.json` — etykiety Spaczenia, ostrzeżenie o poziomie 5

---

## Etap 3: Pełna sekwencja Wędrówki oddziału (HIGH)

**Cel:** GM prowadzi Wędrówkę jako fazę oddziału z jasnym przepływem stanów i wymaganiami misji.

**Tekst zasady:**
> "Wędrówka rozpoczyna każdą z misji. Skupia się na odgrywaniu postaci i ich wątkach osobistych oraz pomaga nadać ton nadciągającym wydarzeniom."
>
> "Każda wędrówka posiada swoje wymagania (np. trzy kiery, jedna karta każdego koloru), a niektóre trudniejsze misje mogą określać rzeczy, jakich należy unikać (np. nie zagrywać szóstek, nie więcej niż jeden pik). Wymagania wędrówki przedstawia się graczom, zanim zagrają karty."
>
> "Każdy z graczy musi podczas wędrówki zagrać minimum jedną kartę z ręki, ale może zagrać więcej, jeśli chce. Jeśli gracz nie ma kart w ręce, dołóż do wędrówki kartę z wierzchu talii, nie odsłaniając jej."
>
> "Gracze mogą wspólnie zdecydować, że poświęcą na wędrówkę więcej czasu, by zgromadzić potrzebne rzeczy i dołożyć dodatkowe karty z wierzchu talii, ale nie więcej, niż wynosi liczba graczy. Karty w ręce każdego z graczy powinny być tajemnicą."
>
> "Gdy wszystkie karty wędrówki zostaną zagrane, narrator tasuje je i rozdaje zakryte graczom. Jeśli jest więcej kart niż graczy, narrator może nadwyżkę rozdać sobie. Rozdane karty nie są dodawane do kart na ręce."
>
> "Każdy z graczy po kolei odsłania swoją kartę wędrówki i albo odpowiada na pytanie związane z wędrówką jako swoja postać, albo opisuje scenę. Odpowiedzi i narracja nawiązują do motywów związanych z kolorem karty, tym silniej, im wyższa wartość."
>
> "Zależnie od misji albo spełnienie wymagań wędrówki zapewnia graczom premię, albo niespełnienie ich skutkuje karą. Ujawnij tę premię lub karę po tym, gdy odsłonięte zostaną wszystkie karty."
>
> "Wszystkie karty zagrane w czasie wędrówki zostają odrzucone. Jeśli zagrano jokera, wtasuj go z powrotem do talii (jeśli był to czarny joker, najpierw dobierz na Spaczenie)."

Motywy kolorów kart (dla narracji odsłaniania):
- **Pik**: Wiedza — nauka, rozwój, przezwyciężanie cierpienia
- **Trefl**: Przedmioty — pokonywanie przeszkód, akcja, przygoda
- **Kier**: Relacje — emocje i więzi
- **Karo**: Jaźń — ambicja i nadzieja

Fazy Wędrówki do zaimplementowania:
1. **Konfiguracja wymagań** — GM wpisuje wymagania misji w panelu (kolory, wartości, zakazy)
2. **Dobieranie kart** — każdy gracz zagrywa ≥1 kartę; przycisk GM „Dołącz kartę z talii" (max = liczba graczy); Spaczenie 3/4 → dodatkowe karty GM
3. **Tasowanie i rozdanie** — GM klika „Rozdaj karty Wędrówki"; system losowo przypisuje karty do graczy (nadwyżka do GM)
4. **Odsłanianie** — każdy gracz kolejno odsłania swoją kartę (socket); wyświetlenie motywu koloru w panelu
5. **Rozliczenie** — sprawdzenie wymagań, wyświetlenie premii/kary
6. **Zakończenie** — odrzucenie kart, zwrot jokerów do talii

**Pliki do zmiany:**
- `src/scripts/apps/journey-panel.ts` — stany faz (configure / collect / deal / reveal / resolve), wymagania misji, `_doShuffleAndDeal()`, socket handler `reveal`
- `src/templates/journey-panel.html` — panel wymagań, przycisk „Rozdaj", lista kart z przyciskiem odsłonięcia
- `src/scripts/module/mechanics/shared-deck.ts` — `shuffleAndDealJourneyCards(cards, userIds)`
- `src/scripts/ngh-system.ts` — socket events `ngh.journeyPhase`, `ngh.journeyReveal`
- `src/lang/pl.json` / `en.json` — motywy kolorów, nazwy faz, premie/kary

---

## Etap 4: Walka — kolejka, remisy, obrona, grupy wrogów (HIGH)

**Cel:** Pełna kolejka inicjatywy z mechaniką kart w trakcie rundy, z grupami wrogów i mechaniką pancerza.

**Tekst zasady:**
> "Inicjatywę, czyli kolejność akcji, określa się wartością karty (as jest kartą o najwyższym starszeństwie). Każdy z graczy może odsłonić (bez odrzucania) kartę, by ustalić swoją inicjatywę."
>
> "Jeśli postać nie posiada kart w ręce, może odsłonić kartę z wierzchu talii. Nie dobiera jej na rękę, lecz odrzuca po ustaleniu inicjatywy."
>
> "W przypadku remisu gracze mogą zdecydować się odsłonić kolejne karty. Karta o najwyższej wartości wygrywa."
>
> "Postać z najwyższą inicjatywą wybiera, kto pierwszy podejmie akcję. Po każdej akcji postać, która ją wykonała, wskazuje kolejną osobę."
>
> "Postać, która w danej rundzie ostatnia podejmuje akcję, wybiera, kto zacznie kolejną rundę, ale nie może wybrać siebie."
>
> "W czasie walki: Karty można zagrywać, by odpierać zadawane postaci obrażenia w stosunku jeden do jednego."
>
> "Jeśli postać lub stworzenie posiadają pancerz, PT ataków przeciwko nim równa się wartości Krzepy lub pancerza, w zależności od tego, która z nich jest wyższa w chwili wykonywania ataku."
>
> "Narrator może pogrupować wrogów wedle uznania na początku walki, a także zmieniać skład grup w trakcie. Grupa wrogów posiada wspólną inicjatywę. Wrogowie z cechą grupa mogą atakować razem na zasadach wyzwania — tylko jedna broń faktycznie zadaje obrażenia; reszta prowadzi ogień zaporowy."
>
> "Jeśli Ścieżka wymaga odrzucenia karty, koszt ten można pominąć, jako że kierujący wrogiem narrator nie ma kart w ręce [wrogowie-czarownicy nie muszą płacić kartami]."

**Pliki do zmiany:**
- `src/scripts/module/mechanics/combat.ts` — `resolveTieBreaker(entries)`, `resolveDefenseWithCard(attacker, defender, card)`, `computeAttackPT(target)` (zwraca `max(target.krzepa, target.pancerz)`), `setNextRoundStarter(lastActorId)` (ostatni aktor wybiera następną rundę)
- `src/scripts/module/mechanics/card-usage.ts` — integracja `preventDamageWithCards` z przebiegiem rundy
- `src/scripts/sheets/actor-sheet.ts` — akcja "Defend with card" w widoku walki; inicjatywa z talii gdy brak kart
- `src/templates/actor-sheet.html` — UI obrony

---

## Etap 5: Rozwój postaci — UI i pełne reguły kosztów (HIGH)

**Cel:** Gracz może wydać karty na Rozwój bezpośrednio z arkusza postaci, z uwzględnieniem wszystkich modyfikatorów kosztów.

**Tekst zasady:**
> "Na zakończenie misji, po tym jak gracze otrzymają karty odznaczeń, możesz wydać karty, aby rozwinąć swoją postać. Karty wykorzystane w ten sposób są odrzucane."
>
> "Nowa umiejętność: Dowolna kombinacja kart. Koszt to jeden, plus liczba dokupionych w ten sposób umiejętności. Pierwsza nowa umiejętność kosztuje dwie karty (1+1). Druga kosztuje trzy karty (1+2) itd."
>
> "Nowa kość umiejętności: Dowolna kombinacja kart. Koszt to wartość nowego poziomu wyszkolenia plus jeden. Podniesienie Komunikacji na poziom 4 kosztuje pięć kart (4+1)."
>
> "Podniesienie atrybutu: Dowolna kombinacja czerwonych kart. Koszt to nowa wartość atrybutu plus jeden. Podniesienie Krzepy na 6 poziom kosztuje siedem kart (6+1)."
>
> "Jeśli karty są tego samego koloru (♠/♣ lub ♥/♦), koszt spada o jeden. Nadal musisz mieć tyle kart, by móc wykupić dane rozwinięcie, ale jedną z nich możesz zachować."
>
> "Jeśli wszystkie karty to figury lub asy, zwiększ efekt o jeden. Na przykład: jeden dodatkowy poziom wyszkolenia, nowa umiejętność zaczyna na 1 poziomie wyszkolenia, atrybut zwiększa się o dodatkowy poziom."

Zasady kosztów (implementacja):
- Atrybut: **tylko czerwone karty** (♥ kier lub ♦ karo) — UI musi walidować kolor
- Nowa kość umiejętności/atrybutu: koszt = nowy poziom + 1
- Nowa umiejętność: koszt = 1 + liczba dotychczas dokupionychh umiejętności (licznik na postaci)
- Modyfikator „ten sam kolor" (wszystkie karty tej samej barwy): wymagana liczba kart ta sama, ale jedna wraca na rękę
- Modyfikator „same figury/asy" (J, Q, K, A): efekt +1 (dodatkowy poziom / dodatkowy punkt)
- Szept poziom 3/4/5: każde zakupienie wywołuje `drawForCorruptionRisk`

**Pliki do zmiany:**
- `src/scripts/sheets/actor-sheet.ts` — tryb Rozwoju: zaznaczanie kart, walidacja koloru, wywołanie `spendCardsForAdvancement`
- `src/scripts/module/mechanics/card-usage.ts` — `spendCardsForAdvancement(actor, cards, type)` z logiką modyfikatorów kosztów
- `src/templates/actor-sheet.html` — przycisk „Rozwój" przy atrybucie/umiejętności, sekcja trybu wyboru kart
- `src/lang/pl.json` / `en.json` — komunikaty walidacji (brak kart, zły kolor, koszt), potwierdzenie

---

## Etap 6: Wyzwania i grupy wrogów (HIGH)

**Cel:** Testy grupowe z sumowaniem sukcesów i mechanika atakujących wspólnie wrogów.

**Tekst zasady:**
> "Wyzwania są zbyt trudne, by zdołała je pokonać jedna postać, i wymagają współpracy. Wyzwanie może wymagać zdania testów kilku umiejętności przez całą drużynę, jednego testu, który musi zdać każda postać, a nawet testu o tak wysokim PT, że kilku graczy będzie musiało wykonać rzut i zsumować swoje sukcesy."
>
> "Wyzwania opisywane są następująco: 'Wyzwanie [umiejętność(-ci)]: PT #', co oznacza: każda postać uczestnicząca w wyzwaniu wykonuje wymagany test umiejętności, a następnie postaci sumują sukcesy, by uzyskać liczbę co najmniej równą PT. W odróżnieniu od testów umiejętności, porażka w wyzwaniu może mieć negatywne skutki."
>
> "Wrogowie z cechą grupa mogą atakować razem na zasadach wyzwania. Tylko jedna broń faktycznie zada obrażenia celowi; reszta prowadzi ogień zaporowy. Narrator może pogrupować wrogów wedle uznania na początku walki, a także zmieniać skład grup w trakcie. Gruppe wrogów posiada wspólną inicjatywę."

**Pliki do zmiany:**
- `src/scripts/module/mechanics/skill-tests.ts` — `rollChallenge(participants, skill, pt)` z sumowaniem sukcesów, wynik zbiorczy w chacie
- `src/scripts/sheets/actor-sheet.ts` — przycisk „Rzuć jako Wyzwanie" w sekcji testu umiejętności
- `src/lang/pl.json` / `en.json` — etykiety wyzwania, wynik grupowy

---

## Etap 7: Zasady kampanijne i nagrody (LATER)

**Cel:** Mechaniki kampanii, nagrody za misje, śledzenie stanu między sesjami.

**Tekst zasady:**
> "Przy sześciu i więcej graczach należy wymieszać dwie talie (łącznie z dwoma jokerami na każdą)."
>
> "Karty zdobywa się jako nagrody za przetrwanie misji, wykonywanie specjalnych zadań i pokonywanie wrogów. Narrator może też przyznać graczowi kartę, gdy uzna, że ten zrobił coś niesamowitego."
>
> "Nagroda: Liczba kart, jaką dobiera z talii postać, która pokonała stworzenie. Niektóre nagrody mają dopisek 'dla oddziału', który oznacza, że oddział musi wybrać, kto otrzyma karty."
>
> "Po zakończeniu misji każda postać odzyskuje wszystkie stracone wskutek obrażeń punkty atrybutów. (...) Po zakończeniu rozwoju postaci narrator wtasowuje wszystkie odrzucone karty z powrotem do talii, aby była gotowa na następną misję."
>
> "Na początku każdej misji, w której bierze udział oficer, może on zaryzykować Spaczenie, a następnie dobrać cztery karty z talii i rozdzielić je między członków oddziału według własnego uznania."

**Pliki do zmiany:**
- `src/scripts/module/mechanics/shared-deck.ts` — `initializeDoubleDeck()` gdy `game.users.size >= 6`; `awardCards(actorId, count, forSquad)` dla nagród za wrogów; `resetAfterMission()` (pełne atrybuty + przetasowanie)
- `src/scripts/module/documents.ts` — licznik `newSkillsThisSession` dla kumulatywnego kosztu nowych umiejętności
- `src/scripts/apps/journey-panel.ts` — przycisk „Koniec misji" (reset atrybutów + przetasowanie)
- `src/lang/pl.json` / `en.json` — etykiety nagród, zakończenia misji

## Etap 8: GameMaster Tools and screen

**Cel:** Stworzenie ekranu gma z najważniejszymi zasadami i podpowiedziami

## Etap 9: Bestiariusz systemowy (NPC Sheet + Compendium)

**Cel:** Dodać osobny arkusz przeciwników (NPC) i gotowy compendium z przeciwnikami z podręcznika.

**Zakres:**
- nowy typ aktora `npc` z dedykowanym modelem danych
- osobny arkusz `NGHNPCSheet` do edycji statystyk przeciwnika
- pakiet compendium `NGH Enemies` z gotowymi wpisami przeciwników
- rejestracja typu i arkusza w systemie oraz wpis `packs` w `system.json`

**Pliki do zmiany:**
- `src/scripts/module/data-models.ts`
- `src/scripts/module/documents.ts`
- `src/scripts/sheets/npc-sheet.ts`
- `src/templates/npc-sheet.html`
- `src/system.json`
- `src/packs/enemies.db`
- `tools/build-assets.mjs`
- `src/lang/pl.json` / `src/lang/en.json`

---

## Priorytety

| Priorytet | Etap | Opis |
|-----------|------|------|
| **Must-have** | Etap 1 | Jokery + ryzyko Spaczenia (w tym joker-na-Spaczeniu = re-draw) |
| **Must-have** | Etap 2 | Spaczenie jako atrybut postaci (wszystkie źródła) |
| **High** | Etap 3 | Sekwencja Wędrówki z wymaganiami i rozdaniem kart |
| **High** | Etap 4 | Walka z remisami, obroną, grupami wrogów |
| **High** | Etap 5 | UI Rozwoju z pełnymi regułami kosztów |
| **High** | Etap 6 | Wyzwania grupowe |
| **Later** | Etap 7 | Nagrody, zakończenie misji, podwójna talia |
| **Medium** | Etap 8 | GameMaster Tools and screen |
| **Medium** | Etap 9 | Bestiariusz systemowy (NPC Sheet + Compendium) |
---

## Definicja ukończenia

System jest gotowy do sesji próbnej gdy:
- [x] Etap 1 + 2: Czarny Joker w inicjatywie, Wędrówce i spaleniach → ryzyko Spaczenia; źródła Szeptów 3/4/5
- [~] Etap 3: GM prowadzi Wędrówkę (zbieranie → rozdanie → odsłanianie → rozliczenie); socket-sync faz działa; brak automatycznego sprawdzania wymagań misji
- [x] Etap 4: Walka ma poprawną kolejkę z remisami i obroną kartami- [x] Etap 5: Gracz może awansować atrybut/umiejętność z arkusza z walidacją koloru i modyfikatorami kosztów
- [x] Etap 6: Wyzwanie grupowe sumuje sukcesy
- [x] Build przechodzi `npm run build` bez błędów
- [ ] Testy na Foundry VTT v13 lokalnie
