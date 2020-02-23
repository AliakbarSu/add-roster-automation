if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const moment = require('moment-timezone')

function leadingZero(month) {
    if(month.toString().length == 1) {
        return "0" + month
    }else {
        return month.toString()
    }
}
  
function convertToHoursMinute(mins) {
    const sign = mins.toString()[0] = "-" ? "+" : "-"
    let minutes = 0;
    let hours = Math.abs(mins / 60).toFixed(2);
    if(!Number.isInteger(hours)) {
        minutes = ((hours.toString().split(".")[1] / 100) * 60).toFixed()
        hours = hours.toString().split(".")[0]
    }
    return `${sign}${leadingZero(hours)}:${leadingZero(minutes)}`
}

function addHours(startDate, startTime, endTime) {
    const startDateTime = `${startDate} ${startTime}`
    const endDateTime = `${startDate} ${endTime}`
    const startDateObj = moment(new Date(startDateTime))
    const endDateObj = moment(new Date(endDateTime))
    if(endDateObj.isBefore(startDateObj)) {
        endDateObj.add(1, 'd')
    }
    return endDateObj
}

function formatDate(date, time) {
    const dateTime = `${date} ${time}`
    const dateObj = new Date(dateTime)
   return dateObj.getUTCFullYear() + '-' + 
    leadingZero(dateObj.getMonth() + 1) + '-' + 
    leadingZero(dateObj.getDate()) + 'T' + 
    leadingZero(dateObj.getHours()) + ':' + 
    leadingZero(dateObj.getMinutes()) + ':' + 
    leadingZero(dateObj.getSeconds()) +
    convertToHoursMinute(dateObj.getTimezoneOffset())
}

module.exports = {
    addHours: addHours,
    formatDate: formatDate
}