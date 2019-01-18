require('dotenv').config();
let fs = require('fs');
let request = require('axios');
let { getHTML } = require('./helpers');
let node_ssh = require('node-ssh');

module.exports.scrape = () => {
  let sheetNum = 1;

  request(
    `https://spreadsheets.google.com/feeds/list/${
    process.env.SHEET
    }/${sheetNum}/public/full?alt=json`
  )
    .then(response => {
      let rows = response.data.feed;
      let cleanRows = rows.entry.map(i => ({
        section: i.gsx$section.$t,
        headline: i.gsx$headline.$t,
        url: i.gsx$url.$t,
        intro: i.gsx$intro.$t
      }));
      return cleanRows;
    })
    .then(data => {
      let metaData = data.map(i => {
        return request(i.url)
          .then(({ data }) => getHTML(data, i))
          .catch(err => console.log(err));
      });

      Promise.all(metaData).then(r => {
        if (r[0] !== undefined) {
          console.log('JSON file created');
        } else {
          throw new Error('Failed to create JSON file');
        }

        let sheetData = JSON.stringify(r);
        let ssh = new node_ssh();
        const hst = process.env.HOST;
        const user = process.env.USERNAME;
        const pwd = process.env.PASSWORD;

        ssh
          .connect({
            host: hst,
            username: user,
            port: 22,
            password: pwd,
            tryKeyboard: true,
            onKeyboardInteractive: (
              name,
              instructions,
              instructionsLang,
              prompts,
              finish
            ) => {
              if (
                prompts.length > 0 &&
                prompts[0].prompt.toLowerCase().includes('password')
              ) {
                finish([pwd]);
              }
            }
          })
          .then(function () {
            // Lambda doens't support "./" directory
            // Change './tmp' to '/tmp' before deploy
            let fileName = 'sc-urls.json';
            let tmpPath = `./tmp/${fileName}`;

            fs.writeFile(tmpPath, sheetData, err => {
              if (err) throw err;
              console.log('Writing file...');
              ssh
                .putFile(tmpPath, `${process.env.REMOTE_PATH}/${fileName}`)
                .then(() => {
                  console.log('File uploaded');
                  ssh.dispose();
                })
                .catch(err => console.log(err));
            });
          })
          .catch(err => console.log(err));
      });
    });
};
