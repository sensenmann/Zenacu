const feiertagTexts = ['Maria Hf.', 'Chr.Himm.', 'Nationalft', 'Allerheil.', 'Neujahr', 'Maria Empf', 'Hl.Abend', 'Christtag', 'Stefanitag'];

function calc() {
    clearErrors();
    saveValuesInCookie();

    let sapText = $('#sap-text').val();

    sapText = getEssentialSAPText(sapText);

    sapText = sapText.replaceAll('Fortbildung ext', 'Fortbildung_ext')
        .replaceAll('ganztägiger Zei', 'ganztägiger_Zei')
        .replaceAll('Erfaßte Zeiten', 'Erfaßte_Zeiten')
        .replaceAll('Krankheit Covid', 'Krankheit');

    for (let feiertagText of feiertagTexts) {
        sapText = sapText.replaceAll(feiertagText, 'Feiertag');
    }

    let sapLines = sapText.split("\n");

    let urlaubsTage = calcUrlaubsTage(sapLines);
    let krankheitsTage = calcKrankheit(sapLines);
    let zaGanzTage = calcZAGanztaegig(sapLines);
    let schulungHours = calcSchulungHours(sapLines);
    let feierTage = calcFeiertage(sapLines);


    sapLines = removeNonsense(sapLines);
    sapLines = fillLines(sapLines);
    sapLines = removeSpecialDays(sapLines);

    let ungebuchteTage = calcUngebuchteTage(sapLines);
    let bookings = convertToBookings(sapLines);
    let timeAnwesend = calcAnwesenheit(bookings);

    let sollHoursPerWeek = $('#hoursPerWeek').val();
    let sollHoursPerMonth = round(166.666666 / 38.5 * sollHoursPerWeek );
    // console.log('# Soll Arbeitszeit / Monat: ' + sollHoursPerMonth + 'h');

    let sollAnwesenheitPerMonth = round((sollHoursPerMonth * 0.4) );
    // console.log('# Soll Anwesenheit / Monat: ' + sollHoursPerMonth + 'h');

    let anwesenheitPerDay = round((sollHoursPerWeek / 5) * 0.4);
    // console.log('# Soll Anwesenheit / Tag: ' + anwesenheitPerDay + 'h');


    let futureFreeDays =  parseInt($('#freeDays').val());
    let planedHolidays = parseInt($('#planedHolidays').val());
    let planedSchulung = parseInt($('#planedSchulung').val());

    // let finalWorkingDays = workingDays - futureFreeDays- planedHolidays - urlaubsTage;
    let sollAnwesenheitThisMonth = sollAnwesenheitPerMonth -
        ((krankheitsTage + futureFreeDays +
            urlaubsTage + planedHolidays +
            planedSchulung +
            zaGanzTage +
            feierTage) * anwesenheitPerDay
            + (schulungHours * 0.4)
        );

    let sollAnwesenheitSAP = sollAnwesenheitPerMonth -
        ((krankheitsTage + urlaubsTage + zaGanzTage +feierTage) * anwesenheitPerDay +
            (schulungHours * 0.4))
        - timeAnwesend;

    sollAnwesenheitThisMonth = round(sollAnwesenheitThisMonth);

    // console.log('# Soll Anwesenheit (korrigiert): ' + sollAnwesenheitThisMonth + 'h');
    // outputDebug(sapLines);
    // console.debug('# Arbeitstage: ' + workingDays);
    // console.debug('# Urlaubstage bisher: ' + urlaubsTage);
    // console.debug('# Urlaubstage geplant: ' + planedHolidays);
    // console.debug('# Arbeitstage relevant: ' + finalWorkingDays + 'd');
    // console.debug('# Arbeitszeit relevant: ' + (finalWorkingDays * sollHoursPerDay) + 'h');
    // console.debug('# Anwesend IST:  ' + round(timeAnwesend) + 'h');
    // console.debug('# Anwesend SOLL (lt. SAP): ' + onlyPositive(round(sollAnwesenheitSAP) + 'h'));
    // console.debug('# Anwesend SOLL: ' + round(sollAnwesenheitThisMonth) + 'h');
    let anwesendDIFF = sollAnwesenheitThisMonth - timeAnwesend;
    // console.debug('# Restzeit: ' + round(anwesendDIFF )  + 'h');



    let heuteAnwesend = $('#heuteAnwesend').is(':checked');
    let heuteAnwesendSeit = $('#heuteAnwesendSeit').val();
    let arrHeuteAnwesendSeit = heuteAnwesendSeit.split(":");
    let timeStart = parseInt(arrHeuteAnwesendSeit[0]) + parseInt(arrHeuteAnwesendSeit[1]) / 60;
    let timeEnd = new Date().getHours() + new Date().getMinutes() / 60;
    let timeAnwesendHeute = 0;
    if (heuteAnwesend) {
        timeAnwesendHeute =timeEnd - timeStart;
        if (timeAnwesendHeute > 6 && timeAnwesendHeute < 6.5) timeAnwesendHeute = 6;
        if (timeAnwesendHeute > 6.5) timeAnwesendHeute -= 0.5;
    }
    let anwesendDIFF2 = anwesendDIFF - timeAnwesendHeute;




    $('#sollArbeitszeit').text(formatHour(sollHoursPerMonth));
    $('#sollAnwesenheit').text(formatHour(sollAnwesenheitPerMonth));
    $('#sollAnwesenheitSAP').text(formatHour(sollAnwesenheitSAP, true));

    if (urlaubsTage > 0) {
        $('.row.urlaubeBisher').show();
        $('#urlaubeBisherTage').text(urlaubsTage);
        $('#urlaubeBisherStunden').text(formatHour(urlaubsTage * anwesenheitPerDay));
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

    if (feierTage > 0) {
        $('.row.feiertageBisher').show();
        $('#feiertageBisherTage').text(feierTage);
        $('#feiertageBisherStunden').text(formatHour(feierTage * anwesenheitPerDay));
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


    if (krankheitsTage > 0) {
        $('.row.krankheit').show();
        $('#krankheitBisherTage').text(krankheitsTage);
        $('#krankheitBisherStunden').text(formatHour(krankheitsTage * anwesenheitPerDay));
    } else {
        $('.row.krankheit').hide();
    }
    if (schulungHours > 0) {
        $('.row.schulungBisher').show();
        $('#schulungBisherTage').text(schulungHours / anwesenheitPerDay);
        $('#schulungBisherStunden').text(formatHour(schulungHours * 0.4));
    } else {
        $('.row.schulungBisher').hide();
    }
    if (planedSchulung > 0) {
        $('.row.schulungGeplant').show();
        $('#schulungGeplantTage').text(planedSchulung);
        $('#schulungGeplantStunden').text(formatHour(planedSchulung * anwesenheitPerDay));
    } else {
        $('.row.schulungGeplant').hide();
    }

    if (zaGanzTage > 0) {
        $('.row.zeitausgleich').show();
        $('#zaBisherTage').text(zaGanzTage);
        $('#zaBisherStunden').text(formatHour(zaGanzTage * anwesenheitPerDay));
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
    Cookies.set('planedHolidays', $('#planedHolidays').val());
    Cookies.set('planedSchulung', $('#planedSchulung').val());
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
    if (Cookies.get('planedHolidays')) {
        $('#planedHolidays').val(Cookies.get('planedHolidays'));
    }
    if (Cookies.get('planedSchulung')) {
        $('#planedSchulung').val(Cookies.get('planedSchulung'));
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
            // console.debug(prefix + " found: " + line);
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
            console.error(prefix + " found: " + line, sapCols);
            console.error(parseFloat(sapCols[7].replaceAll(',', '.')));
            result += parseFloat(sapCols[7].replaceAll(',', '.'));
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
        if (['Gebührenurlaub', 'Krankheit', 'Arztbesuch', 'Fortbildung_ext', 'ganztägiger_Zei', 'Erfaßte_Zeiten'].includes(sapCols[2])) {
            console.debug("Spezialtag found: " + line);
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
    let previousLineWasIncompleteLine = false;
    let lastIncompleteTime = 0;

    for (let idx = 0; idx < sapLines.length; ++idx) {
        const line = sapLines[idx];
        if (line.trim() == '') continue;
        const sapCols = line.split(' ');

        // Plausi-Check:
        if (sapCols[2].length != 2 || sapCols[3].length != 2) {
            if (sapCols.length == 4) { // Ungebuchte Tage
                continue;
            } else {
                console.error("Ignoring unknown line: " + line);
                showError("Ignoring unknown line: " + line + ' <a href="mailto:rene.huber@brz.gv.at?subject='
                + encodeURI('Zenacu-Feedback: Unknown Line in SAP found') + '&body=' + encodeURI(line) + '">Inform Developer</a>');
                continue;
            }
        }

        // Normales Booking von 1-Zeiler:
        let day = parseInt(sapCols[0]);
        let weekDay = sapCols[1];
        let time = parseNumber(sapCols[6]);
        if (time > 6 && time < 6.5) time = 6;
        if (time > 6.5) time -= 0.5;

        // console.log("Full line found: " + line);
        let booking = bookings[day] ;
        if (booking) {
            booking = bookings[day];
            booking.time += time;
        } else {
             booking = new Booking(day, weekDay, time);
        }
        bookings[day] = booking;
        previousLineWasIncompleteLine = false;



        // }
    }
    // console.log(bookings);
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

function outputDebug(sapLines) {
    let oDebug = $('#debug');
    let result = "";
    for (const line of sapLines) {
        result += line + "\n";
    }
    oDebug.val(result);
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

loadValuesFromCookie()
getHollidays();
watchInputs();

calc();
