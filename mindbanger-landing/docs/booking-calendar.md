# Rezervačný kalendár online služieb

Klient otvorí `/ucet/rezervovat`, vyberie službu, deň a voľný čas a potvrdí žiadosť. Meno a overený email sa preberajú z jeho účtu. Odoslaním sa nevytvorí platba. Termín čaká na potvrdenie administrátorom; klient ho vidí v prehľade aj rezerváciách.

## Otvorenie kalendára

1. Prihláste sa do `/mindbanger_daily/admin/dashboard` a overte MFA.
2. Otvorte `/mindbanger_daily/admin/rezervacie` → **Nastavenia a dostupnosť**.
3. Doplňte skutočné údaje prevádzkovateľa, verejný kontakt a informácie o online stretnutí. Sídlo firmy nie je miestom online stretnutia. Do verejných informácií nevkladajte súkromný odkaz na videohovor.
4. Skontrolujte názvy, trvanie a konečné ceny služieb. Predvyplnené hodnoty nie sú automaticky schválenou ponukou.
5. V karte **Plánovanie dostupnosti** vytvorte týždenný rozvrh s platnosťou od–do a vyberte pracovné polhodiny. V nastaveniach upravte minimálny predstih, počet dní dopredu, prestávku po stretnutí a platnosť čakajúcej žiadosti.
6. Po kontrole prevádzky a podmienok zapnite kalendár a uložte nastavenia. Bez vyplnených údajov a potvrdení sa neotvorí. Online platby zostávajú vypnuté.

Časy sa zobrazujú v pásme Europe/Bratislava. Voľné začiatky sa predvolene ponúkajú po 30 minútach (v admine možno zvoliť 15 alebo 30 minút); musia sa zmestiť do pracovných hodín vrátane prestávky. Existujúce termíny a blokovanie času sa od dostupnosti odpočítavajú.

## Týždenné rozvrhy a výnimky

- **Týždenné rozvrhy:** vytvorte jeden alebo viac rozvrhov s neprekrývajúcimi sa obdobiami platnosti (oba hraničné dátumy sú zahrnuté). Polhodiny označujú pracovné intervaly, nie samostatné rezervácie. Môžete vybrať viac oddelených úsekov v jednom dni.
- **Náhľad a jednotlivé dni:** vyberte týždeň a službu. Kliknutím otvorte či zavrite polhodinu konkrétneho dňa. Vznikne výnimka pre celý deň, nezávislá od neskorších úprav týždenného rozvrhu. Výnimka môže otvoriť deň aj mimo platnosti rozvrhu. Odstránením výnimky sa obnoví týždenný rozvrh, prípadne zatvorený deň.
- **Náhľad začiatkov:** zohľadňuje vybranú službu, celú dĺžku sedenia, prestávku, aktuálne rezervácie a blokovanie, minimálny predstih a rezervačný horizont. Pracovné polhodiny preto nemusia znamenať rovnaký počet rezervovateľných začiatkov.
- **Uloženie:** zmeny sú návrh až do kliknutia na Uložiť plán dostupnosti. Prechod medzi týždňami návrh zachová. Pri neuložených zmenách sú ostatné karty zamknuté; zmeny uložte alebo zahoďte. Súbežná zmena rozvrhu v inom okne vyvolá konflikt namiesto tichého prepísania.
- **Ochrana rezervácií:** zatvorenie pracovného intervalu nemení existujúci termín ani neodosiela jeho zrušenie. Objednané termíny riešte v karte Kalendár. Existujúce blokovanie nemožno obísť otvorením pracovného času.

Nový plánovač sa aktivuje prvým uložením a potom úplne nahrádza pôvodné pracovné hodiny. Mimo rozvrhov a výnimiek je zatvorené; prázdny plánovač znamená zatvorené všetky dni. Kým sa prvýkrát neuloží, staršie pracovné hodiny zostávajú účinné. Uloženie rozvrhu samo osebe nezapína rezervácie ani platby. Aktuálne prevádzkové údaje a schválenia sa nemenia.

Implementácia ukladá plánovač do `appointment_settings.config.planner`; jeho uloženie používa rovnaký transakčný zámok ako vytvorenie rezervácie. Bežné uloženie ostatných nastavení zachová aktuálny plánovač. Migrácia `20261018212637_dated_availability_planner.sql` nemení existujúcu konfiguráciu ani rezervácie. Nové RPC má prístup iba pre service role, volanie admin API vyžaduje MFA.

## Správa rezervácií

- **Potvrdiť:** čakajúca budúca žiadosť sa zmení na potvrdenú; klient dostane notifikáciu emailom.
- **Presunúť:** po dohode s klientom zadajte nový začiatok. Dohodnutá cena, dĺžka a vlastník rezervácie zostávajú zachované. Presun na obsadený čas sa odmietne.
- **Zrušiť:** zruší termín a uvoľní jeho čas. Budúci vlastný termín môže bezplatne zrušiť aj klient.
- **Blokovať čas alebo dovolenku:** vytvorí interval nedostupnosti. Existujúci termín treba najprv presunúť alebo zrušiť, blokovanie ho neprepíše.
- **Absolvované / Neprišiel:** sú dostupné pri potvrdenom stretnutí po jeho začiatku.

Nepotvrdená žiadosť po nastavenej dobe vyprší a prestane blokovať čas. Emailová fronta má opakované doručovanie; zlyhané správy vidno v admine. Cron `/api/cron/appointments` musí zostať aktívny. Spôsob pripojenia na online stretnutie dohodnite s klientom emailom; táto verzia nevytvára videohovory.

## Bezpečnosť a hranice

Rezervácia sa priraďuje overenému účtu v rovnakej databázovej transakcii ako blokovanie času. Súbeh dvoch žiadostí nevytvorí dva termíny v rovnakom čase. Opakované odoslanie tej istej žiadosti je idempotentné. Klient nemôže zmeniť vlastníka, cenu ani stav úhrady a nemôže zrušiť cudzí termín. Administrácia na každom API volaní kontroluje oprávnenie aj MFA.

Telefonicky pridaná žiadosť v staršom admin formulári sa automaticky nepriraďuje k účtu len podľa zadaného emailu. Klientské zobrazenie obsahuje rezervácie vytvorené cez jeho overený účet. Online platby, zálohy, automatické platenie ani refundácie nie sú súčasťou tejto etapy.
