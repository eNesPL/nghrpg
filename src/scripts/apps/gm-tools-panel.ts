const NGH_SYSTEM_ID = "nghrpg";
const JOURNEY_PHASE_SETTING = "journeyPhase";
const JOURNEY_POOL_SETTING = "journeyPoolCards";
const JOURNEY_REVEALED_SETTING = "journeyRevealedCards";
const JOURNEY_PLAYED_USERS_SETTING = "journeyPlayedUsers";
const JOURNEY_EXTRA_BLIND_COUNT_SETTING = "journeyExtraBlindCount";

let panelInstance: NGHGMToolsPanel | null = null;

type GMRuleEntry = {
  title: string;
  tags: string[];
  source: string;
  rules: string[];
  searchAliases?: string[];
  searchText?: string;
};

type GMRuleSection = {
  title: string;
  entries: GMRuleEntry[];
};

type GMCardView = {
  code: string;
  label: string;
  suit: string;
  isRed: boolean;
  isJoker: boolean;
};

type GMCharacterView = {
  actorId: string;
  name: string;
  userId: string;
  userName: string;
  hasUser: boolean;
  corruption: number;
  corruptionClass: string;
  corruptionJourneyCards: number;
  contributed: boolean;
  contributionClass: string;
  standardCards: GMCardView[];
  journeyCards: GMCardView[];
  revealLabel: string;
  attributes: Array<{
    key: string;
    label: string;
    value: number;
    max: number;
    damaged: boolean;
  }>;
};

type GMCharacterGroup = {
  key: string;
  title: string;
  hint: string;
  entries: GMCharacterView[];
};

const normalizeSearchText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();

