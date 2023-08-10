const feiertagTexts = ['Maria Hf.', 'Chr.Himm.', 'Nationalft', 'Allerheil.', 'Neujahr', 'Maria Empf', 'Hl.Abend', 'Christtag', 'Stefanitag', 'Staatsft.', 'Pfingstmo.', 'Fronleichn'];
const sonstigeFreieTageTexts = ['Todesfall', 'Betriebsausflug', 'Reisezeit', 'Arbeitszeit_(Re', 'Außendienst'];

const DEBUG_OUTPUT = true;

function calc() {
    if (!DEBUG_OUTPUT) console.debug = function(){};

    console.debug('################### START ####################');

    clearErrors();
    saveValuesInCookie();


    let sapText = $('#sap-text').val();

    sapText = getEssentialSAPText(sapText);

    sapText = sapText.replaceAll('Fortbildung ext', 'Fortbildung_ext')
        .replaceAll('ganztägiger Zei', 'ganztägiger_Zei')
        .replaceAll('Erfaßte Zeiten', 'Erfaßte_Zeiten')
        .replaceAll('Krankheit Covid', 'Krankheit')
        .replaceAll('Todesfall Sonst', 'Todesfall')
        .replaceAll('Arbeitszeit (Re', 'Arbeitszeit_(Re');

        for (let feiertagText of feiertagTexts) {
        sapText = sapText.replaceAll(feiertagText, 'Feiertag');
    }
    for (let sonstigeFreieTageText of sonstigeFreieTageTexts) {
        sapText = sapText.replaceAll(sonstigeFreieTageText, 'Sonstiges');
    }

    let sapLines = sapText.split("\n");

    let urlaubsTageBisher = calcUrlaubsTage(sapLines);
    let krankheitsTageBisher = calcKrankheit(sapLines);
    let zaGanzTageBisher = calcZAGanztaegig(sapLines);
    let schulungHoursBisher = calcSchulungHours(sapLines);
    let feierTageBisher = calcFeiertage(sapLines);
    let sonstigeFreieTageBisher = calcSonstigeFreieTage(sapLines);


    sapLines = removeNonsense(sapLines);
    sapLines = fillLines(sapLines);
    sapLines = removeSpecialDays(sapLines);

    let ungebuchteTage = calcUngebuchteTage(sapLines);
    let bookings = convertToBookings(sapLines);
    let timeAnwesend = calcAnwesenheit(bookings);

    let sollHoursPerWeek = $('#hoursPerWeek').val();
    let sollHoursPerMonth = round(166.666666 / 38.5 * sollHoursPerWeek );
    console.debug('# Soll Arbeitszeit / Monat: ' + sollHoursPerMonth + 'h');

    let workingHoursPerDay = sollHoursPerWeek / 5;
    // 7,7h / Tag bei 38,5h

    let sollAnwesenheitPerMonth = round((sollHoursPerMonth * 0.4) );
    // console.log('# Soll Anwesenheit / Monat: ' + sollHoursPerMonth + 'h');

    let anwesenheitPerDay = round((sollHoursPerWeek / 5) * 0.4);
    // console.log('# Soll Anwesenheit / Tag: ' + anwesenheitPerDay + 'h');


    let futureFreeDays =  parseInt($('#freeDays').val());
    let planedHolidays = parseInt($('#planedHolidays').val());
    let planedSchulung = parseInt($('#planedSchulung').val());

    // let finalWorkingDays = workingDays - futureFreeDays- planedHolidays - urlaubsTageBisher;
    // ECHTE noch zu erbringende Anwesenheit:
    let sollAnwesenheitThisMonth = sollAnwesenheitPerMonth -
        ((krankheitsTageBisher + futureFreeDays +
            urlaubsTageBisher + planedHolidays +
            zaGanzTageBisher +
            feierTageBisher + sonstigeFreieTageBisher) * anwesenheitPerDay
            + (planedSchulung * workingHoursPerDay)
            + schulungHoursBisher
        );

    let sollAnwesenheitSAP = sollAnwesenheitPerMonth -
        ((krankheitsTageBisher + urlaubsTageBisher + zaGanzTageBisher + feierTageBisher + sonstigeFreieTageBisher) * anwesenheitPerDay + schulungHoursBisher)
        - timeAnwesend;
    sollAnwesenheitThisMonth = round(sollAnwesenheitThisMonth);

    console.debug('# Soll Anwesenheit: ' + sollAnwesenheitThisMonth + 'h');
    console.debug('# Soll Anwesenheit/Monat: ' + sollAnwesenheitPerMonth + 'h');
    console.debug('# Urlaubstage bisher: ' + urlaubsTageBisher);
    console.debug('# Urlaubstage geplant: ' + planedHolidays);
    console.debug('# Anwesend IST:  ' + round(timeAnwesend) + 'h');
    console.debug('# Anwesend SOLL (lt. SAP): ' + onlyPositive(round(sollAnwesenheitSAP) + 'h'));
    console.debug('# Anwesend SOLL: ' + round(sollAnwesenheitThisMonth) + 'h');
    let anwesendDIFF = sollAnwesenheitThisMonth - timeAnwesend;
    console.debug('# Restzeit: ' + round(anwesendDIFF )  + 'h');


    let heuteAnwesend = $('#heuteAnwesend').is(':checked');
    let heuteAnwesendSeit = $('#heuteAnwesendSeit').val();
    let arrHeuteAnwesendSeit = heuteAnwesendSeit.split(":");
    let timeStart = parseInt(arrHeuteAnwesendSeit[0]) + parseInt(arrHeuteAnwesendSeit[1]) / 60;
    let timeEnd = new Date().getHours() + new Date().getMinutes() / 60;
    let timeAnwesendHeute = 0;
    if (heuteAnwesend) {
        timeAnwesendHeute = round(timeEnd - timeStart);
        console.debug('# Anwesend heute: ' + timeAnwesendHeute + 'h');
        if (timeAnwesendHeute > 6 && timeAnwesendHeute < 6.5) timeAnwesendHeute = 6;
        if (timeAnwesendHeute > 6.5) timeAnwesendHeutes -= 0.5;
        console.debug('# Anwesend heute (korrigiert): ' + timeAnwesendHeute + 'h');
    }
    let anwesendDIFF2 = anwesendDIFF - timeAnwesendHeute;



    $('#sollArbeitszeit').text(formatHour(sollHoursPerMonth));
    $('#sollAnwesenheit').text(formatHour(sollAnwesenheitPerMonth));
    $('#sollAnwesenheitSAP').text(formatHour(sollAnwesenheitSAP, true));

    if (urlaubsTageBisher > 0) {
        $('.row.urlaubeBisher').show();
        $('#urlaubeBisherTage').text(urlaubsTageBisher);
        $('#urlaubeBisherStunden').text(formatHour(urlaubsTageBisher * anwesenheitPerDay));
    } else {
        $('.row.urlaubeBisher').hide();
    }

    if (planedHolidays > 0) {
        $('.row.urlaubeGeplant').show();
        $('#urlaubeGeplantTage').text(planedHolidays);
        $('#urlaubeGeplantStunden').text(formatHour(planedHolidays * anwesenheitPerDay));
    } else {
        $('.row.urlaubeGeplant').hide();
    }

    if (feierTageBisher > 0) {
        $('.row.feiertageBisher').show();
        $('#feiertageBisherTage').text(feierTageBisher);
        $('#feiertageBisherStunden').text(formatHour(feierTageBisher * anwesenheitPerDay));
    } else {
        $('.row.feiertageBisher').hide();
    }

    if (futureFreeDays > 0) {
        $('.row.feiertageGeplant').show();
        $('#feiertageGeplantTage').text(futureFreeDays);
        $('#feiertageGeplantStunden').text(formatHour(futureFreeDays * anwesenheitPerDay));
    } else {
        $('.row.feiertageGeplant').hide();
    }

    if (sonstigeFreieTageBisher > 0) {
        $('.row.sonstiges').show();
        $('#sonstigesTage').text(sonstigeFreieTageBisher);
        $('#sonstigesStunden').text(formatHour(sonstigeFreieTageBisher * anwesenheitPerDay));
    } else {
        $('.row.sonstiges').hide();
    }


    if (krankheitsTageBisher > 0) {
        $('.row.krankheit').show();
        $('#krankheitBisherTage').text(krankheitsTageBisher);
        $('#krankheitBisherStunden').text(formatHour(krankheitsTageBisher * anwesenheitPerDay));
    } else {
        $('.row.krankheit').hide();
    }
    if (schulungHoursBisher > 0) {
        $('.row.schulungBisher').show();
        $('#schulungBisherTage').text(schulungHoursBisher / workingHoursPerDay);
        $('#schulungBisherStunden').text(formatHour(schulungHoursBisher));
    } else {
        $('.row.schulungBisher').hide();
    }
    if (planedSchulung > 0) {
        $('.row.schulungGeplant').show();
        $('#schulungGeplantTage').text(planedSchulung);
        $('#schulungGeplantStunden').text(formatHour(planedSchulung * workingHoursPerDay));
    } else {
        $('.row.schulungGeplant').hide();
    }

    if (zaGanzTageBisher > 0) {
        $('.row.zeitausgleich').show();
        $('#zaBisherTage').text(zaGanzTageBisher);
        $('#zaBisherStunden').text(formatHour(zaGanzTageBisher * anwesenheitPerDay));
    } else {
        $('.row.zeitausgleich').hide();
    }
    if (heuteAnwesend) {
        $('.row.anwesendHeute').show();
        $('.row.dividerAfterAnwesendHeute').show();
        $('.row.anwesendSumWithHeute').show();
    } else {
        $('.row.anwesendHeute').hide();
        $('.row.dividerAfterAnwesendHeute').hide();
        $('.row.anwesendSumWithHeute').hide();
    }

    $('#sollAnwesenheitKorrigiert').text(formatHour(sollAnwesenheitThisMonth));
    $('#timeAnwesend').text(formatHour(timeAnwesend));
    $('#anwesendDIFF').text(formatHour(anwesendDIFF, true));
    $('#timeAnwesendHeute').text(formatHour(timeAnwesendHeute));
    $('#anwesendDIFF2').text(anwesendDIFF2 > 0 ? formatHour(anwesendDIFF2)  : 0);

    $('.result').removeClass('hidden');
    $('#btnCalc').hide();
}

