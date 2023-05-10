const {Sport, User} = require("./models");
const highestFinder = (value) => {
    let high = 0
    const values = Object.values(value)
    for (let i = 0; i < values.length; i++) {
        if (high < values[i]) {
            high = values[i]
        }
    }
    const index = Object.values(value).findIndex((num) => num === high)
    return (Object.keys(value)[index])
}

const monthString = (month) => {
    const monthConverter = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return (monthConverter[month])
}


const capitalizeString = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1)
}

const capitalizeName = (user) => {
    return capitalizeString(user.firstName) + " " + capitalizeString(user.lastName)
}

const sportName = (session) => {
    return Sport.getSport(session.sportId)
}

const userName = (session, isId = true,) => {
    if (isId) {
        return User.getUserDetailsById(session.userId)
    } else {
        return User.getUserDetailsByName(session)
    }
}

const sessionGenerator = async (sessions, hasMembersList = false, isId = true) => {
    if (sessions.length === undefined) {
        sessions = [sessions]
    }
    for (let i = 0; i < sessions.length; i++) {
        sessions[i].sport = await sportName(sessions[i])
        sessions[i].user = capitalizeName(await userName(sessions[i]))
        if (hasMembersList) {
            for (let j = 0; j < sessions[i].membersList.length; j++) {
                if (sessions[i].membersList[j].charAt(0) === `@`) {
                    sessions[i].membersList[j] = await userName(sessions[i].membersList[j].slice(1).toLowerCase(), isId)
                }
            }
        }
    }
    return sessions
}

const sportGenerator = async (sports) => {
    for (let i = 0; i < sports.length; i++) {
        sports[i].user = capitalizeName(await userName(sports[i]))
    }
    return sports
}


module.exports = {
    highestFinder,
    monthString,
    capitalizeString,
    capitalizeName,
    sessionGenerator,
    sportGenerator
}