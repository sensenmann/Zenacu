function calc() {
    let sapText = $('#sap-text').val();
    let sapLines = sapText.split("\n");


    let urlaubsTage = calcUrlaubsTage(sapLines);

    sapLines = removeNonsense(sapLines);

    let bookings = convertToBookings(sapLines);
    let timeAnwesend = calcAnwesenheit(bookings);

    // let workingDays = calcWorkingDays();
    let sollHoursPerWeek = $('#hoursPerWeek').val();
    // let sollHoursPerDay = sollHoursPerWeek / 5;
    let sollHoursPerMonth = Math.round(166.666666 / 38.5 * sollHoursPerWeek * 100) / 100;
    console.log('# Soll Anwesenheit / Monat: ' + sollHoursPerMonth + 'h');

    let anwesenheitPerDay = Math.round((sollHoursPerWeek / 5) * 0.4 * 100) / 100;
    console.log('# Soll Anwesenheit / Tag: ' + anwesenheitPerDay + 'h');


    let freeDays =  parseInt($('#freeDays').val());
    let planedHolidays = parseInt($('#planedHolidays').val());

    // let finalWorkingDays = workingDays - freeDays- planedHolidays - urlaubsTage;
    let sollAnwesenheitThisMonth = (sollHoursPerMonth * 0.4) -
        ((freeDays + urlaubsTage + planedHolidays) * anwesenheitPerDay);

    console.log('# Soll Anwesenheit (korrigiert): ' + sollAnwesenheitThisMonth + 'h');

    outputDebug(sapLines);

    // console.debug('# Arbeitstage: ' + workingDays);
    console.debug('# Urlaubstage bisher: ' + urlaubsTage);
    console.debug('# Urlaubstage geplant: ' + planedHolidays);
    // console.debug('# Arbeitstage relevant: ' + finalWorkingDays + 'd');
    // console.debug('# Arbeitszeit relevant: ' + (finalWorkingDays * sollHoursPerDay) + 'h');

    console.debug('# Anwesend IST:  ' + Math.round(timeAnwesend * 100) / 100 + 'h');

    console.debug('# Anwesend SOLL: ' + Math.round(sollAnwesenheitThisMonth * 100) / 100 + 'h');
    let anwesendDIFF = sollAnwesenheitThisMonth - timeAnwesend;
    console.debug('# Restzeit: ' + Math.round(anwesendDIFF * 100) / 100 + 'h');

    $('#sollAnwesenheit').text(sollHoursPerMonth);
    $('#urlaubeBisherTage').text(urlaubsTage);
    $('#urlaubeBisherStunden').text(urlaubsTage * anwesenheitPerDay);
    $('#urlaubeKuenftigTage').text(planedHolidays);
    $('#urlaubeKuenftigStunden').text(planedHolidays * anwesenheitPerDay);


}


function calcUrlaubsTage(sapLines) {
    let result = 0;
    for (const line of sapLines) {
        const sapCols = line.split(" ");
        if (sapCols[2] == 'Gebührenurlaub') {
            // console.debug("Urlaub found: " + line);
            result++;
        }
    }
    return result;
}

function removeNonsense(sapLines) {
    let result = [];
    for (let line of sapLines) {
        line = line.trim();
        const sapCols = line.split(' ');
        if (['Wochensumme'].includes(sapCols[0])) {
            // console.debug("Wochensumme found: " + line);
            continue;
        }
        if (['Sa', 'So'].includes(sapCols[1])) {
            // console.debug("Weekend found: " + line);
            continue;
        }
        if (sapCols[2] == 'Gebührenurlaub') {
            // console.debug("Gebührenurlaub found: " + line);
            continue;
        }
        if (sapCols[2] == 'Teleworking' || sapCols[0] == 'Teleworking' ) {
            // console.debug("Teleworking found: " + line);
            continue;
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
        // if (parseInt(sapCols[0]) >= 1 && parseInt(sapCols[0]) <= 31) {
        let isFullLine = (sapCols.length >= 9);
        let isFirstLineOfMultiple = (sapCols.length == 7);
        let isContinuedLine = (sapCols.length == 8);        // Folgezeilen, ohne Wochentage
        let isTeleworking = (sapCols[2] == 'Teleworking' || sapCols[0] == 'Teleworking');

        if (!isFullLine && !isFirstLineOfMultiple && !isContinuedLine) {
            console.error("Unknown line: " + line);
            continue;
        }

        // if (['Mo', 'Di', 'Mi', 'Do', 'Fr'].includes(sapCols[1])) {
            // console.log(line);
            // console.log(sapCols.length);

            if (isTeleworking) {
                console.log("Teleworking: " + line)
                if (!previousLineWasIncompleteLine) {
                    continue;
                } else {
                    let day = lastCompleteDay;
                    let time = lastIncompleteTime;
                    let weekDay = lastWeekDay;
                    let booking = new Booking(day, weekDay, time);
                    bookings[day] = booking;
                    previousLineWasIncompleteLine = false;
                    lastIncompleteTime = 0;
                }
            } else {
                if (isFullLine) {
                    // Normales Booking von 1-Zeiler:
                    let day = parseInt(sapCols[0]);
                    let time = parseNumber(sapCols[8]);
                    let weekDay = sapCols[1];
                    console.log("Full line found: " + line);
                    let booking = new Booking(day, weekDay, time);
                    bookings[day] = booking;
                    previousLineWasIncompleteLine = false;
                }

                if (isFirstLineOfMultiple) {
                    console.log("// First Line of Multiple found: " + line);
                    let day = parseInt(sapCols[0]);
                    lastCompleteDay = day;
                    lastWeekDay = sapCols[1];
                    previousLineWasIncompleteLine = true;
                    lastIncompleteTime = parseNumber(sapCols[6]);
                }

                if (isContinuedLine) {
                    // console.log("Booking found: " + line);
                    let day = lastCompleteDay;
                    let time = parseNumber(sapCols[6]);
                    let weekDay = lastWeekDay;
                    let booking = new Booking(day, weekDay, time);
                    bookings[day] = booking;
                    previousLineWasIncompleteLine = false;
                }
            }


        // }
    }
    console.log(bookings);
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

function outputDebug(sapLines) {
    let oDebug = $('#debug');
    let result = "";
    for (const line of sapLines) {
        result += line + "\n";
    }
    oDebug.val(result);
}

// function calcWorkingDays() {
    // let date = new Date();
    // let month = date.getMonth();    // beginnt bei 0
    // let year = date.getFullYear();
    //
    // let daysInMonth = getDaysInMonth(year, month);
    // console.debug("daysInMonth: " + daysInMonth);
    //
    // let workingDays = 0;
    // for (let day=1; day <= daysInMonth; day++) {
    //     let dt = new Date(year, month, day);
    //     if (dt.getDay() != 0 && dt.getDay() != 6) {
    //         workingDays++;
    //     }
    // }
    // return workingDays;
// }

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function parseNumber(val) {
    return parseFloat(val.replace(',', '.'));
}

calc();