/**
 * Speichert die aktuellen relevanten Eingaben im Cookie:
 *   - Stunden/Woche (38.5, 30, ...)
 *   - Anwesend heute seit:
 *
 */
function saveValuesInCookie() {
    Cookies.set('zenacu-sap', $('#sap-text').val());
    Cookies.set('zenacu-hoursperweek', $('#hoursPerWeek').val());
    Cookies.set('heuteAnwesend', $('#heuteAnwesend').is(':checked'));
    Cookies.set('heuteAnwesendSeit', $('#heuteAnwesendSeit').val());
    Cookies.set('planedHolidaysDates', $('#planedHolidaysDates').val());
    Cookies.set('planedSchulungDates', $('#planedSchulungDates').val());
}

/**
 * Lädt die Daten aus den Cookies, falls vorhanden.
 *
 * @param sapLines
 * @returns {number}
 */
function loadValuesFromCookie() {
    $('#sap-text').val(Cookies.get('zenacu-sap'));
    if (Cookies.get('zenacu-hoursperweek')) {
        $('#hoursPerWeek').val(Cookies.get('zenacu-hoursperweek'));
    }
    if (Cookies.get('heuteAnwesendSeit')) {
        $('#heuteAnwesendSeit').val(Cookies.get('heuteAnwesendSeit'));
    }
    if (Cookies.get('heuteAnwesend')) {
        $('#heuteAnwesend').attr('checked', Cookies.get('heuteAnwesend') == 'true');
    }
    if (Cookies.get('planedHolidaysDates')) {
        var dates = Cookies.get('planedHolidaysDates').split(', ');
        for (let date of dates) {
            var oDate = new Date(date.split('-')[0], date.split('-')[1]-1, date.split('-')[2]);
            if(oDate.getTime() < new Date().getTime()) continue;
            $('#planedHolidaysDatepicker').multiDatesPicker('addDates', [oDate]);
        }
        $('#planedHolidays').val( $('#planedHolidaysDatepicker').multiDatesPicker('getDates').length );
    }

    if (Cookies.get('planedSchulungDates')) {
        var dates = Cookies.get('planedSchulungDates').split(', ');
        for (let date of dates) {
            var oDate = new Date(date.split('-')[0], date.split('-')[1]-1, date.split('-')[2]);
            if(oDate.getTime() < new Date().getTime()) continue;
            $('#planedSchulungDatepicker').multiDatesPicker('addDates', [oDate]);
        }
        $('#planedSchulung').val( $('#planedSchulungDatepicker').multiDatesPicker('getDates').length );
    }
}


