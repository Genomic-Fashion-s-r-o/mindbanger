# Rezervačný kalendár online služieb

Klient otvorí `/ucet/rezervovat`, vyberie službu, deň a voľný čas a potvrdí žiadosť. Meno a overený email sa preberajú z jeho účtu. Odoslaním sa nevytvorí platba. Termín čaká na potvrdenie administrátorom; klient ho vidí v prehľade aj rezerváciách.

## Otvorenie kalendára

1. Prihláste sa do `/mindbanger_daily/admin/dashboard` a overte MFA.
2. Otvorte `/mindbanger_daily/admin/rezervacie` → **Nastavenia a dostupnosť**.
3. Doplňte skutočné údaje prevádzkovateľa, verejný kontakt a informácie o online stretnutí. Sídlo firmy nie je miestom online stretnutia. Do verejných informácií nevkladajte súkromný odkaz na videohovor.
4. Skontrolujte názvy, trvanie a konečné ceny služieb. Predvyplnené hodnoty nie sú automaticky schválenou ponukou.
5. Nastavte dni a hodiny, minimálny predstih, počet dní dopredu, prestávku po stretnutí a platnosť čakajúcej žiadosti.
6. Po kontrole prevádzky a podmienok zapnite kalendár a uložte nastavenia. Bez vyplnených údajov a potvrdení sa neotvorí. Online platby zostávajú vypnuté.

Časy sa zobrazujú v pásme Europe/Bratislava. Voľné začiatky sa predvolene ponúkajú po 30 minútach (v admine možno zvoliť 15 alebo 30 minút); musia sa zmestiť do pracovných hodín vrátane prestávky. Existujúce termíny a blokovanie času sa od dostupnosti odpočítavajú.

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
