# Rules Extract (Source: system.txt)

Ten plik zawiera wyekstrahowane zasady do audytu zaimplementowanych mechanik.

## 1) Karty i talia

### 1.1 Talia i limity
- Standard: talia 52 + 2 jokery.
- Przy 6+ graczach: uzyc 2 talii (z jokerami dla kazdej).
- Limit reki: maks. 7 kart.

Zrodlo:
- system.txt:186-193
- system.txt:216

### 1.2 Motywy kolorow kart (Wedrowka)
- Pik: wiedza.
- Trefl: przedmioty.
- Kier: relacje.
- Karo: jazn.

Zrodlo:
- system.txt:194-199

### 1.3 Jokery
- Joker: dzika karta.
- Po zagraniu lub odslonieciu jokera trzeba go wtasowac do talii.
- Czarny Joker powoduje dobor karty na potencjalne Spaczenie.

Zrodlo:
- system.txt:201-205

## 2) Uzycia kart

### 2.1 Wedrowka
- Kazdy gracz musi zagrac co najmniej 1 karte przy kazdej Wedrowce.
- Gracz bez kart doklada top-deck blind.

Zrodlo:
- system.txt:219-223

### 2.2 Inicjatywa
- Najwyzsza karta wybiera, kto zaczyna.
- Karty inicjatywy nie sa odrzucane. Wyjątkiej jest jocker
- Gracz bez kart: dobiera top-deck i odrzuca; karta nie trafia na reke.

Zrodlo:
- system.txt:224-230
- system.txt:309-316

### 2.3 +One
- Karte mozna odrzucic jako modyfikator testu.

Zrodlo:
- system.txt:231-234

### 2.4 Leczenie
- W walce: 1 karta blokuje 1 obrazenie.
- Poza walka: odrzuc karte, odzyskaj 1 punkt dowolnego atrybutu.

Zrodlo:
- system.txt:238-244

### 2.5 Rozwoj
- Na koniec misji mozna wydawac karty na rozwoj postaci.

Zrodlo:
- system.txt:245-251
- system.txt:1067-1090

## 3) Spaczenie

### 3.1 Zrodla ryzyka Spaczenia
- Efekt Szeptu.
- Zdolnosc wroga.
- Incydent w trakcie misji.
- Zagranie Czarnego Jokera.
- Rozwoj Szeptow (poziomy 3/4/5).

Zrodlo:
- system.txt:260-266
- system.txt:2460-2470

### 3.2 Procedura doboru na Spaczenie
- Dobierz top-deck prywatnie.
- Czarna karta: +1 Spaczenie.
- Czerwona karta: brak efektu.
- Gracz pokazuje karte narratorowi.
- Jesli karta jest jokerem: odrzuc joker, przetasuj talie, dobierz ponownie.

Zrodlo:
- system.txt:267-275
- system.txt:2467-2474

### 3.3 Efekty progowe Spaczenia
- Spaczenie 3: narrator moze dolozyc +1 karte do Wedrowki za taka postac.
- Spaczenie 4: narrator moze dolozyc +2 karty do Wedrowki za taka postac.
- Spaczenie 5: ostatnia misja postaci; po misji odchodzi.

Zrodlo:
- system.txt:276-279
- system.txt:2478-2481
- system.txt:2497-2503

### 3.4 Spaczenie na koniec misji
- Spaczenie nie jest automatycznie usuwane na koniec misji.

Zrodlo:
- system.txt:2322-2324
- system.txt:2491-2493

## 4) Wedrowka (pelny przeplyw)

### 4.1 Cel i moment
- Wedrowka rozpoczyna kazda misje.

Zrodlo:
- system.txt:2325-2327

### 4.2 Wymagania i zakazy
- Misja podaje wymagania (np. kolory/licznosci) i ewentualne zakazy.
- Wymagania przedstawia sie przed zagraniem kart.

Zrodlo:
- system.txt:2328-2331

### 4.3 Wejscie kart do puli Wedrowki
- Kazdy gracz zagrywa minimum 1 karte z reki, moze wiecej.
- Gracz bez kart: top-deck blind.
- Dodatkowe blind cards: max do liczby graczy.
- Narrator moze dolozyc karty z racji Spaczenia postaci.
- Reki graczy pozostaja tajne.

Zrodlo:
- system.txt:2332-2341

### 4.4 Tasowanie i rozdanie
- Po zebraniu kart: narrator tasuje i rozdaje zakryte karty graczom.
- Jesli kart jest wiecej niz graczy: nadwyzke mozna rozdac narratorowi.
- Rozdane karty Wedrowki nie sa dodawane do normalnej reki.

Zrodlo:
- system.txt:2342-2345

### 4.5 Reveal i narracja
- Gracze po kolei odslaniaja karty i opisuja scene / odpowiadaja na pytanie.
- Przy odslonieciu karty narratora: narrator wybiera postaci i opisuje scene/mysli.
- Narracja ma nawiazywac do motywu koloru, mocniej przy wyzszej wartosci.

Zrodlo:
- system.txt:2346-2354

### 4.6 Rozliczenie wyniku
- Spelnienie wymagan daje premie lub brak spelnienia daje kare (zaleznie od misji).
- Premie/kare ujawnia sie po odslonieciu wszystkich kart.

Zrodlo:
- system.txt:2355-2358

### 4.7 Domkniecie Wedrowki
- Wszystkie karty zagrane podczas Wedrowki sa odrzucane.
- Jesli zagrano jokera: joker wraca do talii.
- Jesli to Czarny Joker: najpierw dobierz na Spaczenie.

Zrodlo:
- system.txt:2360-2362