function calcUrlaubsTage(sapLines) {
   return calcSpecialDays(sapLines, 'Gebührenurlaub')
}

function calcKrankheit(sapLines) {
    return calcSpecialDays(sapLines, 'Krankheit');
}

function calcZAGanztaegig(sapLines) {
    return calcSpecialDays(sapLines, 'ganztägiger_Zei');
}

function calcSchulungHours(sapLines) {
    return calcSpecialHours(sapLines, 'Fortbildung_ext');
}

function calcFeiertage(sapLines) {
    return calcSpecialDays(sapLines, 'Feiertag');
}

function calcSonstigeFreieTage(sapLines) {
    return calcSpecialDays(sapLines, 'Sonstiges');
}

/**
 * Generische Methode
 * Zählt die Anzahl der Tage, an denen in Spalte 3 gesuchte prefix vorkommt
 * z.B. "26 Mo Krankheit"
 *
 * @param sapLines
 * @returns {number}
 */
function calcSpecialDays(sapLines, prefix) {
    let result = 0;
    for (const line of sapLines) {
        const sapCols = line.split(" ");
        if (sapCols[2] == prefix) {
            result++;
        }
    }
    return result;
}

/**
 * wie calcSpecialDays(), nur dass die Stunden anstelle der Tage zurückgeliefert werden.
 *
 * @param sapLines
 * @returns {number}
 */
