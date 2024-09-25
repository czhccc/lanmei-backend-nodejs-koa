const cheerio = require('cheerio');

const richTextExtractImageSrc = (htmlContent) => {
  const $ = cheerio.load(htmlContent);
  const srcList = [];

  $('img').each((index, img) => {
    const src = $(img).attr('src');
    if (src) {
      srcList.push(src);
    }
  });

  return srcList;
};

module.exports = richTextExtractImageSrc