## 5) Walka

### 5.1 Inicjatywa i kolejnosc
- Inicjatywa = wartosc karty (As najwyzszy).
- Remis: mozna odslaniac kolejne karty.
- Brak kart: top-deck do inicjatywy i odrzucenie.
- Najwyzsza inicjatywa wybiera pierwsza osobe.
- Po akcji wykonawca wybiera nastepna osobe.
- Ostatnia osoba rundy wybiera startera kolejnej rundy, ale nie siebie.

Zrodlo:
- system.txt:309-317

### 5.2 Obrona i PT
- PT ataku to atrybut, przeciw ktoremu atak jest wykonywany.
- Trafienie: sukcesy >= PT.

Zrodlo:
- system.txt:324-328

### 5.3 Pancerz
- Dla atakow fizycznych PT = max(Krzepa, Pancerz).
- Ataki w inne atrybuty ignoruja pancerz.

Zrodlo:
- system.txt:331-336

### 5.4 Grupy wrogow
- Narrator moze grupowac i przestawiac sklady grup.
- Grupa ma wspolna inicjatywe.
- Grupa moze atakowac razem na zasadach wyzwania.
- Tylko jedna bron faktycznie zadaje obrazenia; reszta to ogien zaporowy.

Zrodlo:
- system.txt:2398-2406
- system.txt:2609-2610

## 6) Wyzwania

- Wyzwanie to test wspolpracy, zbyt trudny dla jednej postaci.
- Kazdy uczestnik wykonuje test, sukcesy sa sumowane.
- Warunek powodzenia: suma sukcesow >= PT.
- Porazka wyzwania moze miec negatywne skutki.

Zrodlo:
- system.txt:141-152

## 7) Szepty (reguly ogolne i istotne przypadki)

### 7.1 Sekwencja rzucania Szeptu
1. Wybor Szeptu i wzmocnien.
2. Zaplata kosztu.
3. Test umiejetnosci.
4. Dodatkowe poswiecenia (wybrane sciezki).
5. Rozpatrzenie efektu przy sukcesie.

Zrodlo:
- system.txt:662-667

### 7.2 Rozwoj Szeptow a Spaczenie
- Przy wykupieniu poziomu 3/4/5 kazdej sciezki: dobierz na Spaczenie.

Zrodlo:
- system.txt:2467-2470

### 7.3 Rytualy Zywiolow
- Koszt: odrzucenie karty + test Szepty przeciw obronie celu.
- Jesli brak kart na rece: odrzuc top-deck; czarna karta wymusza ryzyko Spaczenia.

Zrodlo:
- system.txt:758-763

### 7.4 Gwiazdy / Dzien Swiety
- Inni moga dolaczac karty do rytualu.
- Jesli dolaczono choc jedna czarna karte: czarownik ryzykuje Spaczenie.

Zrodlo:
- system.txt:797-801
- system.txt:833-836

### 7.5 Zagajnik
- Uczestnicy moga wykladac i zabierac karty wg kolejnosci ustalonej przez czarownika.
- Karty pozostale na stole sa odrzucane.
- Jesli cokolwiek zostalo na stole: czarownik dobiera na Spaczenie.

Zrodlo:
- system.txt:748-754

### 7.6 Wrogowie rzucajacy Szepty
- Zasady jak dla graczy, z jednym wyjatkiem:
- Jesli sciezka wymaga odrzucenia karty, wrog pomija ten koszt.

Zrodlo:
- system.txt:2412-2417

## 8) Rozwoj postaci

### 8.1 Umiejetnosci
- Nowa umiejetnosc: koszt 1 + liczba nowo dokupionych umiejetnosci.
- Nowa kosc umiejetnosci: koszt = nowy poziom + 1.

Zrodlo:
- system.txt:1070-1076

### 8.2 Atrybuty
- Podniesienie atrybutu: tylko czerwone karty.
- Koszt = nowa wartosc atrybutu + 1.

Zrodlo:
- system.txt:1078-1081

### 8.3 Modyfikatory kosztu rozwoju
- Karty tego samego koloru: koszt efektywnie -1 (jedna karta zostaje).
- Same figury/asy: efekt rozwoju +1.

Zrodlo:
- system.txt:1083-1090

## 9) Zasady kampanijne i po misji

### 9.1 Koniec misji
- Postacie odzyskuja utracone punkty atrybutow.
- Gracze wydaja zebrane karty na rozwoj.
- Narrator tasuje odrzucone karty z powrotem do talii.

Zrodlo:
- system.txt:2318-2323

### 9.2 Nagrody
- Karty zdobywa sie za przetrwanie misji, cele specjalne i pokonywanie wrogow.
- Wrogowie maja wartosc nagrody; wariant "dla oddzialu" wymaga decyzji komu przypisac karty.

Zrodlo:
- system.txt:217-218
- system.txt:2624-2625

### 9.3 Oficer
- Na poczatku kazdej misji z oficerem:
  - oficer moze zaryzykowac Spaczenie,
  - dobiera 4 karty,
  - rozdaje je oddzialowi (z limitem 7 na reke),
  - moze zatrzymac dowolna czesc dla siebie.

Zrodlo:
- system.txt:1061-1065

## 10) Wrogowie (model i statystyki)

- Typ `grupa`: moze atakowac razem na zasadach wyzwania.
- Typ `solo`: atakuje pojedynczo.
- Inicjatywa wroga: wartosc karty.
- Pancerz/Krzepa/Spryt/Hart: jak u postaci graczy.
- Nagroda: okresla liczbe i rodzaj przyznanych kart.

Zrodlo:
- system.txt:2609-2625