function calcSpecialHours(sapLines, prefix) {
    let result = 0;
    for (const line of sapLines) {
        const sapCols = line.split(" ");
        if (sapCols[2] == prefix) {
            // console.error(prefix + " found: " + line, sapCols);
            // console.error(parseFloat(sapCols[7].replaceAll(',', '.')));
            // example: "19 Mo Fortbildung_ext 6,00 6,00"
            if (sapCols.length == 5) {
                result += parseFloat(sapCols[4].replaceAll(',', '.'));
            } else {
                // Default:
                result += parseFloat(sapCols[7].replaceAll(',', '.'));
            }

        }
    }
    return result;
}

/**
 * Zählt die Anzahl der Tage, an denen vergessen wurde zu buchen
 *
 * @param sapLines
 * @returns {number}
 */
function calcUngebuchteTage(sapLines) {
    let result = 0;
    for (const line of sapLines) {
        const sapCols = line.split(" ");
        if (sapCols.length == 4) {
            // console.debug("Ungebuchte Tage found: " + line);
            showError("Stunden nicht gebucht am: " + sapCols[1] + ", den " + sapCols[0] + ".");
            result++;
        }
    }
    return result;
}


/**
 * Liefert nur der für uns relevanten SAP-Buchungstext.
 * Alles davor und danach wird abgeschnitten und verworfen.
 *
 * @param sapLines
 * @returns {string}
 */
function getEssentialSAPText(sapLines) {
    const startText = "Tag Text Beguz Enduz erf. Sollz Rahmz Glz 50% Ü 100% Ü GLZ VP n.g.ÜS Pausch täg.RZ Rufbe";
    const idx1 = sapLines.indexOf(startText);
    if (idx1 !== -1) {
        const idx2 = sapLines.indexOf("S u m m e n ü b e r s i c h t");
        sapLines = sapLines.substring(idx1 + startText.length + 1, idx2 - 1);
        $('#sap-text').val(sapLines);
    }
    return sapLines;
}

/**
 * Entfernt Zeilen, die nicht benötigt werden, wie z.B. "Wochensumme",
 * oder Wochenenden (Sa + So), sofern es keine Buchungen am WE gab.
 *
 * @param sapLines
 * @returns {*[]}
 */
function removeNonsense(sapLines) {
    let result = [];
    for (let line of sapLines) {
        line = line.trim();
        if (line == '') continue;
        const sapCols = line.split(' ');
        if (['Wochensumme'].includes(sapCols[0])) {
            // console.debug("Wochensumme found: " + line);
            continue;
        }
        if (sapCols.length == 2) {      // zB. "03 Sa"
            // console.debug("Weekend found: " + line);
            continue;
        }
        result.push(line);
    }
    return result;
}

/**
 * Entfernt alle speziellen Tage, wie Krankheit, Arztbesuch, Fortbildung, etc.,
 * sodass nur noch echte Zeitbuchungen übrig bleiben.
 *
 * Diese Funktion wird aufgerufen, NACHDEM die Krankheits-Tage, Artz-Tage, etc. gezählt wurden.
 *
 * @param sapLines
 * @returns {*[]}
 */
