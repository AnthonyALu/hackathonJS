const TimeAgo = require('../../node_modules/javascript-time-ago');

// Load locale-specific relative date/time formatting rules.
const en = require('javascript-time-ago/locale/en');
TimeAgo.addLocale(en);

const timeAgo = new TimeAgo('en-US');

const config = {
  BubbleTemplate: (name, id, text, date, image) => {
    return `
      <div id="userImage" style="background-image: url(${image})"
      class="msg-img">
          </div>
              <div class="msg-bubble">
                  <div class="msg-info">
                      <div class="msg-info-name" id="name">${name}</div>
                      <div class="msg-info-time">${timeAgo.format(
                        date
                      )}</div>
                  </div>
                  <div class="msg-text">
                      ${text}
                  </div>
              </div>
      `;
  }
};

module.exports = config;