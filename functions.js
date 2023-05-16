const { Sport, User } = require("./models");

const capitalizeString = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const capitalizeName = (user) => {
  return (
    capitalizeString(user.firstName) + " " + capitalizeString(user.lastName)
  );
};

const userName = (userId) => {
  return User.getUserDetailsById(userId);
};

const userEmail = (email) => {
  return User.getUserDetailsByEmail(email);
};

const sportName = (session) => {
  return Sport.getSport(session.sportId);
};

const sportSessions = (session) => {
  let sports = {};
  for (let i = 0; i < session.length; i++) {
    if (sports[session[i].sport] === undefined) {
      sports[session[i].sport] = 1;
    } else {
      sports[session[i].sport] += 1;
    }
  }
  return sports;
};

const sportGenerator = async (sports) => {
  for (let i = 0; i < sports.length; i++) {
    sports[i].user = capitalizeName(await userName(sports[i].userId));
  }
  return sports;
};

const sessionGenerator = async (
  sessions,
  hasMembers = false,
  hasJoined = false,
  id = null
) => {
  if (sessions.length === undefined) {
    sessions = [sessions];
  }
  for (let i = 0; i < sessions.length; i++) {
    sessions[i].sport = await sportName(sessions[i]);
    sessions[i].user = capitalizeName(await userName(sessions[i].userId));
    if (hasMembers) {
      for (let j = 0; j < sessions[i].membersList.length; j++) {
        if (sessions[i].membersList[j].includes("@")) {
          sessions[i].membersList[j] = await userEmail(
            sessions[i].membersList[j]
          );
          if (hasJoined && id === sessions[i].membersList[j].id) {
            sessions[i].joined = true;
          }
        }
      }
    }
  }
  return sessions;
};

module.exports = {
  capitalizeString,
  capitalizeName,
  sessionGenerator,
  sportGenerator,
  sportSessions,
};