function removeSpecialDays(sapLines) {
    let result = [];
    for (let line of sapLines) {
        line = line.trim();
        const sapCols = line.split(' ');
        if (['Gebührenurlaub', 'Krankheit', 'Arztbesuch', 'Fortbildung_ext', 'ganztägiger_Zei', 'Erfaßte_Zeiten', 'Sonstiges'].includes(sapCols[2])) {
            // console.debug("Spezialtag found: " + line);
            continue;
        }
        if (sapCols[2] == 'Teleworking' || sapCols[0] == 'Teleworking' ) {
            // console.debug("Teleworking found: " + line);
            continue;
        }
        if (sapCols[2] == 'Feiertag') {
            // console.debug("Feiertag found: " + line);
            continue;
        }
        result.push(line);
    }
    return result;
}


function fillLines(sapLines) {
    let result = [];
    let lastDay = 0, lastWeekday = '';
    for (let line of sapLines) {
        line = line.trim();
        const sapCols = line.split(' ');
        let day = sapCols[0];
        let weekday = sapCols[1];

        if (['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].includes(weekday)) {
            lastDay = day;
            lastWeekday = weekday;
            // console.log("Saving day: " + lastDay);
        } else {
            day = lastDay;
            weekday = lastWeekday;
            sapCols.unshift(day, weekday);
            line = sapCols.join(' ');
            // console.error('unshifted: ' + line);
        }
        result.push(line);
    }
    return result;
}

function convertToBookings(sapLines) {
    let bookings = [];
    let lastCompleteDay = 0;
    let lastWeekDay = '';
    let firstLineOfMultiLine = false;
    let lastLineOfMultiLine = false;
    let lastIncompleteTime = 0;

    // console.table(sapLines);

    for (let idx = 0; idx < sapLines.length; ++idx) {
        firstLineOfMultiLine = false;
        lastLineOfMultiLine = false;

        let line = sapLines[idx];
        if (line.trim() == '') continue;
        let sapCols = line.split(' ');
        // console.table(sapCols);
        // console.log(line)
        // console.error("length: ", sapCols.length)

        if (sapCols.length == 9) {
            // Checking incomplete line (without "04" on 3rd place) - by Zeitbuchungskorrektur
            // zB: "11 Di 11 08:49 17:15 8,43 7,70 7,93 0,23"        which should be
            //     "11 Di 04 11 08:49 17:15 8,43 7,70 7,93 0,23"
            // console.log("Ungewöhnliche Zeile: " + line)
            if (sapCols[0].length == 2 && sapCols[1].length == 2 && sapCols[2].length == 2
                && sapCols[4].length !== 2) {
                sapCols = [ ...sapCols.slice(0, 2), '04', ...sapCols.slice(2)];
                line = sapCols.join(' ');
            }
            // console.log("After change: " + line)
        }


        // Plausi-Check:
        if (sapCols[2].length != 2 || sapCols[3].length != 2) {
            if (sapCols.length == 4) { // Ungebuchte Tage
                continue;
            } else if (sapCols.length == 8 ) { // Folg-Zeilen einer mehrzeiligen Buchung?
                lastLineOfMultiLine = true;
                // console.error("lastLineOfMultiLine: " +  line)
                // console.table(sapCols);
            } else {
                console.error("Ignoring unknown line: " + line);
                // console.table(sapCols);
                showError("Ignoring unknown line: " + line + ' <a href="mailto:rene.huber@brz.gv.at?subject='
                + encodeURI('Zenacu-Feedback: Unknown Line in SAP found') + '&body=' + encodeURI(line) + '">Inform Developer</a>');
                continue;
            }
        }
        if (sapCols.length == 7) { // 1. Zeile einer mehrzeiligen Buchung?
            firstLineOfMultiLine = true;
            // console.log("firstLineOfMultiLine: " +  line)
            // console.table(sapCols);
            // console.error("XXXXXX")
            continue;
        }
        if (sapCols.length == 10 ) { // Folg-Zeilen einer mehrzeiligen Buchung?
            lastLineOfMultiLine = true;
            // console.error("lastLineOfMultiLine: " + line)
            // console.table(sapCols);
        }

        // Normales Booking von 1-Zeiler:
        let day = parseInt(sapCols[0]);
        let weekDay = sapCols[1];
        let time = sapCols.length == 10 ? parseNumber(sapCols[8]) : parseNumber(sapCols[6]);
        // console.log("time: ", time);


        if (!lastLineOfMultiLine) {
            if (time > 6 && time < 6.5) time = 6;
            if (time > 6.5) time -= 0.5;
        }

        // console.log("Full line found: " + line);
        let booking = bookings[day] ;
        if (booking) {
            booking = bookings[day];
            booking.time += time;
        } else {
             booking = new Booking(day, weekDay, time);
        }
        bookings[day] = booking;
    }
    // console.table(bookings);
    return bookings;
}

function Booking(day, weekDay, time) {
    this.day = day;
    this.weekDay = weekDay;
    this.time = time;
}

function calcAnwesenheit(bookings) {
    let anwesend = 0;
    for (const booking of bookings) {
        if (!booking) continue;
        anwesend += booking.time;
    }
    return anwesend;
}

function clearErrors() {
    $('.errors').addClass('hidden');
    $('.errors .alert').html('');
}

function showError(text) {
    $('.errors').removeClass('hidden');
    $('.errors .alert').html( $('.errors .alert').html() + '<p>' + text + '</p>');
}

function parseNumber(val) {
    return val ? parseFloat(val.replace(',', '.')) : val;
}

function round(val) {
    return Math.round(val * 100) / 100;
}

function onlyPositive(val) {
    return val > 0 ? val : 0;
}

function formatHour(val, onlyPos = false) {
    // return round( onlyPos ? onlyPositive(val) : val).toLocaleString('de-DE');
    return round( onlyPos ? onlyPositive(val) : val).toFixed(2).toString().replaceAll('.', ',');
}

function getHollidays() {
    let dateNow = new Date();
    let dayNow = dateNow.getDate();        // z.B. 28.
    let daysThisMonth = getDaysInMonth(dateNow.getFullYear(), dateNow.getMonth()+1);

    $.ajax({
        url: "https://date.nager.at/Api/v2/PublicHolidays/" + dateNow.getFullYear() + "/AT",
        dataType: 'json',
        contentType:"application/json; charset=utf-8",
        type: 'GET',
        success: function(results) {
            // console.log(results);
            // console.error("Heute: " + dayNow);
            // console.error("daysThisMonth: " + daysThisMonth);

            let feiertage = [];

            for (let day=dayNow; day<=daysThisMonth; day++) {   // TODO: 26 => dayNow
                let actDate = new Date(dateNow.getFullYear(), dateNow.getMonth(), day);
                let isWeekend = actDate.getDay() == 0 || actDate.getDay() == 6;
                // console.log("day " + day + ": " + isWeekend);
                if (!isWeekend) {
                    for (const result of results) {
                        // console.log(result.date);
                        const resultSplit = result.date.split('-');

//                        console.log(resultSplit);
//                        console.log(result.date + " => " + actDate.getFullYear() + "-" + actDate.getMonth() + "-" + actDate.getDate());

                        if (parseInt(resultSplit[0]) == actDate.getFullYear() &&
                            parseInt(resultSplit[1]) == actDate.getMonth()+1 &&
                            parseInt(resultSplit[2]) == actDate.getDate()) {
                            feiertage.push({date: result.date, name: result.localName});
                        }
                    }
                }
            }
            setFeiertage(feiertage);
            calc();
        }
    });
}

function setFeiertage(feiertage) {
    $('#freeDays').val( feiertage.length);

    let feiertageText = '';
    for (const feiertag of feiertage) {
        feiertageText +=  '<p>' + feiertag.date + ' - ' + feiertag.name + '</p>';
    }
    if (feiertageText) {
        $('#modal-freedays .modal-body').html(feiertageText);
    }
}

function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function watchInputs() {
    $('#inputs input').on('change', () => calc());

    $('#inputs textarea').on('change, keydown, keyup', () => {
        $('#btnCalc').show();
    });
}


$('#planedHolidaysDatepicker').multiDatesPicker({
    altField: '#planedHolidaysDates',
    firstDay: 1,
    dateFormat: "yy-m-d",
    minDate: 0,     // today
    maxDate: (getDaysInMonth(new Date().getFullYear(), new Date().getMonth()+1) - new Date().getDay() + 1),
    onSelect: function(dateText) {
        var dates = $('#planedHolidaysDatepicker').multiDatesPicker('getDates');
        $('#planedHolidays').val( dates.length );
        calc();
    }
});

$('#planedSchulungDatepicker').multiDatesPicker({
    altField: '#planedSchulungDates',
    firstDay: 1,
    dateFormat: "yy-m-d",
    minDate: 0,     // today
    maxDate: (getDaysInMonth(new Date().getFullYear(), new Date().getMonth()+1) - new Date().getDay() + 1),
    onSelect: function(dateText) {
        var dates = $('#planedSchulungDatepicker').multiDatesPicker('getDates');
        $('#planedSchulung').val( dates.length );
        calc();
    }
});


loadValuesFromCookie()
getHollidays();
watchInputs();

calc();