const GM_RULE_SECTIONS: GMRuleSection[] = [
  {
    title: "Karty i talia",
    entries: [
      {
        title: "Talia, limity i tajność",
        tags: ["karty", "talia", "ręka", "limit"],
        source: "system.txt:186-216",
        rules: [
          "Standardowa talia: 52 karty + 2 jokery.",
          "Przy 6+ graczach użyj dwóch talii, z jokerami dla każdej.",
          "Limit normalnej ręki gracza: 7 kart.",
          "Karty w ręce są tajne; gracz nie pokazuje ich innym."
        ]
      },
      {
        title: "Motywy kolorów Wędrówki",
        tags: ["wędrówka", "kolory", "motywy"],
        source: "system.txt:194-199",
        rules: [
          "Pik: Wiedza, nauka, rozwój, przezwyciężanie cierpienia.",
          "Trefl: Przedmioty, przeszkody, akcja, przygoda.",
          "Kier: Relacje, emocje i więzi.",
          "Karo: Jaźń, ambicja i nadzieja."
        ]
      },
      {
        title: "Jokery",
        tags: ["joker", "czarny joker", "spaczenie", "talia"],
        source: "system.txt:201-205",
        rules: [
          "Joker jest dziką kartą i może zastąpić dowolną inną kartę.",
          "Po zagraniu lub odsłonięciu jokera wtasuj go z powrotem do talii.",
          "Czarny Joker dodatkowo wymusza dobranie karty na potencjalne Spaczenie."
        ]
      }
    ]
  },
  {
    title: "Użycia kart",
    entries: [
      {
        title: "Wędrówka",
        tags: ["wędrówka", "karty", "blind"],
        source: "system.txt:219-223",
        rules: [
          "Każdy gracz musi dołożyć co najmniej jedną kartę przy każdej Wędrówce.",
          "Gracz bez kart dokłada wierzchnią kartę talii w ciemno, bez patrzenia."
        ]
      },
      {
        title: "Inicjatywa",
        tags: ["walka", "inicjatywa", "karty"],
        source: "system.txt:224-230, 309-317",
        rules: [
          "Najwyższa karta inicjatywy wybiera, kto działa jako pierwszy.",
          "As jest najwyższą kartą.",
          "Karty zagrane na inicjatywę nie są odrzucane, z wyjątkiem jokerów.",
          "Gracz bez kart może dobrać top-deck do inicjatywy i odrzuca tę kartę; nie trafia ona na rękę."
        ]
      },
      {
        title: "+One, leczenie i obrona",
        tags: ["test", "leczenie", "obrona", "obrażenia"],
        source: "system.txt:231-244",
        rules: [
          "Kartę można odrzucić jako +One przy teście umiejętności.",
          "W walce: 1 karta blokuje 1 punkt obrażeń.",
          "Poza walką: odrzuć kartę, aby odzyskać 1 punkt dowolnego atrybutu."
        ]
      }
    ]
  },
  {
    title: "Spaczenie",
    entries: [
      {
        title: "Źródła ryzyka",
        tags: ["spaczenie", "szepty", "joker", "incydent"],
        source: "system.txt:260-266, 2467-2474",
        rules: [
          "Ryzyko Spaczenia mogą wywołać: efekt Szeptu, zdolność wroga, incydent w misji, Czarny Joker, rozwój Ścieżek Szeptów.",
          "Awans dowolnej Ścieżki Szeptów na poziom 3, 4 lub 5 wymaga dobrania na Spaczenie."
        ]
      },
      {
        title: "Procedura doboru na Spaczenie",
        tags: ["spaczenie", "procedura", "joker"],
        source: "system.txt:267-275, 2467-2479",
        rules: [
          "Dobierz wierzchnią kartę prywatnie.",
          "Jeśli to joker: odrzuć go, przetasuj talię i dobierz ponownie.",
          "Czarna karta: Spaczenie +1.",
          "Czerwona karta: brak efektu.",
          "Kartę powinien znać gracz i narrator, nie cały stół."
        ]
      },
      {
        title: "Progi Spaczenia",
        tags: ["spaczenie", "wędrówka", "koniec misji"],
        source: "system.txt:276-279, 2478-2503",
        rules: [
          "Spaczenie 3: narrator może dołożyć +1 kartę do Wędrówki za tę postać.",
          "Spaczenie 4: narrator może dołożyć +2 karty do Wędrówki za tę postać.",
          "Spaczenie 5: to ostatnia misja postaci; po misji opuszcza oddział.",
          "Spaczenie nie znika automatycznie na koniec misji."
        ]
      }
    ]
  },
  {
    title: "Wędrówka",
    entries: [
      {
        title: "Start i wymagania",
        tags: ["wędrówka", "misja", "wymagania"],
        source: "system.txt:2325-2331",
        rules: [
          "Wędrówka rozpoczyna każdą misję.",
          "Misja podaje wymagania i ewentualne zakazy.",
          "Wymagania ujawnia się przed zagraniem kart."
        ]
      },
      {
        title: "Zbieranie kart",
        tags: ["wędrówka", "karty", "blind", "spaczenie"],
        source: "system.txt:2332-2341",
        rules: [
          "Każdy gracz zagrywa minimum jedną kartę z ręki; może zagrać więcej.",
          "Gracz bez kart dokłada top-deck blind.",
          "Dodatkowe blind cards: maksymalnie tyle, ilu jest graczy.",
          "Narrator może dołożyć karty z racji Spaczenia postaci.",
          "Gracze nie omawiają otwarcie konkretnych kart z ręki."
        ]
      },
      {
        title: "Tasowanie, reveal i wynik",
        tags: ["wędrówka", "reveal", "narracja", "wynik"],
        source: "system.txt:2342-2358",
        rules: [
          "Po zebraniu kart narrator tasuje je i rozdaje zakryte graczom.",
          "Nadwyżkę kart narrator może rozdać sobie.",
          "Rozdane karty Wędrówki nie trafiają do normalnej ręki.",
          "Gracze po kolei odsłaniają karty i opisują scenę lub odpowiadają na pytanie.",
          "Karta narratora pozwala narratorowi wybrać postaci i opisać scenę albo myśli.",
          "Premię lub karę ujawnia się po odsłonięciu wszystkich kart."
        ]
      },
      {
        title: "Domknięcie Wędrówki",
        tags: ["wędrówka", "discard", "joker", "spaczenie"],
        source: "system.txt:2360-2362",
        rules: [
          "Wszystkie karty zagrane w Wędrówce są odrzucane.",
          "Jokery wracają do talii.",
          "Jeśli zagrano Czarnego Jokera, najpierw dobierz na Spaczenie, potem wtasuj jokera."
        ]
      }
    ]
  },
  {
    title: "Testy, wyzwania, walka i wrogowie",
    entries: [
      {
        title: "Test umiejętności",
        tags: ["test", "umiejętność", "pt", "sukces", "k6"],
        source: "system.txt:100-114, 980-987",
        rules: [
          "Rzuć tyloma k6, ile wynosi poziom wyszkolenia w używanej umiejętności.",
          "Każdy wynik 5 lub 6 daje 1 sukces.",
          "Test jest zdany, jeśli liczba sukcesów jest równa PT albo wyższa.",
          "Atrybut powiązany z umiejętnością określa limit modyfikatorów +One w tym teście.",
          "Użycie atrybutu do modyfikacji testu nie obniża jego wartości."
        ]
      },
      {
        title: "Modyfikatory +One",
        tags: ["+one", "modyfikator", "kość", "przerzut", "karta"],
        source: "system.txt:114-131, 231-234, 982-993",
        rules: [
          "Przed rzutem: tymczasowo zyskaj niewyszkoloną umiejętność na czas testu; kości trzeba dokupić osobno.",
          "Przed rzutem: dodaj 1 kość do puli.",
          "Po rzucie: dodaj +1 do wyniku jednej kości.",
          "Po rzucie: przerzuć dowolną liczbę kości i zachowaj nowy wynik; raz na test.",
          "Kartę można odrzucić jako modyfikator testu zgodnie z limitem +One."
        ]
      },
      {
        title: "Wyzwania",
        tags: ["wyzwanie", "test", "sukcesy"],
        source: "system.txt:141-152",
        rules: [
          "Wyzwanie to test współpracy zbyt trudny dla jednej postaci.",
          "Każdy uczestnik wykonuje test.",
          "Sukcesy uczestników sumują się.",
          "Wyzwanie zdane, jeśli suma sukcesów jest równa lub wyższa od PT."
        ]
      },
      {
        title: "Kolejność walki",
        tags: ["walka", "inicjatywa", "runda"],
        source: "system.txt:309-326",
        rules: [
          "Najwyższa inicjatywa wybiera pierwszego aktora.",
          "Po swojej akcji wykonawca wybiera kolejną osobę.",
          "Ostatnia osoba rundy wybiera startera kolejnej rundy, ale nie siebie.",
          "Remisy inicjatywy można rozstrzygać kolejnymi kartami.",
          "W turze postać wykonuje jedną akcję: atak, test umiejętności albo Szept.",
          "Ruch można wykonać przed akcją lub po niej."
        ]
      },
      {
        title: "Atak, obrona i pancerz",
        tags: ["walka", "pt", "pancerz", "obrażenia"],
        source: "system.txt:324-336",
        rules: [
          "Trafienie: sukcesy ataku >= PT.",
          "PT ataku to atrybut, przeciw któremu wykonywany jest atak.",
          "Dla ataków fizycznych PT = max(Krzepa, Pancerz).",
          "Ataki w inne atrybuty ignorują pancerz."
        ]
      },
      {
        title: "Nadwyżki i efekty broni",
        tags: ["walka", "broń", "nadwyżka", "efekty", "obrażenia"],
        source: "system.txt:403-471",
        rules: [
          "Jeśli sukcesy ataku przewyższają PT, nadwyżkę można wydać po rzucie na efekty dodatkowe broni.",
          "Koszt efektu podany jest w nawiasie przy efekcie.",
          "+1 obrażenie: zwiększa obrażenia ataku.",
          "Trafienie krytyczne: zadaje 1k6 obrażeń zamiast wartości podstawowej.",
          "Przycelowanie: przerzuć kość obrażeń z trafienia krytycznego.",
          "Rozrzut: +1 cel; dla dodatkowych celów porównaj ten sam wynik ataku z ich obroną.",
          "Odłamki: zadają obrażenia 1k6 celom.",
          "Ogłuszenie: nieogłuszeni uczestnicy walki działają przed ogłuszoną postacią.",
          "Przytłoczenie: następny atak dowolnej postaci przeciw temu celowi ignoruje pancerz.",
          "Seria ciosów: wykonaj kolejny atak przeciw temu samemu albo innemu celowi.",
          "Zdruzgotanie: permanentnie obniża pancerz celu o 1."
        ]
      },
      {
        title: "Grupy wrogów",
        tags: ["wrogowie", "grupa", "walka", "wyzwanie"],
        source: "system.txt:2398-2406, 2609-2610",
        rules: [
          "Narrator może grupować wrogów i zmieniać skład grup.",
          "Grupa ma wspólną inicjatywę.",
          "Grupa może atakować razem na zasadach wyzwania.",
          "Tylko jedna broń faktycznie zadaje obrażenia; reszta działa jak ogień zaporowy."
        ]
      },
      {
        title: "Model wrogów",
        tags: ["wrogowie", "npc", "solo", "grupa", "nagroda"],
        source: "system.txt:2609-2625",
        rules: [
          "Wróg typu grupa może atakować razem na zasadach wyzwania.",
          "Wróg typu solo atakuje pojedynczo.",
          "Inicjatywa wroga jest wartością karty.",
          "Krzepa, Spryt, Hart i Pancerz działają jak u postaci graczy.",
          "Pole Nagroda określa liczbę i rodzaj kart przyznanych za pokonanie wroga."
        ]
      }
    ]
  },
  {
    title: "Szepty",
    entries: [
      {
        title: "Sekwencja rzucania Szeptu",
        tags: ["szepty", "czary", "test"],
        source: "system.txt:662-667",
        rules: [
          "1. Wybierz Szept i wzmocnienia.",
          "2. Zapłać koszt.",
          "3. Wykonaj test umiejętności.",
          "4. Rozpatrz dodatkowe poświęcenia, jeśli ścieżka ich wymaga.",
          "5. Przy sukcesie rozpatrz efekt."
        ]
      },
      {
        title: "Rytuały Żywiołów",
        tags: ["szepty", "rytuały żywiołów", "spaczenie", "koszt"],
        source: "system.txt:758-763",
        rules: [
          "Koszt: odrzuć kartę i wykonaj test Szepty przeciw obronie celu.",
          "Jeśli czarownik nie ma kart na ręce, odrzuca top-deck.",
          "Jeśli top-deck przy pustej ręce jest czarny, czarownik ryzykuje Spaczenie."
        ]
      },
      {
        title: "Gwiazdy / Dzień Święty / Zagajnik",
        tags: ["szepty", "gwiazdy", "dzień święty", "zagajnik", "spaczenie"],
        searchAliases: ["zagrajnik"],
        source: "system.txt:748-754, 797-801, 833-836",
        rules: [
          "Gwiazdy i Dzień Święty: inni mogą dołączać karty do rytuału.",
          "Jeśli dołączono choć jedną czarną kartę, czarownik ryzykuje Spaczenie.",
          "Zagajnik: uczestnicy mogą wykładać i zabierać karty według kolejności ustalonej przez czarownika.",
          "Karty pozostałe na stole są odrzucane.",
          "Jeśli cokolwiek zostało na stole, czarownik dobiera na Spaczenie."
        ]
      },
      {
        title: "Wrogowie rzucający Szepty",
        tags: ["szepty", "wrogowie", "koszt"],
        source: "system.txt:2412-2417",
        rules: [
          "Wrogowie rzucają Szepty jak gracze z jednym wyjątkiem.",
          "Jeśli ścieżka wymaga odrzucenia karty, wróg pomija ten koszt."
        ]
      }
    ]
  },
  {
    title: "Rozwój i koniec misji",
    entries: [
      {
        title: "Rozwój umiejętności",
        tags: ["rozwój", "umiejętności", "koszt"],
        source: "system.txt:1067-1076",
        rules: [
          "Rozwój zwykle odbywa się na koniec misji po otrzymaniu kart.",
          "Karty wydane na rozwój są odrzucane.",
          "Nowa umiejętność: koszt = 1 + liczba nowych umiejętności kupionych w ten sposób.",
          "Nowa kość umiejętności: koszt = nowy poziom wyszkolenia + 1."
        ]
      },
      {
        title: "Rozwój atrybutów i modyfikatory",
        tags: ["rozwój", "atrybuty", "kolor", "figury", "asy"],
        source: "system.txt:1078-1090",
        rules: [
          "Podniesienie atrybutu wymaga czerwonych kart.",
          "Koszt podniesienia atrybutu = nowa wartość + 1.",
          "Jeśli wymagane karty są tego samego koloru, koszt spada o 1, ale nadal trzeba mieć pełną liczbę kart; jedną można zachować.",
          "Jeśli wszystkie karty to figury lub asy, efekt rozwoju zwiększa się o 1."
        ]
      },
      {
        title: "Koniec misji",
        tags: ["koniec misji", "atrybuty", "discard", "spaczenie"],
        source: "system.txt:2318-2324",
        rules: [
          "Postacie odzyskują utracone punkty atrybutów.",
          "Gracze wydają zebrane karty na rozwój.",
          "Po rozwoju narrator wtasowuje odrzucone karty z powrotem do talii.",
          "Na koniec misji nie usuwa się Spaczenia."
        ]
      },
      {
        title: "Nagrody i oficer",
        tags: ["nagrody", "oficer", "karty", "misja"],
        source: "system.txt:217-218, 1061-1065, 2624-2625",
        rules: [
          "Karty zdobywa się za przetrwanie misji, cele specjalne i pokonywanie wrogów.",
          "Wrogowie mają wartość nagrody; wariant dla oddziału wymaga decyzji, komu przypisać karty.",
          "Na początku misji oficer może zaryzykować Spaczenie.",
          "Po ryzyku oficer dobiera 4 karty i rozdziela je między oddział z limitem 7 kart na rękę.",
          "Oficer może zachować część lub wszystkie te karty dla siebie."
        ]
      }
    ]
  }
];

