let fs = require('fs');
let request = require('axios');
let { getHTML } = require('./helpers');
let node_ssh = require('node-ssh');
let KEY = require('./key');

module.exports.hello = () => {
  let id = KEY.ID;
  let sheet = 1;

  request(
    `https://spreadsheets.google.com/feeds/list/${id}/${sheet}/public/full?alt=json`
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

      let file;

      Promise.all(metaData).then(r => {
        if (r[0] !== undefined) console.log('JSON file created');
        else console.log('Failed to create JSON file');

        file = JSON.stringify(r);
      });

      let ssh = new node_ssh();

      ssh
        .connect({
          host: KEY.HOST,
          username: KEY.USER,
          port: 22,
          password: KEY.PASS,
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
              finish([KEY.PASS]);
            }
          }
        })
        .then(() => {
          // LAMBDA DOES NOT SUPPORT CURRENT DIRECTORY
          // Change './tmp' to '/tmp' in BOTH references.
          fs.writeFile('./tmp/data.json', file, err => {
            if (err) throw err;
            console.log('Writing file...');
            ssh
              .putFile('./tmp/data.json', KEY.PATH)
              .then(() => {
                console.log('File uploaded');
                ssh.dispose();
              })
              .catch(err => console.log(err));
          });
        })
        .catch(err => console.log(err));
    });
};
