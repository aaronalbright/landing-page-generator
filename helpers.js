const cheerio = require('cheerio');

function getHTML(html, cols) {
  const $ = cheerio.load(html);
  let head = $('head');
  let body = $('body');

  let data = {
    img: head
      .find('[name="twitter:image"]')
      .attr('content'),
    title: head
      .find('[property="og:title"]')
      .attr('content'),
    date: body
      .find('.published-date:first-of-type')
      .text()
      .trim(),
    section: cols.section,
    url: cols.url
  };

  if (cols.section.toUpperCase() == 'LEAD') {
    data.headline = cols.headline;
    data.intro = cols.intro;
  }

  if (cols.section.toUpperCase() == 'HERO') {
    data.hero = {};
    data.hero.preview = head
      .find('[name="description"]')
      .attr('content');

    let heroVideo = $('.lead-item > .video');

    if (heroVideo.length > 0) {
      data.hero.video = heroVideo.find('video[id*="player-"]').attr('data-url');
    }
  }

  return data;
}

module.exports = {
  getHTML
};