export const openGMToolsPanel = (): void => {
  if (!game.user?.isGM) {
    ui.notifications?.warn(
      game.i18n?.localize("NGH.Error.GMOnlyGMToolsPanel") ??
        "Only the GM can open GM Tools."
    );
    return;
  }

  panelInstance ??= new NGHGMToolsPanel();
  void panelInstance.render(true as any);
};

export class NGHGMToolsPanel extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private t(key: string, fallback: string): string {
    const localized = game.i18n?.localize(key);
    return localized && localized !== key ? localized : fallback;
  }

  private get api(): any {
    return (game as typeof game & { ngh?: any }).ngh;
  }

  private readJsonArraySetting(setting: string): string[] {
    const raw = String((game as any).settings?.get(NGH_SYSTEM_ID, setting) ?? "[]");
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [];
    } catch {
      return [];
    }
  }

  private readJsonRecordSetting(setting: string): Record<string, string> {
    const raw = String((game as any).settings?.get(NGH_SYSTEM_ID, setting) ?? "{}");
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};
      return Object.fromEntries(
        Object.entries(parsed).filter((entry): entry is [string, string] =>
          typeof entry[0] === "string" && typeof entry[1] === "string"
        )
      );
    } catch {
      return {};
    }
  }

  private getUsers(): any[] {
    return Array.from(((game as any).users?.contents ?? (game as any).users ?? []) as any[]);
  }

  private getCharacters(): any[] {
    return Array.from(((game as any).actors?.contents ?? []) as any[])
      .filter((actor: any) => actor?.type === "character")
      .sort((a: any, b: any) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
  }

  private parseCards(cards: string[]): GMCardView[] {
    return cards.map((card) => {
      const parsed = this.api?.mechanics?.cards?.parse?.(card);
      const suit = String(parsed?.suit ?? "");
      const isJoker = card === "RJ" || card === "BJ";
      const isRed = isJoker ? card === "RJ" : suit === "hearts" || suit === "diamonds";
      return {
        code: card,
        label: String(parsed?.label ?? card),
        suit,
        isRed,
        isJoker
      };
    });
  }

  private getCorruptionJourneyCards(corruption: number): number {
    if (corruption >= 4) return 2;
    if (corruption >= 3) return 1;
    return 0;
  }

  private getCorruptionClass(corruption: number): string {
    if (corruption >= 5) return "extreme";
    if (corruption >= 4) return "critical";
    if (corruption >= 3) return "warning";
    return "stable";
  }

  private getCharacterGroups(characters: GMCharacterView[]): GMCharacterGroup[] {
    const extreme = characters.filter((character) => character.corruption >= 5);
    const critical = characters.filter((character) => character.corruption === 4);
    const high = characters.filter((character) => character.corruption === 3);
    const stable = characters.filter((character) => character.corruption < 3);

    return [
      {
        key: "extreme",
        title: this.t("NGH.GMTools.CharacterGroup.Extreme", "Ostatnia misja"),
        hint: this.t("NGH.GMTools.CharacterGroup.ExtremeHint", "Spaczenie 5: ostrzeżenie o ostatniej misji."),
        entries: extreme
      },
      {
        key: "critical",
        title: this.t("NGH.GMTools.CharacterGroup.Critical", "Wysokie spaczenie"),
        hint: this.t("NGH.GMTools.CharacterGroup.CriticalHint", "Spaczenie 4: Narrator dodaje 2 karty wędrówki."),
        entries: critical
      },
      {
        key: "high",
        title: this.t("NGH.GMTools.CharacterGroup.High", "Podwyższone spaczenie"),
        hint: this.t("NGH.GMTools.CharacterGroup.HighHint", "Spaczenie 3: Narrator dodaje 1 kartę wędrówki."),
        entries: high
      },
      {
        key: "stable",
        title: this.t("NGH.GMTools.CharacterGroup.Stable", "Stable"),
        hint: this.t("NGH.GMTools.CharacterGroup.StableHint", "Corruption below Journey-card thresholds."),
        entries: stable
      }
    ].filter((group) => group.entries.length > 0);
  }

  private getCharacterViews(): GMCharacterView[] {
    const state = this.api?.mechanics?.cards?.getState?.() ?? { hands: {}, journeyHands: {}, drawPile: [], discardPile: [] };
    const users = this.getUsers();
    const usersByActorId = new Map<string, any>();
    for (const user of users) {
      const actorId = String(user?.character?.id ?? "");
      if (actorId) usersByActorId.set(actorId, user);
    }

    const playedUserIds = this.readJsonArraySetting(JOURNEY_PLAYED_USERS_SETTING);
    const revealedCards = this.readJsonRecordSetting(JOURNEY_REVEALED_SETTING);

    return this.getCharacters().map((actor) => {
      const user = usersByActorId.get(String(actor.id ?? ""));
      const userId = String(user?.id ?? "");
      const standardCards = userId ? this.parseCards(state.hands?.[userId] ?? []) : [];
      const journeyCards = userId ? this.parseCards(state.journeyHands?.[userId] ?? []) : [];
      const corruption = Number(actor.system?.corruption ?? 0);
      const revealKey = userId ? `user:${userId}` : "";
      const revealed = revealKey ? revealedCards[revealKey] : "";

      return {
        actorId: String(actor.id ?? ""),
        name: String(actor.name ?? this.t("NGH.Common.Unknown", "Unknown")),
        userId,
        userName: userId
          ? String(user?.name ?? userId)
          : this.t("NGH.GMTools.Character.Unassigned", "Unassigned"),
        hasUser: Boolean(userId),
        corruption,
        corruptionClass: this.getCorruptionClass(corruption),
        corruptionJourneyCards: this.getCorruptionJourneyCards(corruption),
        contributed: userId ? playedUserIds.includes(userId) : false,
        contributionClass: userId && playedUserIds.includes(userId) ? "done" : "waiting",
        standardCards,
        journeyCards,
        revealLabel: revealed
          ? this.t("NGH.GMTools.Character.Revealed", "Revealed")
          : (journeyCards.length > 0
            ? this.t("NGH.GMTools.Character.FaceDown", "Face-down")
            : this.t("NGH.Common.None", "none")),
        attributes: [
          {
            key: "krzepa",
            label: this.t("NGH.Actor.Attribute.Krzepa", "Krzepa"),
            value: Number(actor.system?.attributes?.krzepa?.value ?? 0),
            max: Number(actor.system?.attributes?.krzepa?.max ?? 0),
            damaged: Number(actor.system?.attributes?.krzepa?.value ?? 0) < Number(actor.system?.attributes?.krzepa?.max ?? 0)
          },
          {
            key: "spryt",
            label: this.t("NGH.Actor.Attribute.Spryt", "Spryt"),
            value: Number(actor.system?.attributes?.spryt?.value ?? 0),
            max: Number(actor.system?.attributes?.spryt?.max ?? 0),
            damaged: Number(actor.system?.attributes?.spryt?.value ?? 0) < Number(actor.system?.attributes?.spryt?.max ?? 0)
          },
          {
            key: "hart",
            label: this.t("NGH.Actor.Attribute.Hart", "Hart"),
            value: Number(actor.system?.attributes?.hart?.value ?? 0),
            max: Number(actor.system?.attributes?.hart?.max ?? 0),
            damaged: Number(actor.system?.attributes?.hart?.value ?? 0) < Number(actor.system?.attributes?.hart?.max ?? 0)
          }
        ]
      };
    });
  }

  private getJourneyStateSummary() {
    const state = this.api?.mechanics?.cards?.getState?.() ?? { hands: {}, journeyHands: {}, drawPile: [], discardPile: [] };
    const poolCards = this.parseCards(this.readJsonArraySetting(JOURNEY_POOL_SETTING));
    const journeyHands = Object.values((state.journeyHands ?? {}) as Record<string, string[]>);
    const standardHands = Object.values((state.hands ?? {}) as Record<string, string[]>);

    return {
      phase: this.t(
        `NGH.Journey.Phase.${String((game as any).settings?.get(NGH_SYSTEM_ID, JOURNEY_PHASE_SETTING) ?? "configure")}`,
        String((game as any).settings?.get(NGH_SYSTEM_ID, JOURNEY_PHASE_SETTING) ?? "configure")
      ),
      deckCount: Number(state.drawPile?.length ?? 0),
      discardCount: Number(state.discardPile?.length ?? 0),
      standardHandTotal: standardHands.reduce((sum, cards) => sum + cards.length, 0),
      journeyHandTotal: journeyHands.reduce((sum, cards) => sum + cards.length, 0),
      poolCount: poolCards.length,
      poolCards,
      extraBlindCount: Math.max(0, Number((game as any).settings?.get(NGH_SYSTEM_ID, JOURNEY_EXTRA_BLIND_COUNT_SETTING) ?? 0)),
      maxHandSize: Number(this.api?.mechanics?.cards?.maxHandSize?.() ?? 7),
      maxJourneyHandSize: Number(this.api?.mechanics?.cards?.maxJourneyHandSize?.() ?? 7)
    };
  }

  private getRuleSections(): GMRuleSection[] {
    return GM_RULE_SECTIONS.map((section) => ({
      ...section,
      entries: section.entries.map((entry) => ({
        ...entry,
        searchText: normalizeSearchText([
          section.title,
          entry.title,
          entry.source,
          ...(entry.searchAliases ?? []),
          ...entry.tags,
          ...entry.rules
        ].join(" "))
      }))
    }));
  }

  static override DEFAULT_OPTIONS = {
    classes: ["ngh", "gm-tools-panel-app"],
    tag: "section",
    position: { width: 980, height: 900 },
    window: { resizable: true },
  };

  override get title(): string {
    return game.i18n?.localize("NGH.GMTools.PanelTitle") ?? "GM Screen";
  }

  static override PARTS = {
    body: {
      template: "systems/nghrpg/templates/gm-tools-panel.html",
      scrollable: [".gm-screen-sidebar", ".gm-screen-main"],
    },
  };

  async _prepareContext(): Promise<any> {
    const characters = this.getCharacterViews();
    const actors = characters
      .map((character) => ({
        name: character.name,
        corruption: character.corruption,
      }))
      .sort((a, b) => b.corruption - a.corruption || a.name.localeCompare(b.name));

    return {
      cssClass: "ngh",
      panelTitle: this.t("NGH.GMTools.PanelTitle", "GM Screen"),
      subtitle: this.t(
        "NGH.GMTools.Subtitle",
        "Session-facing quick references and checklists for Never Going Home."
      ),
      ruleSections: this.getRuleSections(),
      journeyState: this.getJourneyStateSummary(),
      characterGroups: this.getCharacterGroups(characters),
      hasCharacters: characters.length > 0,
      corruptionActors: actors,
      corruptionTriggers: [
        this.t("NGH.GMTools.CorruptionTriggers.BlackJoker", "Black Joker played/revealed"),
        this.t("NGH.GMTools.CorruptionTriggers.Burns", "Black Joker spent or burned (+One / Whisper / Healing / Defense / Advancement)"),
        this.t("NGH.GMTools.CorruptionTriggers.WhisperRank", "Whisper path advanced to rank 3/4/5"),
        this.t("NGH.GMTools.CorruptionTriggers.ElementalRitual", "Elemental Ritual with empty hand and black top-deck card"),
        this.t("NGH.GMTools.CorruptionTriggers.StarsHolyDay", "Stars / Holy Day when ally black card is used"),
        this.t("NGH.GMTools.CorruptionTriggers.Officer", "Officer card-sharing action"),
        this.t("NGH.GMTools.CorruptionTriggers.Incident", "GM-triggered incident"),
      ],
      journeyFlow: [
        this.t("NGH.GMTools.JourneyFlow.Configure", "1. Configure requirements + bonus/penalty"),
        this.t("NGH.GMTools.JourneyFlow.Collect", "2. Collect cards (players + blind cards + corruption cards)"),
        this.t("NGH.GMTools.JourneyFlow.Deal", "3. Shuffle and deal journey cards"),
        this.t("NGH.GMTools.JourneyFlow.Reveal", "4. Reveal cards with suit motif narration"),
        this.t("NGH.GMTools.JourneyFlow.Resolve", "5. Resolve requirement outcome and finish"),
      ],
      combatFlow: [
        this.t("NGH.GMTools.CombatFlow.New", "1. New Combat: load actors and enemy groups"),
        this.t("NGH.GMTools.CombatFlow.Initiative", "2. Initiative: assign cards, resolve ties"),
        this.t("NGH.GMTools.CombatFlow.Start", "3. Start: highest initiative chooses first actor"),
        this.t("NGH.GMTools.CombatFlow.Pass", "4. Active round: each actor passes turn onward"),
        this.t("NGH.GMTools.CombatFlow.EndRound", "5. End round: last actor picks next round starter"),
      ],
      quickReference: [
        this.t("NGH.GMTools.QuickRef.PT", "Attack PT = max(Krzepa, Armor)"),
        this.t("NGH.GMTools.QuickRef.Defense", "Defend with cards: 1 card prevents 1 incoming damage"),
        this.t("NGH.GMTools.QuickRef.Hand", "Standard hand limit: 7 cards"),
        this.t("NGH.GMTools.QuickRef.Corruption34", "Corruption 3 -> +1 journey card; Corruption 4 -> +2 journey cards"),
        this.t("NGH.GMTools.QuickRef.Corruption5", "Corruption 5: final mission state"),
      ],
      sessionChecklist: [
        this.t("NGH.GMTools.SessionChecklist.OpenPanels", "Open Journey / Combat / GM Tools panels"),
        this.t("NGH.GMTools.SessionChecklist.ReviewCorruption", "Review corruption track for all characters"),
        this.t("NGH.GMTools.SessionChecklist.VerifyDeck", "Verify deck/discard and reshuffle status"),
        this.t("NGH.GMTools.SessionChecklist.CheckMission", "Set mission requirements before journey starts"),
      ],
      hasCorruptionActors: actors.length > 0,
    };
  }

  protected override _onRender(_context: Record<string, unknown>, _options: Record<string, unknown>): void {
    const root = this.element;
    const search = root.querySelector<HTMLInputElement>("[data-gm-screen-search]");
    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-gm-rule-card]"));
    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-gm-rule-section]"));
    const empty = root.querySelector<HTMLElement>("[data-gm-screen-empty]");
    const count = root.querySelector<HTMLElement>("[data-gm-screen-count]");
    root.querySelector("[data-action='gm-screen-refresh']")?.addEventListener("click", () => {
      void this.render();
    });

    const applyFilter = (): void => {
      const query = normalizeSearchText(search?.value.trim() ?? "");
      let visibleCount = 0;

      for (const card of cards) {
        const haystack = normalizeSearchText(card.dataset.search ?? card.textContent ?? "");
        const visible = !query || haystack.includes(query);
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      }

      for (const section of sections) {
        const hasVisibleCard = Array.from(section.querySelectorAll<HTMLElement>("[data-gm-rule-card]"))
          .some((card) => !card.hidden);
        section.hidden = !hasVisibleCard;
      }

      if (empty) empty.hidden = visibleCount > 0;
      if (count) count.textContent = String(visibleCount);
    };

    search?.addEventListener("input", applyFilter);
    applyFilter();
  }
}
